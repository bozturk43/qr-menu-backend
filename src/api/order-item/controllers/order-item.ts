// src/api/order-item/controllers/order-item.ts
'use strict';
import { factories } from '@strapi/strapi';
import { Context } from 'koa';

export default factories.createCoreController('api::order-item.order-item', ({ strapi }) => ({
  async safeDelete(ctx: Context) {
    const { id: userId } = ctx.state.user;
    const { id: orderItemId } = ctx.params;

    try {
      // 1. Önce silinmek istenen sipariş kalemini ve sahibini doğrulamak için tüm hiyerarşiyi getir
      const itemToDelete = await strapi.db.query('api::order-item.order-item').findOne({
        where: { id: orderItemId },
        populate: { order: { populate: { restaurant: { populate: ['owner'] } } } },
      });

      if (!itemToDelete) return ctx.notFound('Sipariş kalemi bulunamadı.');

      console.log(itemToDelete);
      
      // 2. Sahiplik kontrolü yap
      // @ts-ignore
      if (itemToDelete.order?.restaurant?.owner?.id !== userId) {
        return ctx.unauthorized('Bu işlemi yapmaya yetkiniz yok.');
      }
      
      const parentOrderId = itemToDelete.order.id;

      // 3. Sipariş kalemini sil
      const deletedEntry = await strapi.entityService.delete('api::order-item.order-item', orderItemId);

      // 4. Ana siparişin toplam tutarını yeniden hesapla
      await strapi.service('api::order.order').recalculateOrderTotal(parentOrderId);

      return this.transformResponse(deletedEntry);
    } catch (err) {
      console.error('safeDelete (order-item) sırasında hata:', err);
      return ctx.internalServerError('Sipariş kalemi silinirken bir hata oluştu.');
    }
  },
}));