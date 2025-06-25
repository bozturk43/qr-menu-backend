/**
 * order controller
 */

import { factories } from '@strapi/strapi'
import { Context } from 'koa';

// Sipariş payload'ının tip tanımı
interface SubmitOrderPayload {
    tableIdentifier: string;
    items: {
        productId: number;
        productName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        variations: string; // Basit bir metin olarak birleştirilmiş varyasyonlar
    }[];
    totalPrice: number;
    notes?: string;
}

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
    async submit(ctx: Context) {
        const { tableIdentifier, items, totalPrice, notes } = ctx.request.body as SubmitOrderPayload;

        try {
            console.log("masa tanımlayıcı",tableIdentifier);
            // 1. Bu masaya ait, hala 'open' (açık) bir sipariş var mı diye kontrol et
            const table = await strapi.db.query('api::table.table').findOne({
                where: { qr_code_identifier: tableIdentifier },
                populate: ['restaurant'],
            });
            if (!table) {
                return ctx.badRequest('Geçersiz masa kimliği.');
            }

            const tableId = table.id;
            const restaurantId = table.restaurant.id;

            const existingOrder = await strapi.db.query('api::order.order').findOne({
                where: {
                    table: { id: { $eq: tableId } },
                    order_status: { $eq: 'open' },
                },
            });

            let orderId;
            let existingOrderItemsPrice = 0;


            if (existingOrder) {
                orderId = existingOrder.id;
                existingOrderItemsPrice = existingOrder.total_price || 0;

            } else {
                // 2b. Eğer yoksa, yeni bir sipariş oluştur
                const newOrder = await strapi.entityService.create('api::order.order', {
                    data: {
                        table: tableId,
                        restaurant: restaurantId, // Siparişin hangi restorana ait olduğunu da kaydediyoruz
                        total_price: 0, // Toplam fiyatı kalemler eklendikten sonra güncelleyeceğiz
                        status: 'open',
                        notes: notes,
                    },
                });
                orderId = newOrder.id;
            }

            // 3. Gelen her bir ürün için OrderItem oluştur ve mevcut siparişe bağla
            await Promise.all(
                items.map(item =>
                    strapi.entityService.create('api::order-item.order-item', {
                        data: {
                            product_name: item.productName,
                            quantity: item.quantity,
                            total_price: item.totalPrice,
                            selected_variations_summary: item.variations,
                            order: orderId,
                            product: item.productId,
                            is_printed: false, // Henüz yazdırılmadı
                        },
                    })
                )
            );

            // 4. Siparişin toplam tutarını yeniden hesapla ve güncelle (opsiyonel ama önerilir)
            const finalOrder = await strapi.service('api::order.order').recalculateOrderTotal(orderId);

            // TODO: FAZ 3 - WebSocket ile 'yeni_siparis' olayını yayınla
            // strapi.io.to(`restaurant_room_${finalOrder.restaurant.id}`).emit('new_order', finalOrder);

            return ctx.send({ message: 'Sipariş başarıyla alındı.', order: finalOrder });

        } catch (err) {
            console.error('Order submission error:', err);
            return ctx.internalServerError('Sipariş oluşturulurken bir hata oluştu.');
        }
    }
}));
