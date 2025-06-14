// src/api/category/content-types/category/lifecycles.ts

import { errors } from '@strapi/utils';

const { ApplicationError } = errors;

interface RestaurantWithPlan {
  id: number | string; // Değişiklik burada
  plan?: 'free' | 'premium' | null; // '?' ekleyerek alanı isteğe bağlı yapıyoruz.
}

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;

    if (!data.restaurant || !('connect' in data.restaurant) || data.restaurant.connect.length === 0) {
      return;
    }

    const restaurantId = data.restaurant.connect[0].id;

    const restaurant: RestaurantWithPlan | null = await strapi.entityService.findOne(
      'api::restaurant.restaurant', 
      restaurantId
    );

    if (restaurant && restaurant.plan === 'free') {
      const count = await strapi.db.query('api::category.category').count({
        where: { restaurant: restaurantId },
      });
      
      if (count >= 5) {
        throw new ApplicationError('Ücretsiz planda en fazla 5 kategori ekleyebilirsiniz. Lütfen planınızı yükseltin.', {
          type: 'plan_limit_exceeded',
        });
      }
    }
  },
};