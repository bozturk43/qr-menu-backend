// src/api/restaurant/controllers/restaurant.ts
'use strict';

import { factories } from '@strapi/strapi';
import { Context } from 'koa';

export default factories.createCoreController('api::restaurant.restaurant', ({ strapi }) => ({
  // GÜVENLİ GÜNCELLEME İÇİN ÖZEL FONKSİYONUMUZ:
  async customUpdate(ctx: Context) {
    const { id: userId } = ctx.state.user;
    const { id: restaurantId } = ctx.params;
    const { body } = ctx.request;

    try {
      // 1. Önce güncellenmek istenen restoranı, sahibini de getirerek bul
      const entry = await strapi.db.query('api::restaurant.restaurant').findOne({
        where: { id: restaurantId },
        populate: ['owner'],
      });

      if (!entry) {
        return ctx.notFound('Restoran bulunamadı.');
      }

      // 2. MANUEL SAHİPLİK KONTROLÜ
      if (entry.owner?.id !== userId) {
        return ctx.unauthorized('Bu restoranı düzenleme yetkiniz yok.');
      }

      // 3. Tüm kontrollerden geçtiyse, güncelleme işlemini yap
      const updatedEntry = await strapi.entityService.update('api::restaurant.restaurant', restaurantId, {
        data: (body as any).data,
      });

      return updatedEntry;

    } catch (err) {
      console.error('restaurant/customUpdate sırasında hata:', err);
      return ctx.internalServerError('Restoran güncellenirken bir hata oluştu.', { error: err });
    }
  },
}));