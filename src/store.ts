import type { Item, LineItem, Transaction, SizeStock } from "./types";

type Listener = () => void;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function uid() { return Math.random().toString(36).slice(2, 10); }

class InventoryStore {
  private items: Item[] = load<Item[]>("inv_items", []);
  private cart: LineItem[] = load<LineItem[]>("inv_cart", []);
  private txns: Transaction[] = load<Transaction[]>("inv_txns", []);

  private itemListeners: Listener[] = [];
  private cartListeners: Listener[] = [];

  getItems() { return this.items.slice(); }
  getCart() { return this.cart.slice(); }
  getTransactions() { return this.txns.slice(); }

  subscribeItems(fn: Listener) {
    this.itemListeners.push(fn);
    return () => { this.itemListeners = this.itemListeners.filter(f => f !== fn); };
  }
  subscribeCart(fn: Listener) {
    this.cartListeners.push(fn);
    return () => { this.cartListeners = this.cartListeners.filter(f => f !== fn); };
  }
  private emitItems() { this.itemListeners.forEach(f => f()); }
  private emitCart() { this.cartListeners.forEach(f => f()); }

  addItem(partial: Omit<Item, "id">) {
    const item: Item = { id: uid(), ...partial };
    this.items.push(item);
    save("inv_items", this.items);
    this.emitItems();
  }

  deleteItem(id: string) {
    this.items = this.items.filter(i => i.id !== id);
    // Also purge from cart
    this.cart = this.cart.filter(c => c.itemId !== id);
    save("inv_items", this.items);
    save("inv_cart", this.cart);
    this.emitItems();
    this.emitCart();
  }

  addToCart(line: LineItem) {
    // merge with same itemId+size if exists
    const key = `${line.itemId}|${line.size ?? ""}|${line.unitPrice}`;
    const idx = this.cart.findIndex(c => `${c.itemId}|${c.size ?? ""}|${c.unitPrice}` === key);
    if (idx >= 0) {
      this.cart[idx].qty += line.qty;
    } else {
      this.cart.push({ ...line });
    }
    save("inv_cart", this.cart);
    this.emitCart();
  }

  clearCart() {
    this.cart = [];
    save("inv_cart", this.cart);
    this.emitCart();
  }

  completeSale(opts: { tender: "cash" | "card"; amountPaid?: number; taxRate?: number }) {
    const taxRate = opts.taxRate ?? 0;
    const subtotal = this.cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
    const tax = +(subtotal * taxRate).toFixed(2);
    const total = subtotal + tax;

    // reduce inventory stock if sizes exist
    for (const line of this.cart) {
      const item = this.items.find(i => i.id === line.itemId);
      if (item && item.sizes && line.size) {
        const ss = item.sizes.find(s => s.size === line.size);
        if (ss) ss.stock = Math.max(0, (ss.stock ?? 0) - line.qty);
      }
    }

    const txn: Transaction = {
      id: uid(),
      timestamp: new Date().toISOString(),
      subtotal,
      tax,
      total,
      tender: opts.tender,
      amountPaid: opts.tender === "cash" ? (opts.amountPaid ?? total) : undefined,
      change: opts.tender === "cash" ? +(((opts.amountPaid ?? total) - total).toFixed(2)) : undefined,
      lines: this.cart.map(l => ({ ...l }))
    };

    this.txns.push(txn);
    save("inv_txns", this.txns);
    save("inv_items", this.items);

    // clear cart
    this.clearCart();
  }
}

export const inventoryStore = new InventoryStore();
