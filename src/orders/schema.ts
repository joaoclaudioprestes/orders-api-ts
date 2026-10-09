import { z } from 'zod';
import { maxInt } from '../products/schema.js';

export const orderStatuses = [
  'created',
  'paid',
  'shipped',
  'cancelled',
] as const;
export const orderStatusSchema = z.enum(orderStatuses);

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().int().positive().max(maxInt),
      }),
    )
    .min(1),
});

export const orderItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

export const orderSchema = z.object({
  id: z.uuid(),
  status: orderStatusSchema,
  items: z.array(orderItemSchema),
  total: z.number(),
});

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type CreateOrder = z.infer<typeof createOrderSchema>;
export type Order = z.infer<typeof orderSchema>;
