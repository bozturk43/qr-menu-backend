/**
 * category controller
 */

import { factories } from '@strapi/strapi';
import { Context } from 'koa'; // Koa'dan Context tipini import ediyoruz

export default factories.createCoreController('api::category.category', ({ strapi }) => ({
  // Bu yapı, mevcut tüm varsayılan controller fonksiyonlarının (find, findOne, create vb.)
  // çalışmaya devam etmesini sağlar ve biz sadece yenisini ekleriz.

  /**
   * Kategorilerin sıralamasını toplu olarak güncelleyen özel bir action.
   * @param ctx - Koa Context objesi. İstek (request) ve yanıt (response) bilgilerini içerir.
   */
  async batchUpdateOrder(ctx: Context) {
    // Frontend'den gönderilen { categories: [...] } verisini alıyoruz.
    const { categories } = ctx.request.body as { categories: { id: number; display_order: number }[] };

    // Gelen verinin bir dizi olup olmadığını kontrol ediyoruz.
    if (!categories || !Array.isArray(categories)) {
      return ctx.badRequest('"categories" bir dizi (array) olmalıdır.');
    }

    try {
      // Gelen dizideki her bir kategori için veritabanında güncelleme işlemi yapıyoruz.
      // Promise.all, tüm güncellemelerin aynı anda başlamasını ve bitmesini beklemesini sağlar.
      await Promise.all(
        categories.map(category =>
          strapi.entityService.update('api::category.category', category.id, {
            data: {
              display_order: category.display_order,
            },
          })
        )
      );

      // Başarılı olursa, frontend'e bir başarı mesajı gönderiyoruz.
      return ctx.send({ message: 'Sıralama başarıyla güncellendi.' });

    } catch (err) {
      // Herhangi bir hata olursa, sunucu hatası olarak yanıt veriyoruz.
      return ctx.internalServerError('Sıralama güncellenirken bir hata oluştu.', { error: err });
    }
  },
  async customUpdate(ctx: Context) {
    const { id: userId } = ctx.state.user;
    const { id: categoryId } = ctx.params;
    const { body } = ctx.request;

    try {
      // Adım 1: Yeni yöntemi kullanarak kategoriyi ve restoranını çek.
      const category = await strapi.db.query('api::category.category').findOne({
        where: { id: categoryId },
        populate: { restaurant: true },
      });

      if (!category || !category.restaurant) {
        return ctx.notFound('Kategori veya bağlı olduğu restoran bulunamadı.');
      }

      const restaurantId = category.restaurant.id;

      // Adım 2: Yeni yöntemi kullanarak restoranı ve sahibini çek.
      const restaurant = await strapi.db.query('api::restaurant.restaurant').findOne({
        where: { id: restaurantId },
        populate: { owner: true },
      });

      if (!restaurant) {
        return ctx.notFound('İlişkili restoran kaydı bulunamadı.');
      }

      // Adım 3: Sahiplik kontrolünü yap.
      if (restaurant.owner?.id !== userId) {
        return ctx.unauthorized('Bu kategoriyi düzenleme yetkiniz yok.');
      }

      // Adım 4: Güncelleme işlemini yap (entityService burada hala en doğru yöntemdir).
      const updatedEntry = await strapi.entityService.update('api::category.category', categoryId, {
        data: (body as any).data,
      });

      return this.transformResponse(updatedEntry);

    } catch (err) {
      console.error('customUpdate sırasında hata:', err)
      return ctx.internalServerError('Kategori güncellenirken bir hata oluştu.', { error: err });
    }
  },
  async safeDelete(ctx: Context) {
    const { id: userId } = ctx.state.user; // İstek yapan kullanıcının ID'si
    const { id: categoryId } = ctx.params; // URL'den gelen kategori ID'si

    try {
      // 1. Önce silinmek istenen kategoriyi, restoranını ve o restoranın sahibini getir
      const categoryToDelete = await strapi.db.query('api::category.category').findOne({
        where: { id: categoryId },
        populate: { restaurant: { populate: ['owner'] } },
      });

      if (!categoryToDelete) {
        return ctx.notFound('Silinecek kategori bulunamadı.');
      }

      // 2. Sahiplik kontrolü yap: Bu kategorinin restoranının sahibi, isteği yapan kullanıcı mı?
      if (categoryToDelete.restaurant?.owner?.id !== userId) {
        return ctx.unauthorized('Bu kategoriyi silme yetkiniz yok.');
      }

      // 3. Ürün kontrolü yap: Bu kategoriye bağlı ürün var mı?
      const productCount = await strapi.db.query('api::product.product').count({
        where: { category: { id: categoryId } },
      });

      if (productCount > 0) {
        // Eğer ürün varsa, hata döndür ve işlemi durdur.
        return ctx.badRequest(`Bu kategori silinemez çünkü içinde ${productCount} adet ürün bulunmaktadır.`);
      }

      // 4. Tüm kontrollerden geçtiyse, silme işlemini yap.
      const deletedEntry = await strapi.entityService.delete('api::category.category', categoryId);

      // 5. Silinen veriyi (veya bir başarı mesajını) geri döndür.
      return this.transformResponse(deletedEntry);

    } catch (err) {
      console.error('safeDelete sırasında hata:', err);
      return ctx.internalServerError('Kategori silinirken bir hata oluştu.', { error: err });
    }
  },
}));