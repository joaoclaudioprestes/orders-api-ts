import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { createOrderSchema, orderSchema } from './schema.js';
import type { OrderService } from './service.js';

const params = z.object({ id: z.string() });
const tags = ['orders'];

export const orderRoutes =
  (service: OrderService): FastifyPluginAsyncZod =>
  async (app) => {
    app.post('/orders', {
      schema: {
        tags,
        body: createOrderSchema,
        response: { 201: orderSchema },
      },
      handler: async (req, reply) =>
        reply.code(201).send(await service.create(req.body)),
    });
    app.get('/orders', {
      schema: { tags, response: { 200: z.array(orderSchema) } },
      handler: () => service.list(),
    });
    app.get('/orders/:id', {
      schema: { tags, params, response: { 200: orderSchema } },
      handler: (req) => service.get(req.params.id),
    });
    for (const [action, run] of [
      ['pay', (id: string) => service.pay(id)],
      ['ship', (id: string) => service.ship(id)],
      ['cancel', (id: string) => service.cancel(id)],
    ] as const)
      app.post(`/orders/:id/${action}`, {
        schema: { tags, params, response: { 200: orderSchema } },
        handler: (req) => run(req.params.id),
      });
  };
