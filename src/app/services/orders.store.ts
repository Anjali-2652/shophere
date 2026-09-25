import type { CartProduct } from './product.service';

export interface PlacedOrder {
  id: string;
  email: string;
  date: string;
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
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: PlacedOrder): void {
  try {
    const orders = readOrders();
    orders.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch { /* storage unavailable */ }
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
