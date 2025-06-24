// src/api/masa/controllers/masa.ts
'use strict';
import { factories } from '@strapi/strapi';
import { Context } from 'koa';

export default factories.createCoreController('api::table.table', ({ strapi }) => ({
  
  // Güvenli Güncelleme Fonksiyonu
  async customUpdate(ctx: Context) {
    const { id: userId } = ctx.state.user;
    const { id: tableId } = ctx.params;
    const { body } = ctx.request;

    try {
      const tableToUpdate = await strapi.db.query('api::table.table').findOne({
        where: { id: tableId },
        populate: ['restaurant.owner'],
      });

      if (!tableToUpdate) return ctx.notFound('Masa bulunamadı.');
      // @ts-ignore
      if (tableToUpdate.restaurant?.owner?.id !== userId) return ctx.unauthorized('Bu masayı düzenleme yetkiniz yok.');

      const updatedEntry = await strapi.entityService.update('api::table.table', tableId, { data: (body as any).data });
      return this.transformResponse(updatedEntry);
    } catch (err) {
      return ctx.internalServerError('Masa güncellenirken bir hata oluştu.', { error: err });
    }
  },

  // Güvenli Silme Fonksiyonu
  async safeDelete(ctx: Context) {
    const { id: userId } = ctx.state.user;
    const { id: tableId } = ctx.params;

    try {
      const tableToDelete = await strapi.db.query('api::table.table').findOne({
        where: { id: tableId },
        populate: ['restaurant.owner'],
      });

      if (!tableToDelete) return ctx.notFound('Silinecek masa bulunamadı.');
      // @ts-ignore
      if (tableToDelete.restaurant?.owner?.id !== userId) return ctx.unauthorized('Bu masayı silme yetkiniz yok.');
      
      // TODO: İleride bu masaya ait açık bir sipariş/adisyon var mı diye kontrol edilebilir.

      const deletedEntry = await strapi.entityService.delete('api::table.table', tableId);
      return this.transformResponse(deletedEntry);
    } catch (err) {
      return ctx.internalServerError('Masa silinirken bir hata oluştu.', { error: err });
    }
  },
}));