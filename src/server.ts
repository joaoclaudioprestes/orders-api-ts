import { drizzle } from 'drizzle-orm/node-postgres';
import { buildApp } from './app.js';
import { PostgresProductRepository } from './products/postgres-repository.js';
import { ProductService } from './products/service.js';

const db = drizzle(process.env.DATABASE_URL!);
const app = await buildApp({
  products: new ProductService(new PostgresProductRepository(db)),
});
await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' });
