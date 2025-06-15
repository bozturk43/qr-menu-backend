// src/api/restaurant/content-types/restaurant/lifecycles.ts

import { errors } from '@strapi/utils';
const { ApplicationError } = errors;

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;
    const ownerRelation = data.owner;
    let userId;

    // YENİ VE AKILLI KONTROL:
    // Önce 'connect' operatörü var mı diye bakıyoruz.
    if (ownerRelation && ownerRelation.connect && ownerRelation.connect.length > 0) {
      userId = ownerRelation.connect[0].id;
    }
    // Eğer 'connect' yoksa, 'set' operatörü var mı diye bakıyoruz.
    else if (ownerRelation && ownerRelation.set && ownerRelation.set.length > 0) {
      // 'set' dizisinin içindeki değer bazen direkt ID, bazen {id: X} olabilir.
      // Bu kod her iki durumu da ele alır.
      const ownerInfo = ownerRelation.set[0];
      userId = typeof ownerInfo === 'object' && ownerInfo.id ? ownerInfo.id : ownerInfo;
    }

    // Eğer tüm kontrollere rağmen bir userId bulamadıysak, hata fırlat.
    if (!userId) {
      throw new ApplicationError('Restoran bir kullanıcıya ait olmalıdır.');
    }

    // Artık userId'nin doğru alındığından eminiz, sorgumuza devam edebiliriz.
    const count = await strapi.db.query('api::restaurant.restaurant').count({
      where: {
        owner: {
          id: {
            $eq: userId,
          },
        },
         publishedAt: {
          $notNull: true,
        },
      },
    });
    // ÜCRETSİZ PLAN LOGIĞI
    if (count >= 1) {
      throw new ApplicationError('Ücretsiz planda sadece 1 restoran ekleyebilirsiniz.');
    }
  },
};