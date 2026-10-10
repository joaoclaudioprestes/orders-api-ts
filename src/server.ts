import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { buildApp } from './app.js';
import { parseEnv } from './env.js';
import { PostgresProductRepository } from './products/postgres-repository.js';
import { postgresTransactor } from './orders/postgres-repository.js';
import { OrderService } from './orders/service.js';
import { ProductService } from './products/service.js';

const env = parseEnv(process.env);
const db = drizzle(env.DATABASE_URL);
await migrate(db, { migrationsFolder: './drizzle' });
const productRepo = new PostgresProductRepository(db);
const app = await buildApp(
  {
    products: new ProductService(productRepo),
    orders: new OrderService(postgresTransactor(db)),
  },
  true,
);
await app.listen({ port: env.PORT, host: '0.0.0.0' });
