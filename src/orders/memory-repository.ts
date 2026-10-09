import { randomUUID } from 'node:crypto';
import type { InMemoryProductRepository } from '../products/memory-repository.js';
import type { OrderRepository } from './repository.js';
import type { Transactor } from './service.js';
import type { Order } from './schema.js';

// Test double for unit tests; production uses PostgresOrderRepository.
export class InMemoryOrderRepository implements OrderRepository {
  private items = new Map<string, Order>();

  snapshot() {
    return new Map(this.items);
  }
  restore(snapshot: Map<string, Order>) {
    this.items = snapshot;
  }

  async create(data: Omit<Order, 'id'>) {
    const order = { id: randomUUID(), ...data };
    this.items.set(order.id, order);
    return order;
  }
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async list() {
    return [...this.items.values()];
  }
  async updateStatus(id: string, status: Order['status']) {
    const current = this.items.get(id);
    if (!current) return null;
    const updated = { ...current, status };
    this.items.set(id, updated);
    return updated;
  }
}

// Snapshot-based rollback; enough to exercise atomicity without a DB.
export const inMemoryTransactor =
  (
    orders: InMemoryOrderRepository,
    products: InMemoryProductRepository,
  ): Transactor =>
  async (work) => {
    const saved = { orders: orders.snapshot(), products: products.snapshot() };
    try {
      return await work({ orders, products });
    } catch (err) {
      orders.restore(saved.orders);
      products.restore(saved.products);
      throw err;
    }
  };
