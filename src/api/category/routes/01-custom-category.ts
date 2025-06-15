// src/api/category/routes/01-custom-category.ts 

export default {
  routes: [
    {
      method: 'PUT',
      path: '/categories/batch-update-order',
      handler: 'category.batchUpdateOrder',
    },
    {
      method: 'PUT',
      path: '/categories/:id/custom-update',
      handler: 'category.customUpdate',
    },
    {
      method: 'DELETE',
      path: '/categories/:id/safe-delete',
      handler: 'category.safeDelete',
    }
  ]
}