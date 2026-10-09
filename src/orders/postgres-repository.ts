import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { orders } from '../db/schema.js';
import type { OrderRepository } from './repository.js';

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async create(data: Parameters<OrderRepository['create']>[0]) {
    const [row] = await this.db.insert(orders).values(data).returning();
    return row!;
  }
  async findById(id: string) {
    const [row] = await this.db.select().from(orders).where(eq(orders.id, id));
    return row ?? null;
  }
  list() {
    return this.db.select().from(orders);
  }
  async updateStatus(
    id: string,
    status: Parameters<OrderRepository['updateStatus']>[1],
  ) {
    const [row] = await this.db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return row ?? null;
  }
}
