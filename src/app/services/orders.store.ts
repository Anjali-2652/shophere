import type { CartProduct } from './product.service';

export type OrderStatus = 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';

export const ORDER_STATUSES: OrderStatus[] = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];

export interface PlacedOrder {
  id: string;
  email: string;
  date: string;
  status: OrderStatus;
  items: { id: number; title: string; price: number; quantity: number; thumbnail: string }[];
  subtotal: number;
  shipping: number;
  total: number;
  name: string;
  address: string;
  city: string;
  zip: string;
}

const ORDERS_KEY = 'shopease_orders';

export function readOrders(): PlacedOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // Backfill status for orders placed before statuses existed.
    return (parsed as PlacedOrder[]).map((o) => ({ ...o, status: o.status ?? 'Pending' }));
  } catch {
    return [];
  }
}

function writeOrders(orders: PlacedOrder[]): void {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch { /* storage unavailable */ }
}

export function saveOrder(order: PlacedOrder): void {
  const orders = readOrders();
  orders.unshift(order);
  writeOrders(orders);
}

/** Admin: change an order's status. */
export function updateOrderStatus(id: string, status: OrderStatus): void {
  writeOrders(readOrders().map((o) => (o.id === id ? { ...o, status } : o)));
}

/** Admin: remove an order record. */
export function deleteOrder(id: string): void {
  writeOrders(readOrders().filter((o) => o.id !== id));
}

export function buildOrder(
  userEmail: string,
  name: string,
  address: string,
  city: string,
  zip: string,
  items: CartProduct[],
  subtotal: number,
  shipping: number,
  total: number
): PlacedOrder {
  return {
    id: `ORD-${Date.now().toString(36).toUpperCase()}`,
    email: userEmail,
    date: new Date().toISOString(),
    status: 'Pending',
    items: items.map((i) => ({
      id: i.id,
      title: i.title,
      price: i.price,
      quantity: i.quantity,
      thumbnail: i.thumbnail,
    })),
    subtotal,
    shipping,
    total,
    name,
    address,
    city,
    zip,
  };
}
