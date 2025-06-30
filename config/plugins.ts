// config/plugins.ts

export default ({ env }) => {
  // --- CLOUDINARY KULLANIMI ---
  // Eğer ortam değişkeni 'cloudinary' olarak ayarlanmışsa bu bloğu kullan
  if (env('STORAGE_PROVIDER') === 'cloudinary') {
    return {
      upload: {
        config: {
          provider: 'cloudinary',
          providerOptions: {
            cloud_name: env('CLOUDINARY_NAME'),
            api_key: env('CLOUDINARY_KEY'),
            api_secret: env('CLOUDINARY_SECRET'),
          },
          actionOptions: {
            upload: {},
            delete: {},
          },
        },
      },
    };
  }

  // --- VARSAYILAN (LOKAL) KULLANIM ---
  return {
    upload: {
      config: {
        provider: 'local',
        providerOptions: {},
        // Windows'taki EPERM hatasını çözmek ve tutarlılık için
        sizeOptimization: false,
        responsiveDimensions: false,
      },
    },
  };
};