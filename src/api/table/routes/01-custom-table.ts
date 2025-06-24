// src/api/restaurant/routes/restaurant.ts
export default {
  routes: [
    {
      method: 'PUT',
      path: '/tables/:id/custom-update',
      handler: 'table.customUpdate',
    },
    {
      method: 'DELETE',
      path: '/tables/:id/safe-delete',
      handler: 'table.safeDelete',
    },

  ],
};