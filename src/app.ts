import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  hasZodFastifySchemaValidationErrors,
} from 'fastify-type-provider-zod';
import { productRoutes } from './products/routes.js';
import {
  ProductNotFoundError,
  type ProductService,
} from './products/service.js';

export async function buildApp(deps: { products: ProductService }) {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ProductNotFoundError)
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
  await app.register(productRoutes(deps.products));
  return app;
}
