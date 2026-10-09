import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
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
  ProductNotFoundError,
  type ProductService,
} from './products/service.js';

export async function buildApp(deps: {
  products: ProductService;
  orders: OrderService;
}) {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((err, _req, reply) => {
    if (
      err instanceof InvalidTransitionError ||
      err instanceof InsufficientStockError
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
    return reply.send(err);
  });

  await app.register(swagger, {
    openapi: { info: { title: 'orders-api-ts', version: '0.1.0' } },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  app.get('/health', () => ({ status: 'ok' }));
  await app.register(productRoutes(deps.products));
  await app.register(orderRoutes(deps.orders));
  return app;
}
