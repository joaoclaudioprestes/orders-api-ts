import { ProductNotFoundError } from '../products/service.js';
import type { ProductRepository } from '../products/repository.js';
import { maxInt, maxPrice } from '../products/schema.js';
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

export class OrderTotalTooLargeError extends Error {
  constructor() {
    super(`Order total exceeds ${maxPrice}`);
  }
}

export class StockOverflowError extends Error {
  constructor(productId: string) {
    super(`Stock for product ${productId} would exceed ${maxInt}`);
  }
}

// integer cents avoid float drift; the total is converted to reais only at the end
export const totalOf = (items: { unitPrice: number; quantity: number }[]) => {
  const cents = items.reduce(
    (sum, i) => sum + Math.round(i.unitPrice * 100) * i.quantity,
    0,
  );
  if (cents > Math.round(maxPrice * 100)) throw new OrderTotalTooLargeError();
  return cents / 100;
};

const transitions: Record<OrderStatus, OrderStatus[]> = {
  created: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: [],
  cancelled: [],
};

export interface TxRepos {
  orders: OrderRepository;
  products: ProductRepository;
}

// Runs work atomically: everything done through the repos commits or rolls back together.
export type Transactor = <T>(
  work: (repos: TxRepos) => Promise<T>,
) => Promise<T>;

export class OrderService {
  constructor(private readonly tx: Transactor) {}

  async create(input: CreateOrder) {
    const { items } = createOrderSchema.parse(input);
    return this.tx(({ orders, products }) =>
      this.createIn(orders, products, items),
    );
  }

  private async createIn(
    orders: OrderRepository,
    products: ProductRepository,
    items: CreateOrder['items'],
  ) {
    // lock in id order (deadlock-free) so a concurrent product delete waits for us
    for (const { productId } of [...items].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    ))
      await products.findById(productId, true);
    const priced = [];
    for (const { productId, quantity } of items) {
      const product = await products.findById(productId);
      if (!product) throw new ProductNotFoundError(productId);
      priced.push({ productId, quantity, unitPrice: product.price });
    }
    return orders.create({
      status: 'created',
      items: priced,
      total: totalOf(priced),
    });
  }

  async get(id: string) {
    return this.tx(({ orders }) => this.getIn(orders, id));
  }

  private async getIn(orders: OrderRepository, id: string, forUpdate = false) {
    const order = await orders.findById(id, forUpdate);
    if (!order) throw new OrderNotFoundError(id);
    return order;
  }

  list() {
    return this.tx(({ orders }) => orders.list());
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

  private transition(id: string, to: OrderStatus) {
    return this.tx((repos) => this.transitionIn(repos, id, to));
  }

  private async transitionIn(
    { orders, products }: TxRepos,
    id: string,
    to: OrderStatus,
  ) {
    const order = await this.getIn(orders, id, true);
    if (!transitions[order.status].includes(to))
      throw new InvalidTransitionError(order.status, to);

    if (to === 'paid') await this.adjustStock(products, order, -1);
    // paid orders hold stock; created ones never took it
    if (to === 'cancelled' && order.status === 'paid')
      await this.adjustStock(products, order, 1);

    return (await orders.updateStatus(id, to))!;
  }

  // products locked in id order so concurrent orders cannot deadlock
  private async adjustStock(
    products: ProductRepository,
    order: Order,
    sign: 1 | -1,
  ) {
    const stocks = new Map<string, number>();
    const items = [...order.items].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    );
    for (const { productId, quantity } of items) {
      const product = await products.findById(productId, true);
      if (!product) throw new ProductNotFoundError(productId);
      const stock = (stocks.get(productId) ?? product.stock) + sign * quantity;
      if (stock < 0) throw new InsufficientStockError(productId);
      if (stock > maxInt) throw new StockOverflowError(productId);
      stocks.set(productId, stock);
    }
    for (const [productId, stock] of stocks)
      await products.update(productId, { stock });
  }
}
