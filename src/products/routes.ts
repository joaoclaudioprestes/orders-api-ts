import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  createProductSchema,
  productSchema,
  updateProductSchema,
} from './schema.js';
import type { ProductService } from './service.js';

const params = z.object({ id: z.string() });
const tags = ['products'];

export const productRoutes =
  (service: ProductService): FastifyPluginAsyncZod =>
  async (app) => {
    app.post('/products', {
      schema: {
        tags,
        body: createProductSchema,
        response: { 201: productSchema },
      },
      handler: async (req, reply) =>
        reply.code(201).send(await service.create(req.body)),
    });
    app.get('/products', {
      schema: { tags, response: { 200: z.array(productSchema) } },
      handler: () => service.list(),
    });
    app.get('/products/:id', {
      schema: { tags, params, response: { 200: productSchema } },
      handler: (req) => service.get(req.params.id),
    });
    app.patch('/products/:id', {
      schema: {
        tags,
        params,
        body: updateProductSchema,
        response: { 200: productSchema },
      },
      handler: (req) => service.update(req.params.id, req.body),
    });
    app.delete('/products/:id', {
      schema: { tags, params, response: { 204: z.null() } },
      handler: async (req, reply) => {
        await service.remove(req.params.id);
        return reply.code(204).send(null);
      },
    });
  };
