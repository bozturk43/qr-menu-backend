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
            console.log("masa tanımlayıcı", tableIdentifier);
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
    },
    async findOpenByRestaurant(ctx: Context) {
        const { id: userId } = ctx.state.user; // İstek yapan kullanıcının ID'si
        const { restaurantId } = ctx.params; // URL'den gelen restoran ID'si

        try {
            // 1. Önce, kullanıcının bu restorana erişim yetkisi var mı diye kontrol et
            const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', restaurantId, {
                populate: ['owner'],
            });

            if (!restaurant) {
                return ctx.notFound('Restoran bulunamadı.');
            }
            // @ts-ignore
            if (restaurant.owner?.id !== userId) {
                return ctx.unauthorized('Bu restoranın siparişlerini görmeye yetkiniz yok.');
            }

            // 2. Yetki kontrolü başarılıysa, o restorana ait açık siparişleri getir
            const openOrders = await strapi.db.query('api::order.order').findMany({
                where: {
                    restaurant: { id: { $eq: restaurantId } },
                    order_status: { $eq: 'open' },
                },
                populate: {
                    restaurant: true,
                    table: true, // Her siparişin masa bilgisini getir
                    order_items: { // Her siparişin kalemlerini getir
                        populate: {
                            product: true, // Her kalemin ürün bilgisini de getir (opsiyonel)
                            selected_variations: true
                        }
                    },
                },
                orderBy: { createdAt: 'desc' }, // En yeni siparişler en üstte olsun
            });

            // 3. Veriyi frontend'e gönder
            return this.transformResponse(openOrders);

        } catch (err) {
            console.error('Error in findOpenByRestaurant:', err);
            return ctx.internalServerError('Açık siparişler getirilirken bir hata oluştu.');
        }
    },
    async addItems(ctx: Context) {
        const { id: userId } = ctx.state.user;
        const { orderId } = ctx.params;
        // Frontend'den sadece eklenecek ürün kalemlerinin bir dizisini bekliyoruz
        const { items } = ctx.request.body as { items: any[] };

        try {
            // 1. Önce, siparişin sahibini doğrula
            const orderToUpdate = await strapi.db.query('api::order.order').findOne({
                where: { id: orderId },
                populate: { restaurant: { populate: ['owner'] } },
            });

            if (!orderToUpdate) return ctx.notFound('Sipariş bulunamadı.');
            // @ts-ignore
            if (orderToUpdate.restaurant?.owner?.id !== userId) return ctx.unauthorized('Bu siparişe ürün ekleme yetkiniz yok.');

            // 2. Gelen her bir yeni ürün kalemi için veritabanında kayıt oluştur
            await Promise.all(
                items.map(item =>
                    strapi.entityService.create('api::order-item.order-item', {
                        data: {
                            product_name: item.productName,
                            quantity: item.quantity,
                            total_price: item.totalPrice,
                            selected_variations: item.variations,
                            order: orderId, // Ana siparişe bağlıyoruz
                            product: item.productId,
                            is_printed: false,
                        },
                    })
                )
            );

            // 3. Ana siparişin toplam tutarını yeniden hesaplat
            const finalOrder = await strapi.service('api::order.order').recalculateAndApplyDiscounts(orderId);

            // TODO: WebSocket ile 'order_updated' olayı yayınla

            return this.transformResponse(finalOrder);

        } catch (err) {
            console.error('addItems sırasında hata:', err);
            return ctx.internalServerError('Siparişe ürün eklenirken bir hata oluştu.');
        }
    },
    async payItems(ctx: Context) {
        const { orderId } = ctx.params;
        const { itemIds, paymentMethod } = ctx.request.body as { itemIds: number[], paymentMethod: 'cash' | 'card' | 'order' };

        // TODO: Sahiplik kontrolü eklenebilir

        try {
            // Gelen ID listesindeki tüm order-item'ların durumunu 'paid' yap
            await strapi.db.query('api::order-item.order-item').updateMany({
                where: { id: { $in: itemIds } },
                data: { order_item_status: 'paid', payment_method: paymentMethod },
            });

            const updatedOrder = await strapi.entityService.findOne('api::order.order', orderId, { populate: { order_items: true, table: true } });
            return this.transformResponse(updatedOrder);

        } catch (err) {
            console.error('payItems sırasında hata:', err);
            return ctx.internalServerError('Adisyon kalemi ödeme sırasında hata oluştu !');
        }
    },
    async closeOrder(ctx: Context) {
        const { id: userId } = ctx.state.user;
        const { orderId } = ctx.params;
        const { paymentMethod } = ctx.request.body as { paymentMethod: 'cash' | 'card' | 'other' };

        console.log(paymentMethod);
        try {
            // Sahiplik kontrolü
            const orderToClose = await strapi.db.query('api::order.order').findOne({
                where: { id: orderId },
                populate: { restaurant: { populate: ['owner'] } },
            });

            if (!orderToClose) {
                return ctx.notFound('Kapatılacak sipariş bulunamadı.');
            }
            // @ts-ignore
            if (orderToClose.restaurant?.owner?.id !== userId) {
                return ctx.unauthorized('Bu siparişi kapatma yetkiniz yok.');
            }

            // --- YENİ MANTIK ---

            // 1. Önce bu siparişe ait, durumu 'open' olan tüm kalemleri bul.
            const itemsToPay = await strapi.db.query('api::order-item.order-item').findMany({
                where: {
                    order: { id: { $eq: orderId } },
                    order_item_status: { $eq: 'open' }
                }
            });

            // 2. Bulunan her bir kalemi, bir döngü içinde tek tek 'paid' olarak güncelle.
            if (itemsToPay && itemsToPay.length > 0) {
                await Promise.all(
                    itemsToPay.map(item => strapi.entityService.update(
                        'api::order-item.order-item',
                        item.id,
                        { data: { order_item_status: 'paid', payment_method: paymentMethod } }
                    ))
                );
            }

            // 3. Şimdi ana siparişin durumunu 'paid' olarak güncelle.
            const closedOrder = await strapi.entityService.update('api::order.order', orderId, {
                data: {
                    order_status: 'paid',
                },
            });

            return ctx.send({ message: 'Adisyon başarıyla kapatıldı.', data: closedOrder });

        } catch (err) {
            console.error('closeOrder sırasında hata:', err);
            return ctx.internalServerError('Adisyon kapatılırken bir hata oluştu.');
        }
    },
    async applyDiscount(ctx: Context) {
        const { orderId } = ctx.params;
        const { discount_type, discount_value } = ctx.request.body as { discount_type: "percentage" | "fixed_amount", discount_value: number };
        // TODO: Sahiplik kontrolü eklenebilir

        try {
            // 1. Ana siparişe indirim bilgilerini kaydet
            await strapi.entityService.update('api::order.order', orderId, {
                data: {
                    discount_type: discount_type,
                    discount_value: discount_value,
                },
            });

            // 2. Merkezi hesaplama servisini çağırarak tüm fiyatları güncelle
            const finalOrder = await strapi.service('api::order.order').recalculateAndApplyDiscounts(orderId);

            return this.transformResponse(finalOrder);

        } catch (err) {
            console.error('applyDiscount sırasında hata:', err);
            return ctx.internalServerError('İndirim uygulanırken bir hata oluştu.');
        }
    },
}));
