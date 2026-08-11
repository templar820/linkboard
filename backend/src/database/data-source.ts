import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * DataSource для TypeORM CLI (migration:generate / migration:run / migration:revert,
 * см. package.json и Makefile: `make migrate`, `make migration name=...`).
 *
 * Это ОТДЕЛЬНЫЙ вход от Nest-модуля database/database.module.ts: CLI не поднимает
 * Nest DI-контейнер, поэтому DATABASE_URL читается напрямую из process.env — при
 * запуске в контейнере backend (docker-compose) или через `docker compose exec`
 * переменная уже установлена окружением compose, .env файл здесь не требуется.
 *
 * Сущностей пока нет (T7 добавит Link/ClickEvent) — glob-паттерн ниже подхватит их
 * автоматически, как только появятся файлы *.entity.ts.
 */
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. It must be provided as an environment variable ' +
      '(see docker-compose.yml, service "backend").',
  );
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: databaseUrl,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
};

export default new DataSource(dataSourceOptions);
