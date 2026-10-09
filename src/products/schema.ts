import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().trim().min(1),
  price: z.number().positive(),
  stock: z.number().int().min(0),
});
export const updateProductSchema = createProductSchema.partial();

export const productSchema = createProductSchema.extend({ id: z.uuid() });

export type CreateProduct = z.infer<typeof createProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type Product = z.infer<typeof productSchema>;
