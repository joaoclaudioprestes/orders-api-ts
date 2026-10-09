import { drizzle } from 'drizzle-orm/node-postgres';
import { buildApp } from './app.js';
import { PostgresProductRepository } from './products/postgres-repository.js';
import { PostgresOrderRepository } from './orders/postgres-repository.js';
import { OrderService } from './orders/service.js';
import { ProductService } from './products/service.js';

const db = drizzle(process.env.DATABASE_URL!);
const productRepo = new PostgresProductRepository(db);
const app = await buildApp({
  products: new ProductService(productRepo),
  orders: new OrderService(new PostgresOrderRepository(db), productRepo),
});
await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' });
