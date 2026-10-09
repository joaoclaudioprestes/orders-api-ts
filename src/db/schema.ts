import {
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  price: numeric({ precision: 12, scale: 2, mode: 'number' }).notNull(),
  stock: integer().notNull(),
});

export const orders = pgTable('orders', {
  id: uuid().primaryKey().defaultRandom(),
  status: text({ enum: ['created', 'paid', 'shipped', 'cancelled'] })
    .notNull()
    .default('created'),
  items: jsonb()
    .$type<{ productId: string; quantity: number; unitPrice: number }[]>()
    .notNull(),
  total: numeric({ precision: 12, scale: 2, mode: 'number' }).notNull(),
});
