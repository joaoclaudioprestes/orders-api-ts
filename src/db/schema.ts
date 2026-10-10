import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core';

export const products = pgTable(
  'products',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    price: numeric({ precision: 12, scale: 2, mode: 'number' }).notNull(),
    stock: integer().notNull(),
  },
  (t) => [
    check('products_stock_check', sql`${t.stock} >= 0`),
    check('products_price_check', sql`${t.price} > 0`),
  ],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid().primaryKey().defaultRandom(),
    status: text({ enum: ['created', 'paid', 'shipped', 'cancelled'] })
      .notNull()
      .default('created'),
    items: jsonb()
      .$type<{ productId: string; quantity: number; unitPrice: number }[]>()
      .notNull(),
    total: numeric({ precision: 12, scale: 2, mode: 'number' }).notNull(),
  },
  (t) => [
    check(
      'orders_status_check',
      sql`${t.status} IN ('created', 'paid', 'shipped', 'cancelled')`,
    ),
  ],
);
