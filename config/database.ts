// config/database.ts
import path from 'path';
// pg-connection-string paketini projemize zaten eklemiştik
import { parse as parsePgConnectionString } from 'pg-connection-string';

export default ({ env }) => {
  // 1. Ortamdan hangi veritabanı istemcisinin kullanılacağını oku.
  // Eğer belirtilmemişse, varsayılan olarak 'sqlite' kullan.
  const client = env('DATABASE_CLIENT', 'sqlite');

  // 2. Sadece 'postgres' istemcisi seçiliyse ve DATABASE_URL varsa,
  // PostgreSQL bağlantı ayarlarını oluştur.
  if (client === 'postgres' && env('DATABASE_URL')) {
    const config = parsePgConnectionString(env('DATABASE_URL'));
    
    return {
      connection: {
        client: 'postgres',
        connection: {
          host: config.host,
          port: parseInt(config.port, 10),
          database: config.database,
          user: config.user,
          password: config.password,
          ssl: {
            // Render'ın veritabanları SSL gerektirir
            rejectUnauthorized: false,
          },
        },
        debug: false,
      },
    };
  }

  // 3. Diğer tüm durumlar için (yani lokalde çalışırken),
  // varsayılan SQLite ayarlarını kullan.
  return {
    connection: {
      client: 'sqlite',
      connection: {
        filename: path.join(
          __dirname,
          '..',
          '..',
          env('DATABASE_FILENAME', '.tmp/data.db')
        ),
      },
      useNullAsDefault: true,
    },
  };
};