import type { Order, OrderStatus } from './schema.js';

export interface OrderRepository {
  create(data: Omit<Order, 'id'>): Promise<Order>;
  // forUpdate: row lock until the surrounding transaction ends
  findById(id: string, forUpdate?: boolean): Promise<Order | null>;
  list(): Promise<Order[]>;
  updateStatus(id: string, status: OrderStatus): Promise<Order | null>;
}
