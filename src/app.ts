import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyError } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  hasZodFastifySchemaValidationErrors,
} from 'fastify-type-provider-zod';
import { orderRoutes } from './orders/routes.js';
import {
  InsufficientStockError,
  InvalidTransitionError,
  OrderNotFoundError,
  type OrderService,
} from './orders/service.js';
import { productRoutes } from './products/routes.js';
import {
  ProductInUseError,
  ProductNotFoundError,
  type ProductService,
} from './products/service.js';

export async function buildApp(
  deps: {
    products: ProductService;
    orders: OrderService;
    ping?: () => Promise<unknown>;
  },
  logger = false,
) {
  const app = Fastify({ logger });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((err: FastifyError, req, reply) => {
    if (
      err instanceof InvalidTransitionError ||
      err instanceof InsufficientStockError ||
      err instanceof ProductInUseError
    )
      return reply.code(409).send({ message: err.message });
    if (
      err instanceof ProductNotFoundError ||
      err instanceof OrderNotFoundError
    )
      return reply.code(404).send({ message: err.message });
    if (hasZodFastifySchemaValidationErrors(err))
      return reply
        .code(400)
        .send({ message: 'Validation error', issues: err.validation });
    if (err.statusCode && err.statusCode < 500)
      return reply.code(err.statusCode).send({ message: err.message });
    req.log.error({ err });
    return reply.code(500).send({ message: 'Internal server error' });
  });

  await app.register(swagger, {
    openapi: { info: { title: 'orders-api-ts', version: '0.1.0' } },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  app.get('/health', async (_req, reply) => {
    try {
      await deps.ping?.();
      return { status: 'ok' };
    } catch {
      return reply.code(503).send({ status: 'unavailable' });
    }
  });
  await app.register(productRoutes(deps.products));
  await app.register(orderRoutes(deps.orders));
  return app;
}
