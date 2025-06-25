// src/api/order/services/order.ts
'use strict';

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::order.order', ({ strapi }) => ({
  // DEĞİŞİKLİK: İçerideki "...factories.createCoreService" satırını SİLİYORUZ.
  // Strapi, varsayılan fonksiyonları (find, findOne vb.) zaten kendisi ekleyecektir.
  // Biz buraya sadece KENDİ ÖZEL fonksiyonlarımızı yazarız.

  /**
   * Bir siparişin toplam tutarını, içindeki kalemlere göre yeniden hesaplar ve günceller.
   * @param {number} orderId - Hesaplanacak siparişin ID'si.
   */
  async recalculateOrderTotal(orderId: number) {
    console.log(`Recalculating total for order #${orderId}`);
    
    // 1. İlgili siparişi ve içindeki tüm kalemleri (order_items) getir.
    const order = await strapi.entityService.findOne('api::order.order', orderId, {
      populate: {
        order_items: true,
      },
    });

    if (!order) {
      throw new Error(`Order with ID ${orderId} not found.`);
    }

    // 2. Tüm kalemlerin toplam fiyatını hesapla.
    // @ts-ignore - 'order_items' tipi dinamik populate nedeniyle tam anlaşılamayabilir, bu hatayı görmezden gel.
    console.log(order.order_items);
    // @ts-ignore - 'order_items' tipi dinamik populate nedeniyle tam anlaşılamayabilir, bu hatayı görmezden gel.
    const newTotalPrice = order.order_items.reduce((sum, item) => {
      return sum + (item.total_price || 0);
    }, 0);

    console.log(`New calculated total: ${newTotalPrice}`);

    // 3. Siparişin 'total_price' alanını bu yeni hesaplanan değerle güncelle.
    const updatedOrder = await strapi.entityService.update('api::order.order', orderId, {
      data: {
        total_price: newTotalPrice,
      },
      populate: ['order_items'] 
    });

    return updatedOrder;
  }
}));