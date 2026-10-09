import type { Order, OrderStatus } from './schema.js';

export interface OrderRepository {
  create(data: Omit<Order, 'id'>): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  list(): Promise<Order[]>;
  updateStatus(id: string, status: OrderStatus): Promise<Order | null>;
}
