// src/api/user-asset/controllers/user-asset.ts
'use strict';

import { factories } from '@strapi/strapi';
import { Context } from 'koa';

export default factories.createCoreController('api::user-asset.user-asset', ({ strapi }) => ({
    // Strapi'nin varsayılan controller fonksiyonlarını korumak için bu satırı ekliyoruz.
    /**
     * Sadece giriş yapmış olan kullanıcıya ait medya dosyalarını getirir.
     * Bu fonksiyon, frontend'deki "Galerim" sekmesini doldurur.
     */
    async myFiles(ctx: Context) {
        try {
            // 1. İstek yapan, giriş yapmış kullanıcının ID'sini al.
            const { id: userId } = ctx.state.user;

            // 2. Bu kullanıcıya ait olan 'UserAsset' kaydını bul.
            const userAsset = await strapi.db.query('api::user-asset.user-asset').findOne({
                where: {
                    // DEĞİŞİKLİK: 'owner' yerine doğru alan adını kullanıyoruz
                    users_permissions_user: {
                        id: {
                            $eq: userId,
                        },
                    },
                },
                populate: { images: true }, // İçindeki tüm resimleri de populate et
            });

            // 3. Eğer bir kayıt veya içinde resim yoksa, boş bir dizi döndür.
            if (!userAsset || !userAsset.images) {
                return [];
            }

            // 4. Frontend'e sadece resim objelerinden oluşan diziyi gönder.
            return userAsset.images;
        } catch (error) {
            console.error('myFiles sırasında hata:', error);
            return ctx.internalServerError("Dosyalarınız alınırken bir hata oluştu.");
        }
    },

    /**
     * Yeni bir dosya yükler ve bu dosyayı giriş yapmış olan kullanıcının
     * 'UserAsset' kaydındaki galerisine ekler.
     */
    async customUpload(ctx: Context) {
        try {
            // 1. Giriş yapmış kullanıcıyı ve yüklenen dosyaları al.
            const { id: userId } = ctx.state.user;
            const { request: { files = {} } } = ctx;

            if (!files || Object.keys(files).length === 0) {
                return ctx.badRequest('Yüklenecek dosya bulunamadı.');
            }

            // 2. Dosyaları Strapi'nin ana upload servisiyle yükle.
            // Bu, dosyayı Cloudinary'e veya lokale gönderecektir.
            const uploadedFiles = await strapi.plugin('upload').service('upload').upload({
                data: {}, // 'createdBy' atamaya çalışmıyoruz.
                files: Object.values(files),
            });

            // 3. Kullanıcının mevcut UserAsset kaydını bul veya yoksa oluştur.
            let userAsset = await strapi.db.query('api::user-asset.user-asset').findOne({
                where: {
                    // DEĞİŞİKLİK: 'owner' yerine doğru alan adını kullanıyoruz
                    users_permissions_user: {
                        id: {
                            $eq: userId,
                        },
                    },
                },
                populate: ['images'],
            });

            if (!userAsset) {
                userAsset = await strapi.entityService.create('api::user-asset.user-asset', {
                    data: {
                        users_permissions_user: userId,
                        publishedAt: new Date(),
                    },
                });
            }

            // 4. Yeni yüklenen dosyaları, kullanıcının mevcut resim listesine ekle.
            const existingImageIds = userAsset.images?.map(img => img.id) || [];
            const newImageIds = uploadedFiles.map(file => file.id);

            await strapi.entityService.update('api::user-asset.user-asset', userAsset.id, {
                data: {
                    images: [...existingImageIds, ...newImageIds],
                },
            });

            return uploadedFiles;
        } catch (error) {
            console.error('customUpload sırasında hata:', error);
            return ctx.internalServerError("Dosya yüklenirken bir hata oluştu.");
        }
    },
}));