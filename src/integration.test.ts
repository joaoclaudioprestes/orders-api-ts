import { drizzle } from 'drizzle-orm/node-postgres';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { orders, products } from './db/schema.js';
import {
  PostgresOrderRepository,
  postgresTransactor,
} from './orders/postgres-repository.js';
import { OrderService } from './orders/service.js';
import { PostgresProductRepository } from './products/postgres-repository.js';
import { ProductService } from './products/service.js';

const db = drizzle(process.env.TEST_DATABASE_URL!);
const transactor = postgresTransactor(db);
const build = () =>
  buildApp({
    products: new ProductService(new PostgresProductRepository(db)),
    orders: new OrderService(transactor),
  });

beforeEach(async () => {
  await db.delete(orders);
  await db.delete(products);
});
afterAll(() => db.$client.end());

const keyboard = { name: 'Keyboard', price: 99.9, stock: 10 };

describe('products over HTTP → postgres', () => {
  it('runs full CRUD', async () => {
    const app = await build();
    const created = await app.inject({
      method: 'POST',
      url: '/products',
      payload: keyboard,
    });
    expect(created.statusCode).toBe(201);
    const { id } = created.json();

    expect((await app.inject({ url: `/products/${id}` })).json()).toMatchObject(
      keyboard,
    );
    expect((await app.inject({ url: '/products' })).json()).toHaveLength(1);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/products/${id}`,
          payload: { stock: 1 },
        })
      ).json(),
    ).toMatchObject({ stock: 1 });
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/products/${id}`,
          payload: {},
        })
      ).statusCode,
    ).toBe(200);
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
      payload: { ...keyboard, price: 0 },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('orders over HTTP → postgres', () => {
  const setup = async () => {
    const app = await build();
    const { id: productId } = (
      await app.inject({ method: 'POST', url: '/products', payload: keyboard })
    ).json();
    const post = (url: string, payload?: object) =>
      app.inject({ method: 'POST', url, payload });
    const stock = async () =>
      (await app.inject({ url: `/products/${productId}` })).json().stock;
    return { app, productId, post, stock };
  };

  it('creates, prices and lists orders', async () => {
    const { app, productId, post } = await setup();
    const res = await post('/orders', { items: [{ productId, quantity: 3 }] });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      status: 'created',
      total: 299.7,
      items: [{ productId, quantity: 3, unitPrice: 99.9 }],
    });
    expect((await app.inject({ url: '/orders' })).json()).toHaveLength(1);
  });

  it('pay takes stock, cancel of paid order gives it back', async () => {
    const { productId, post, stock } = await setup();
    const { id } = (
      await post('/orders', { items: [{ productId, quantity: 4 }] })
    ).json();
    expect((await post(`/orders/${id}/pay`)).json().status).toBe('paid');
    expect(await stock()).toBe(6);
    expect((await post(`/orders/${id}/cancel`)).json().status).toBe(
      'cancelled',
    );
    expect(await stock()).toBe(10);
  });

  it('maps errors: 409 invalid transition / no stock, 404, 400', async () => {
    const { app, productId, post, stock } = await setup();
    const { id } = (
      await post('/orders', { items: [{ productId, quantity: 99 }] })
    ).json();
    expect((await post(`/orders/${id}/ship`)).statusCode).toBe(409);
    expect((await post(`/orders/${id}/pay`)).statusCode).toBe(409);
    expect(await stock()).toBe(10);
    expect((await app.inject({ url: `/orders/${id}` })).json().status).toBe(
      'created',
    );
    expect(
      (
        await post('/orders', {
          items: [{ productId: crypto.randomUUID(), quantity: 1 }],
        })
      ).statusCode,
    ).toBe(404);
    expect((await post(`/orders/${crypto.randomUUID()}/pay`)).statusCode).toBe(
      404,
    );
    expect((await post('/orders', { items: [] })).statusCode).toBe(400);
  });
});

describe('postgresTransactor', () => {
  it('rolls back order insert and stock update together on failure', async () => {
    const productRepo = new PostgresProductRepository(db);
    const product = await productRepo.create(keyboard);

    await expect(
      transactor(async ({ orders: o, products: p }) => {
        await o.create({
          status: 'created',
          items: [{ productId: product.id, quantity: 2, unitPrice: 99.9 }],
          total: 199.8,
        });
        await p.update(product.id, { stock: 8 });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await new PostgresOrderRepository(db).list()).toHaveLength(0);
    expect((await productRepo.findById(product.id))!.stock).toBe(10);
  });

  it('commits both when work succeeds', async () => {
    const productRepo = new PostgresProductRepository(db);
    const product = await productRepo.create(keyboard);

    await transactor(async ({ orders: o, products: p }) => {
      await o.create({
        status: 'created',
        items: [{ productId: product.id, quantity: 2, unitPrice: 99.9 }],
        total: 199.8,
      });
      await p.update(product.id, { stock: 8 });
    });

    expect(await new PostgresOrderRepository(db).list()).toHaveLength(1);
    expect((await productRepo.findById(product.id))!.stock).toBe(8);
  });
});

describe('concurrent transitions', () => {
  const fire = (n: number, send: () => Promise<{ statusCode: number }>) =>
    Promise.all(Array.from({ length: n }, send)).then((rs) =>
      rs.map((r) => r.statusCode),
    );

  it('pay never oversells', async () => {
    const app = await build();
    const { id: productId } = (
      await app.inject({
        method: 'POST',
        url: '/products',
        payload: { ...keyboard, stock: 5 },
      })
    ).json();
    const ids: string[] = [];
    for (let i = 0; i < 10; i++)
      ids.push(
        (
          await app.inject({
            method: 'POST',
            url: '/orders',
            payload: { items: [{ productId, quantity: 1 }] },
          })
        ).json().id,
      );
    const codes = await Promise.all(
      ids.map(
        async (id) =>
          (await app.inject({ method: 'POST', url: `/orders/${id}/pay` }))
            .statusCode,
      ),
    );
    expect(codes.filter((c) => c === 200)).toHaveLength(5);
    expect(codes.filter((c) => c === 409)).toHaveLength(5);
    expect(
      (await app.inject({ url: `/products/${productId}` })).json().stock,
    ).toBe(0);
  });

  it('cancel of a paid order returns stock once', async () => {
    const app = await build();
    const { id: productId } = (
      await app.inject({ method: 'POST', url: '/products', payload: keyboard })
    ).json();
    const { id } = (
      await app.inject({
        method: 'POST',
        url: '/orders',
        payload: { items: [{ productId, quantity: 4 }] },
      })
    ).json();
    await app.inject({ method: 'POST', url: `/orders/${id}/pay` });
    const codes = await fire(10, () =>
      app.inject({ method: 'POST', url: `/orders/${id}/cancel` }),
    );
    expect(codes.filter((c) => c === 200)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(9);
    expect(
      (await app.inject({ url: `/products/${productId}` })).json().stock,
    ).toBe(10);
  });
});
