// src/api/restaurant/routes/restaurant.ts
export default {
  routes: [
    {
      method: 'PUT',
      path: '/restaurants/:id/custom-update',
      handler: 'restaurant.customUpdate',
    },
  ],
};