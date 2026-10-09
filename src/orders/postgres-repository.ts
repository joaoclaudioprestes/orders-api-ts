import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { orders } from '../db/schema.js';
import { PostgresProductRepository } from '../products/postgres-repository.js';
import type { OrderRepository } from './repository.js';
import type { Transactor } from './service.js';

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async create(data: Parameters<OrderRepository['create']>[0]) {
    const [row] = await this.db.insert(orders).values(data).returning();
    return row!;
  }
  async findById(id: string, forUpdate = false) {
    const query = this.db.select().from(orders).where(eq(orders.id, id));
    const [row] = await (forUpdate ? query.for('update') : query);
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

export const postgresTransactor =
  (db: NodePgDatabase): Transactor =>
  (work) =>
    db.transaction((tx) => {
      const txDb = tx as unknown as NodePgDatabase;
      return work({
        orders: new PostgresOrderRepository(txDb),
        products: new PostgresProductRepository(txDb),
      });
    });
