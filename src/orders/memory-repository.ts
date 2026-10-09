import { randomUUID } from 'node:crypto';
import type { OrderRepository } from './repository.js';
import type { Order } from './schema.js';

// Test double for unit tests; production uses PostgresOrderRepository.
export class InMemoryOrderRepository implements OrderRepository {
  private items = new Map<string, Order>();

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
