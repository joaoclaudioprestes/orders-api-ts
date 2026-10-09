import { ProductNotFoundError } from '../products/service.js';
import type { ProductRepository } from '../products/repository.js';
import type { OrderRepository } from './repository.js';
import {
  createOrderSchema,
  type CreateOrder,
  type Order,
  type OrderStatus,
} from './schema.js';

export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`Order ${id} not found`);
  }
}

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Cannot go from ${from} to ${to}`);
  }
}

export class InsufficientStockError extends Error {
  constructor(productId: string) {
    super(`Insufficient stock for product ${productId}`);
  }
}

const transitions: Record<OrderStatus, OrderStatus[]> = {
  created: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: [],
  cancelled: [],
};

export class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly products: ProductRepository,
  ) {}

  async create(input: CreateOrder) {
    const { items } = createOrderSchema.parse(input);
    const priced = [];
    for (const { productId, quantity } of items) {
      const product = await this.products.findById(productId);
      if (!product) throw new ProductNotFoundError(productId);
      priced.push({ productId, quantity, unitPrice: product.price });
    }
    const total = priced.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    return this.orders.create({
      status: 'created',
      items: priced,
      total: Math.round(total * 100) / 100,
    });
  }

  async get(id: string) {
    const order = await this.orders.findById(id);
    if (!order) throw new OrderNotFoundError(id);
    return order;
  }

  list() {
    return this.orders.list();
  }

  pay(id: string) {
    return this.transition(id, 'paid');
  }

  ship(id: string) {
    return this.transition(id, 'shipped');
  }

  cancel(id: string) {
    return this.transition(id, 'cancelled');
  }

  private async transition(id: string, to: OrderStatus) {
    const order = await this.get(id);
    if (!transitions[order.status].includes(to))
      throw new InvalidTransitionError(order.status, to);

    if (to === 'paid') await this.adjustStock(order, -1);
    // paid orders hold stock; created ones never took it
    if (to === 'cancelled' && order.status === 'paid')
      await this.adjustStock(order, 1);

    return (await this.orders.updateStatus(id, to))!;
  }

  // ponytail: no DB transaction; wrap in one if concurrent payments matter
  private async adjustStock(order: Order, sign: 1 | -1) {
    const stocks = new Map<string, number>();
    for (const { productId, quantity } of order.items) {
      const product = await this.products.findById(productId);
      if (!product) throw new ProductNotFoundError(productId);
      const stock = (stocks.get(productId) ?? product.stock) + sign * quantity;
      if (stock < 0) throw new InsufficientStockError(productId);
      stocks.set(productId, stock);
    }
    for (const [productId, stock] of stocks)
      await this.products.update(productId, { stock });
  }
}
