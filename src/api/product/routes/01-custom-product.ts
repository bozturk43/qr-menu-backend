// src/api/product/routes/product.ts

export default {
  routes: [
    // Kendi özel update rotamız
    {
      method: 'PUT',
      path: '/products/:id/custom-update',
      handler: 'product.customUpdate',
    },
    {
      method: 'DELETE',
      path: '/products/:id/safe-delete',
      handler: 'product.safeDelete',
    },
  ],
};