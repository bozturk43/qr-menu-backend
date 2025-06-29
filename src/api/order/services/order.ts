// src/api/order/services/order.ts
'use strict';

import { factories } from '@strapi/strapi';


type OrderItem = {
  id: number;
  total_price: number;
};

type PopulatedOrder = {
  id: number;
  order_items: OrderItem[];
};

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
    // const order = await strapi.entityService.findOne('api::order.order', orderId, {
    //   populate: {
    //     order_items: true,
    //   },
    // });

    const order = await strapi.db.query('api::order.order').findOne({
      where:{id:orderId},
      populate:{order_items:true}
    })

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
  },
  /**
   * Bir siparişin indirimlerini, kalem bazında fiyatlarını ve genel toplamını
   * en baştan, doğru bir şekilde hesaplar ve günceller.
   * @param {number} orderId - Hesaplanacak siparişin ID'si.
   */
  async recalculateAndApplyDiscounts(orderId: number) {
    console.log(`Recalculating discounts and totals for order #${orderId}`);
    
    // 1. Siparişi ve tüm kalemlerini veritabanından çek.
    // 'db.query' kullanarak hem 'deprecated' uyarısından kurtuluyor hem de daha stabil bir sorgu yapıyoruz.
    const order = await strapi.db.query('api::order.order').findOne({
        where: { id: orderId },
        populate: { order_items: true },
    }) as PopulatedOrder;

    if (!order || !order.order_items) {
      throw new Error(`Order with ID ${orderId} not found or has no items.`);
    }

    // 2. İndirim öncesi ara toplamı hesapla
    const subTotal = order.order_items.reduce((sum, item) => {
        // Her kalemin orijinal, indirimsiz fiyatını topluyoruz
        return sum + (item.total_price || 0);
    }, 0);

    // 3. İNDİRİM BİLGİSİNİ DOĞRUDAN ORDER OBJESİNDEN ALIYORUZ
    let totalDiscountAmount = 0;
    // @ts-ignore - 'discount_type' ve 'discount_value' tipleri Strapi tarafından dinamik eklendiği için
    if (order.discount_type === 'percentage' && order.discount_value > 0) {
      // @ts-ignore
      totalDiscountAmount = subTotal * (order.discount_value / 100);
    // @ts-ignore
    } else if (order.discount_type === 'fixed_amount' && order.discount_value > 0) {
      // @ts-ignore
      totalDiscountAmount = order.discount_value;
    }

    // 4. Her bir sipariş kalemini, orantısal indirimini hesaplayarak güncelle
    await Promise.all(
      order.order_items.map(item => {
        const itemOriginalPrice = item.total_price || 0;
        
        // Bu kalemin toplamdaki payı oranında indirimden ne kadar alacağını hesapla
        const proportionalDiscount = subTotal > 0 ? (itemOriginalPrice / subTotal) * totalDiscountAmount : 0;
        const discountedPrice = itemOriginalPrice - proportionalDiscount;

        // Bu kalemi veritabanında yeni indirimli fiyatıyla güncelle
        return strapi.entityService.update('api::order-item.order-item', item.id, {
          data: {
            discounted_price: discountedPrice,
          },
        });
      })
    );
    
    // 5. Siparişin nihai toplam tutarını, indirim düşülmüş haliyle güncelle
    const finalTotalPrice = subTotal - totalDiscountAmount;
    const updatedOrder = await strapi.entityService.update('api::order.order', orderId, {
      data: {
        total_price: finalTotalPrice,
      },
      populate: { order_items: true, table: true }
    });

    return updatedOrder;
  }

   
}));