'use strict';

import { factories } from '@strapi/strapi';
import { Context } from 'koa';

export default factories.createCoreController('api::product.product', ({ strapi }) => ({
  // Güvenli güncelleme için özel fonksiyonumuz
  async customUpdate(ctx: Context) {
    const { id: userId } = ctx.state.user;
    const { id: productId } = ctx.params;
    const { body } = ctx.request;

    try {
      // 1. Ürünü, db.query ve nokta notasyonlu populate ile çekiyoruz.
      // Bu, "ürünü, kategorisini, o kategorinin restoranını ve o restoranın sahibini getir" demektir.
      const productToUpdate = await strapi.db.query('api::product.product').findOne({
        where: { id: productId },
        populate: ['category.restaurant.owner'],
      });

      if (!productToUpdate) {
        return ctx.notFound('Ürün bulunamadı.');
      }

      // 2. Sahiplik kontrolü
      // @ts-ignore - Strapi'nin dinamik populate tipleriyle ilgili bir sorunu aşmak için.
      if (productToUpdate.category?.restaurant?.owner?.id !== userId) {
        return ctx.unauthorized('Bu ürünü düzenleme yetkiniz yok.');
      }

      // 3. Kontrol başarılı, entityService ile güncelleme işlemini yap
      const updatedEntry = await strapi.entityService.update('api::product.product', productId, {
        data: (body as any).data,
      });

      return this.transformResponse(updatedEntry);

    } catch (err) {
      console.error('product/customUpdate sırasında hata:', err);
      return ctx.internalServerError('Ürün güncellenirken bir hata oluştu.', { error: err });
    }
  },
  async safeDelete(ctx: Context) {
    const { id: userId } = ctx.state.user;
    const { id: productId } = ctx.params;

    try {
      // 1. Ürünü ve sahibine ulaşmak için tüm hiyerarşiyi getir
      const productToDelete = await strapi.db.query('api::product.product').findOne({
        where: { id: productId },
        populate: ['category.restaurant.owner'],
      });

      if (!productToDelete) {
        return ctx.notFound('Silinecek ürün bulunamadı.');
      }

      // 2. Sahiplik kontrolü
      // @ts-ignore - Dinamik populate tipi için
      if (productToDelete.category?.restaurant?.owner?.id !== userId) {
        return ctx.unauthorized('Bu ürünü silme yetkiniz yok.');
      }

      // 3. Kontrol başarılı, silme işlemini yap
      const deletedEntry = await strapi.entityService.delete('api::product.product', productId);

      return this.transformResponse(deletedEntry);

    } catch (err) {
      console.error('safeDelete sırasında hata:', err);
      return ctx.internalServerError('Ürün silinirken bir hata oluştu.', { error: err });
    }
  },
  async batchUpdateOrder(ctx: Context) {
    const { products } = ctx.request.body as { products: { id: number; display_order: number }[] };

    if (!products || !Array.isArray(products)) {
      return ctx.badRequest('"products" bir dizi (array) olmalıdır.');
    }

    try {
      await Promise.all(
        products.map(product =>
          strapi.entityService.update('api::product.product', product.id, {
            data: {
              display_order: product.display_order,
            },
          })
        )
      );
      return ctx.send({ message: 'Ürün sıralaması başarıyla güncellendi.' });
    } catch (err) {
      return ctx.internalServerError('Sıralama güncellenirken bir hata oluştu.', { error: err });
    }
  },
}));