import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { InMemoryProductRepository } from './products/memory-repository.js';
import { ProductService } from './products/service.js';

const build = () =>
  buildApp({ products: new ProductService(new InMemoryProductRepository()) });
const valid = { name: 'Keyboard', price: 99.9, stock: 10 };

describe('product routes', () => {
  it('runs full CRUD', async () => {
    const app = await build();
    const created = await app.inject({
      method: 'POST',
      url: '/products',
      payload: valid,
    });
    expect(created.statusCode).toBe(201);
    const { id } = created.json();

    expect((await app.inject({ url: `/products/${id}` })).json()).toMatchObject(
      valid,
    );
    expect((await app.inject({ url: '/products' })).json()).toHaveLength(1);

    const patched = await app.inject({
      method: 'PATCH',
      url: `/products/${id}`,
      payload: { stock: 1 },
    });
    expect(patched.json()).toMatchObject({ stock: 1 });

    expect(
      (await app.inject({ method: 'DELETE', url: `/products/${id}` }))
        .statusCode,
    ).toBe(204);
    expect((await app.inject({ url: `/products/${id}` })).statusCode).toBe(404);
  });

  it('returns 400 on invalid body', async () => {
    const app = await build();
    const res = await app.inject({
      method: 'POST',
      url: '/products',
      payload: { ...valid, price: 0 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('serves swagger at /docs', async () => {
    const app = await build();
    expect(
      (await app.inject({ url: '/docs/json' })).json().paths,
    ).toHaveProperty('/products');
    expect((await app.inject({ url: '/docs/' })).statusCode).toBe(200);
  });
});
