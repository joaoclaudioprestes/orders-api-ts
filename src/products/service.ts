import type { ProductRepository } from './repository.js';
import {
  createProductSchema,
  updateProductSchema,
  type CreateProduct,
  type UpdateProduct,
} from './schema.js';

export class ProductNotFoundError extends Error {
  constructor(id: string) {
    super(`Product ${id} not found`);
  }
}

export class ProductInUseError extends Error {
  constructor(id: string) {
    super(`Product ${id} is referenced by an active order`);
  }
}

export class ProductService {
  constructor(private readonly repo: ProductRepository) {}

  async create(input: CreateProduct) {
    return this.repo.create(createProductSchema.parse(input));
  }

  async get(id: string) {
    const product = await this.repo.findById(id);
    if (!product) throw new ProductNotFoundError(id);
    return product;
  }

  async list() {
    return this.repo.list();
  }

  async update(id: string, input: UpdateProduct) {
    const product = await this.repo.update(
      id,
      updateProductSchema.parse(input),
    );
    if (!product) throw new ProductNotFoundError(id);
    return product;
  }

  async remove(id: string) {
    if (await this.repo.isInUse(id)) throw new ProductInUseError(id);
    if (!(await this.repo.delete(id))) throw new ProductNotFoundError(id);
  }
}
