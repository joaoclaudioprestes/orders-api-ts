import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryProductRepository } from '../products/memory-repository.js';
import { InMemoryOrderRepository } from './memory-repository.js';
import type { OrderStatus } from './schema.js';
import {
  InsufficientStockError,
  InvalidTransitionError,
  OrderNotFoundError,
  OrderService,
} from './service.js';

describe('OrderService', () => {
  let products: InMemoryProductRepository;
  let service: OrderService;
  let productId: string;

  beforeEach(async () => {
    products = new InMemoryProductRepository();
    service = new OrderService(new InMemoryOrderRepository(), products);
    productId = (
      await products.create({ name: 'Mouse', price: 10.1, stock: 5 })
    ).id;
  });

  const stock = async () => (await products.findById(productId))!.stock;
  const newOrder = (quantity = 2) =>
    service.create({ items: [{ productId, quantity }] });

  // drive an order into each status
  const reach: Record<OrderStatus, () => Promise<string>> = {
    created: async () => (await newOrder()).id,
    paid: async () => (await service.pay((await newOrder()).id)).id,
    shipped: async () => {
      const { id } = await service.pay((await newOrder()).id);
      return (await service.ship(id)).id;
    },
    cancelled: async () => (await service.cancel((await newOrder()).id)).id,
  };

  it('creates order with computed total, no stock taken', async () => {
    const order = await newOrder(3);
    expect(order).toMatchObject({ status: 'created', total: 30.3 });
    expect(await stock()).toBe(5);
  });

  it('rejects empty items and unknown product', async () => {
    await expect(service.create({ items: [] })).rejects.toThrow();
    await expect(
      service.create({
        items: [{ productId: crypto.randomUUID(), quantity: 1 }],
      }),
    ).rejects.toThrow('not found');
  });

  it('throws OrderNotFoundError', async () => {
    await expect(service.pay(crypto.randomUUID())).rejects.toBeInstanceOf(
      OrderNotFoundError,
    );
  });

  describe('valid transitions', () => {
    it('created -> paid takes stock', async () => {
      const order = await service.pay(await reach.created());
      expect(order.status).toBe('paid');
      expect(await stock()).toBe(3);
    });
    it('paid -> shipped keeps stock', async () => {
      const order = await service.ship(await reach.paid());
      expect(order.status).toBe('shipped');
      expect(await stock()).toBe(3);
    });
    it('created -> cancelled leaves stock', async () => {
      const order = await service.cancel(await reach.created());
      expect(order.status).toBe('cancelled');
      expect(await stock()).toBe(5);
    });
    it('paid -> cancelled returns stock', async () => {
      const order = await service.cancel(await reach.paid());
      expect(order.status).toBe('cancelled');
      expect(await stock()).toBe(5);
    });
  });

  describe('invalid transitions', () => {
    const cases: [OrderStatus, 'pay' | 'ship' | 'cancel'][] = [
      ['created', 'ship'],
      ['paid', 'pay'],
      ['shipped', 'pay'],
      ['shipped', 'ship'],
      ['shipped', 'cancel'],
      ['cancelled', 'pay'],
      ['cancelled', 'ship'],
      ['cancelled', 'cancel'],
    ];
    it.each(cases)('%s -> %s is rejected', async (from, action) => {
      const id = await reach[from]();
      const before = await stock();
      await expect(service[action](id)).rejects.toBeInstanceOf(
        InvalidTransitionError,
      );
      expect((await service.get(id)).status).toBe(from);
      expect(await stock()).toBe(before);
    });
  });

  it('refuses to pay without enough stock', async () => {
    const { id } = await newOrder(6);
    await expect(service.pay(id)).rejects.toBeInstanceOf(
      InsufficientStockError,
    );
    expect((await service.get(id)).status).toBe('created');
    expect(await stock()).toBe(5);
  });
});
