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
    const priced = [];
    for (const { productId, quantity } of items) {
      const product = await products.findById(productId);
      if (!product) throw new ProductNotFoundError(productId);
      priced.push({ productId, quantity, unitPrice: product.price });
    }
    const total = priced.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    return orders.create({
      status: 'created',
      items: priced,
      total: Math.round(total * 100) / 100,
    });
  }

  async get(id: string) {
    return this.tx(({ orders }) => this.getIn(orders, id));
  }

  private async getIn(orders: OrderRepository, id: string) {
    const order = await orders.findById(id);
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
    const order = await this.getIn(orders, id);
    if (!transitions[order.status].includes(to))
      throw new InvalidTransitionError(order.status, to);

    if (to === 'paid') await this.adjustStock(products, order, -1);
    // paid orders hold stock; created ones never took it
    if (to === 'cancelled' && order.status === 'paid')
      await this.adjustStock(products, order, 1);

    return (await orders.updateStatus(id, to))!;
  }

  // ponytail: no row locks; add SELECT ... FOR UPDATE if concurrent payments matter
  private async adjustStock(
    products: ProductRepository,
    order: Order,
    sign: 1 | -1,
  ) {
    const stocks = new Map<string, number>();
    for (const { productId, quantity } of order.items) {
      const product = await products.findById(productId);
      if (!product) throw new ProductNotFoundError(productId);
      const stock = (stocks.get(productId) ?? product.stock) + sign * quantity;
      if (stock < 0) throw new InsufficientStockError(productId);
      stocks.set(productId, stock);
    }
    for (const [productId, stock] of stocks)
      await products.update(productId, { stock });
  }
}
