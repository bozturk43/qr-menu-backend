// src/api/category/content-types/category/lifecycles.ts

import { errors } from '@strapi/utils';
const { ApplicationError } = errors;
export default {
  async beforeCreate(event: any) {
    const { data } = event.params;
    let restaurantId: number | null = null;
    // Gelen veri formatı: { set: [{ id: 2 }] }
    if (data.restaurant?.set?.length > 0) {
      restaurantId = data.restaurant.set[0].id;
    }
    // Eğer ileride connect de desteklenirse
    else if (data.restaurant?.connect?.length > 0) {
      restaurantId = data.restaurant.connect[0].id;
    }

    if (!restaurantId) {
      return;
    }
    // findOne fonksiyonuna 'fields' parametresini ekleyerek 'plan' alanını
    // getirmesini AÇIKÇA söylüyoruz.
    const restaurant = await strapi.entityService.findOne(
      'api::restaurant.restaurant',
      restaurantId,
      {
        fields: ['plan'], // <-- DÜZELTME 1: İSTEDİĞİMİZ ALANI BELİRTİYORUZ
      }
    );
    if (restaurant && restaurant.plan === 'free') {
      const count = await strapi.db.query('api::category.category').count({
        // DÜZELTME 2: 'where' koşulunu en sağlam haliyle yazıyoruz.
        where: {
          restaurant: {
            id: {
              $eq: restaurantId,
            },
          },
        },
      });
      if (count >= 5) {
        throw new ApplicationError('Ücretsiz planda en fazla 5 kategori ekleyebilirsiniz. Lütfen planınızı yükseltin.', {
          type: 'plan_limit_exceeded',
        });
      }
    }
  }
}