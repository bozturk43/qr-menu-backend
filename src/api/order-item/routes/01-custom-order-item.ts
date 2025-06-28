// src/api/restaurant/routes/restaurant.ts
export default {
  routes: [
    {
      method: 'DELETE',
      path: '/order-items/:id/safe-delete', // Güvenli silme için özel rotamız
      handler: 'order-item.safeDelete',    // Çalıştıracağı controller fonksiyonu
      
    },
  ],
};