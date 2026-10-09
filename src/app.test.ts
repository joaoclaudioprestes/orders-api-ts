import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { InMemoryProductRepository } from './products/memory-repository.js';
import { InMemoryOrderRepository } from './orders/memory-repository.js';
import { OrderService } from './orders/service.js';
import { ProductService } from './products/service.js';

const build = () => {
  const products = new InMemoryProductRepository();
  return buildApp({
    products: new ProductService(products),
    orders: new OrderService(new InMemoryOrderRepository(), products),
  });
};
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

describe('order routes', () => {
  it('maps lifecycle and invalid transition to 409', async () => {
    const app = await build();
    const { id: productId } = (
      await app.inject({ method: 'POST', url: '/products', payload: valid })
    ).json();
    const created = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: { items: [{ productId, quantity: 2 }] },
    });
    expect(created.statusCode).toBe(201);
    const { id } = created.json();

    const post = (action: string) =>
      app.inject({ method: 'POST', url: `/orders/${id}/${action}` });
    expect((await post('ship')).statusCode).toBe(409);
    expect((await post('pay')).json()).toMatchObject({ status: 'paid' });
    expect((await post('ship')).json()).toMatchObject({ status: 'shipped' });
    expect((await post('cancel')).statusCode).toBe(409);
    expect((await app.inject({ url: `/orders/${id}` })).json().status).toBe(
      'shipped',
    );
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/orders/${crypto.randomUUID()}/pay`,
        })
      ).statusCode,
    ).toBe(404);
  });
});
