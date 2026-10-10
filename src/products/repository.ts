import type { CreateProduct, Product, UpdateProduct } from './schema.js';

export interface ProductRepository {
  create(data: CreateProduct): Promise<Product>;
  // forUpdate: row lock until the surrounding transaction ends
  findById(id: string, forUpdate?: boolean): Promise<Product | null>;
  list(): Promise<Product[]>;
  update(id: string, data: UpdateProduct): Promise<Product | null>;
  // true when a created/paid order references the product
  isInUse(id: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}
