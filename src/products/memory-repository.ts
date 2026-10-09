import { randomUUID } from 'node:crypto';
import type { ProductRepository } from './repository.js';
import type { Product } from './schema.js';

// Test double for unit tests; production uses PostgresProductRepository.
export class InMemoryProductRepository implements ProductRepository {
  private items = new Map<string, Product>();

  async create(data: Omit<Product, 'id'>) {
    const product = { id: randomUUID(), ...data };
    this.items.set(product.id, product);
    return product;
  }
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async list() {
    return [...this.items.values()];
  }
  async update(id: string, data: Partial<Omit<Product, 'id'>>) {
    const current = this.items.get(id);
    if (!current) return null;
    const updated = { ...current, ...data };
    this.items.set(id, updated);
    return updated;
  }
  async delete(id: string) {
    return this.items.delete(id);
  }
}
