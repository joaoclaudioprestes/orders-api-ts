import type { CreateProduct, Product, UpdateProduct } from './schema.js';

export interface ProductRepository {
  create(data: CreateProduct): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  list(): Promise<Product[]>;
  update(id: string, data: UpdateProduct): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
}
