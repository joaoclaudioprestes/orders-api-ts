import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { products } from '../db/schema.js';
import type { ProductRepository } from './repository.js';

export class PostgresProductRepository implements ProductRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async create(data: Parameters<ProductRepository['create']>[0]) {
    const [row] = await this.db.insert(products).values(data).returning();
    return row!;
  }
  async findById(id: string, forUpdate = false) {
    const query = this.db.select().from(products).where(eq(products.id, id));
    const [row] = await (forUpdate ? query.for('update') : query);
    return row ?? null;
  }
  list() {
    return this.db.select().from(products);
  }
  async update(id: string, data: Parameters<ProductRepository['update']>[1]) {
    // empty patch: drizzle rejects empty set()
    if (Object.keys(data).length === 0) return this.findById(id);
    const [row] = await this.db
      .update(products)
      .set(data)
      .where(eq(products.id, id))
      .returning();
    return row ?? null;
  }
  async delete(id: string) {
    const rows = await this.db
      .delete(products)
      .where(eq(products.id, id))
      .returning();
    return rows.length > 0;
  }
}
