// config/cron-tasks.ts


export default {

    /**
    * Her dakika çalışacak olan cron job.
    * Canlıda (her gün gece yarısı): '0 0 5 * * *'
    */

    "0 * * * * *": async ({ strapi }) => {
        try {
      console.log('Running subscription check cron job (Standard format)...');
      const now = new Date();

      const expiredRestaurants = await strapi.db.query('api::restaurant.restaurant').findMany({
        where: {
          subscription_expires_at: { $lt: now },
          subscription_status: { $eq: 'active' },
        },
      });

      if (expiredRestaurants.length === 0) {
        console.log('No expired subscriptions found to update.');
        return;
      }

      console.log(`Found ${expiredRestaurants.length} expired subscription(s) to update.`);

      await Promise.all(
        expiredRestaurants.map(restaurant => {
          console.log(`Updating restaurant #${restaurant.id} to inactive.`);
          return strapi.entityService.update('api::restaurant.restaurant', restaurant.id, {
            data: {
              subscription_status: 'inactive',
            },
          });
        })
      );
      
      console.log('Expired subscriptions updated successfully.');

    } catch (error) {
        console.error("An error occurred during the subscription cron job:", error);
    }
  },
}