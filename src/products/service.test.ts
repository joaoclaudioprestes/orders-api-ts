import { beforeEach, describe, expect, it } from 'vitest';
import {
  InMemoryOrderRepository,
  inMemoryTransactor,
} from '../orders/memory-repository.js';
import { InMemoryProductRepository } from './memory-repository.js';
import { ProductNotFoundError, ProductService } from './service.js';

const valid = { name: 'Keyboard', price: 99.9, stock: 10 };

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(() => {
    const products = new InMemoryProductRepository();
    service = new ProductService(
      products,
      inMemoryTransactor(new InMemoryOrderRepository(), products),
    );
  });

  it('creates a product', async () => {
    const product = await service.create(valid);
    expect(product).toMatchObject(valid);
    expect(product.id).toBeTypeOf('string');
  });

  it.each([
    ['empty name', { ...valid, name: '  ' }],
    ['zero price', { ...valid, price: 0 }],
    ['negative price', { ...valid, price: -1 }],
    ['negative stock', { ...valid, stock: -1 }],
    ['fractional stock', { ...valid, stock: 1.5 }],
  ])('rejects %s', async (_, input) => {
    await expect(service.create(input)).rejects.toThrow();
  });

  it('accepts zero stock', async () => {
    await expect(service.create({ ...valid, stock: 0 })).resolves.toMatchObject(
      { stock: 0 },
    );
  });

  it('gets a product by id', async () => {
    const { id } = await service.create(valid);
    await expect(service.get(id)).resolves.toMatchObject(valid);
  });

  it('throws when product is missing', async () => {
    await expect(service.get('missing')).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
    await expect(
      service.update('missing', { stock: 1 }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });

  it('lists products', async () => {
    await service.create(valid);
    await service.create({ ...valid, name: 'Mouse' });
    await expect(service.list()).resolves.toHaveLength(2);
  });

  it('updates a product partially', async () => {
    const { id } = await service.create(valid);
    await expect(service.update(id, { stock: 3 })).resolves.toMatchObject({
      ...valid,
      stock: 3,
    });
  });

  it('rejects invalid update', async () => {
    const { id } = await service.create(valid);
    await expect(service.update(id, { price: -5 })).rejects.toThrow();
  });

  it('removes a product', async () => {
    const { id } = await service.create(valid);
    await service.remove(id);
    await expect(service.get(id)).rejects.toBeInstanceOf(ProductNotFoundError);
  });
});
