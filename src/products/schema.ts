import { z } from 'zod';

// Postgres limits: integer max, numeric(12, 2) max.
export const maxInt = 2147483647;
export const maxPrice = 9999999999.99;

export const createProductSchema = z.object({
  name: z.string().trim().min(1),
  price: z.number().positive().max(maxPrice).multipleOf(0.01),
  stock: z.number().int().min(0).max(maxInt),
});
export const updateProductSchema = createProductSchema.partial();

export const productSchema = createProductSchema.extend({ id: z.uuid() });

export type CreateProduct = z.infer<typeof createProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type Product = z.infer<typeof productSchema>;
