// config/middlewares.ts

export default [
  'strapi::logger',
  'strapi::errors',
  // 'strapi::security' string'ini aşağıdaki obje ile değiştiriyoruz
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true, // Varsayılan politikaları koru
        directives: {
          'connect-src': ["'self'", 'https'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            // YENİ EKLENEN KURAL: Cloudinary'nin domain'ini güvenli kaynak olarak ekliyoruz
            'res.cloudinary.com', 
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            // YENİ EKLENEN KURAL: Medya dosyaları için de ekliyoruz
            'res.cloudinary.com',
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];