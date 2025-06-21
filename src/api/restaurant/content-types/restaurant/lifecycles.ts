// src/api/restaurant/content-types/restaurant/lifecycles.ts

import { errors } from '@strapi/utils';
const { ApplicationError } = errors;

/**
 * Verilen metni URL dostu bir slug'a çevirir.
 * Örnek: "Benim Şık Restoranım!" -> "benim-sik-restoranim"
 * @param {string} text 
 */
function slugify(text) {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
  const p = new RegExp(a.split('').join('|'), 'g')

  return text.toString().toLowerCase()
    .replace(/\s+/g, '-') // Boşlukları - ile değiştir
    .replace(p, c => b.charAt(a.indexOf(c))) // Özel karakterleri çevir
    .replace(/&/g, '-and-') // & karakterini '-and-' ile değiştir
    .replace(/[^\w\-]+/g, '') // Harf, sayı, - ve _ dışındaki her şeyi kaldır
    .replace(/\-\-+/g, '-') // Birden çok - karakterini tek - ile değiştir
    .replace(/^-+/, '') // Başlangıçtaki - karakterlerini kaldır
    .replace(/-+$/, '') // Sondaki - karakterlerini kaldır
}

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;
    const ownerRelation = data.owner;
    let userId;

    if (!data.plan || data.plan === 'free') {
      data.plan = 'free';
      data.subscription_status = 'active';
    }

    if (data.name && !data.slug) {
      let baseSlug = slugify(data.name);
      let newSlug = baseSlug;
      let counter = 1;
      while (
        await strapi.db.query('api::restaurant.restaurant').findOne({
          where: { slug: newSlug },
        })
      ) {
        counter++;
        newSlug = `${baseSlug}-${counter}`;
      }
      data.slug = newSlug;
    }

    if (data.name && !data.slug) {
      data.slug = await strapi.service('api::restaurant.restaurant').generateUID({
        field: 'slug',
        data: data,
      });
    }

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

    // Eğer oluşturulmak istenen restoran 'premium' ise, hiçbir kontrol yapma ve izin ver.
    if (data.plan === 'premium') {
      return;
    }

    // Eğer oluşturulmak istenen restoran 'free' ise (veya plan belirtilmemişse),
    // kullanıcının zaten bir 'free' restoranı var mı diye kontrol et.
    const freeRestaurantCount = await strapi.db.query('api::restaurant.restaurant').count({
      where: {
        owner: { id: { $eq: userId } },
        plan: { $eq: 'free' },
      },
    });
    // ÜCRETSİZ PLAN LOGIĞI
    if (freeRestaurantCount >= 1) {
      throw new ApplicationError('Ücretsiz planda sadece 1 restoran ekleyebilirsiniz.');
    }
  },
};