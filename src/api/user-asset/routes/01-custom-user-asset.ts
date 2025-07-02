export default {
  routes: [
    {
      method: 'POST',
      path: '/user-assets/upload', // Rota yolunu daha anlamlı hale getirelim
      handler: 'user-asset.customUpload',
    },
    {
      method: 'GET',
      path: '/user-assets/my-files', // Rota yolunu daha anlamlı hale getirelim
      handler: 'user-asset.myFiles',
    },
    // Strapi'nin standart CRUD rotalarını da buraya ekleyebiliriz
  ],
};