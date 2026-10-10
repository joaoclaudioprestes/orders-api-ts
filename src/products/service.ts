import type { Transactor } from '../orders/service.js';
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
  constructor(
    private readonly repo: ProductRepository,
    private readonly tx: Transactor,
  ) {}

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
    // row lock serializes with order creation, which locks the same rows
    await this.tx(async ({ products }) => {
      if (!(await products.findById(id, true)))
        throw new ProductNotFoundError(id);
      if (await products.isInUse(id)) throw new ProductInUseError(id);
      await products.delete(id);
    });
  }
}
