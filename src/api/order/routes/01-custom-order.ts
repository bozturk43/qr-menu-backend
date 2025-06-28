// src/api/restaurant/routes/restaurant.ts
export default {
  routes: [
    {
      method: 'POST',
      path: '/orders/submit',
      handler: 'order.submit',
      config:{
        auth:false
      }
    },
     {
      method: 'GET',
      path: '/orders/open-for-restaurant/:restaurantId', // Restoran ID'sini parametre olarak alacak
      handler: 'order.findOpenByRestaurant', // Çalıştıracağı yeni fonksiyon
    },
    {
      method: 'POST',
      path: '/orders/:orderId/add-items',
      handler: 'order.addItems',
    },
    {
      method: 'PUT',
      path: '/orders/:orderId/pay-items',
      handler: 'order.payItems',
    },
    {
      method: 'PUT',
      path: '/orders/:orderId/close',
      handler: 'order.closeOrder',
    },
  ],
};