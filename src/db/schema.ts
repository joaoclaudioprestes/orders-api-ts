import { integer, numeric, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  price: numeric({ precision: 12, scale: 2, mode: 'number' }).notNull(),
  stock: integer().notNull(),
});
