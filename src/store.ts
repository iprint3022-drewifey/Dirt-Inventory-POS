import type { Item, LineItem, Transaction, SizeStock, Settings } from "./types";

type Listener = () => void;
const LS_ITEMS = "inv_items";
const LS_CART = "inv_cart";
const LS_TXNS = "inv_txns";
const LS_SETTINGS = "inv_settings";

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function save<T>(key: string, val: T) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function uid() { return Math.random().toString(36).slice(2, 10); }

class InventoryStore {
  private items: Item[] = load<Item[]>(LS_ITEMS, []);
  private cart: LineItem[] = load<LineItem[]>(LS_CART, []);
  private txns: Transaction[] = load<Transaction[]>(LS_TXNS, []);
  private settings: Settings = load<Settings>(LS_SETTINGS, { taxRate: 0 });

  private itemListeners: Listener[] = [];
  private cartListeners: Listener[] = [];
  private settingsListeners: Listener[] = [];

  private lastDeleted: Item | null = null;  // for undo

  // --- getters
  getItems() { return this.items.slice(); }
  getCart() { return this.cart.slice(); }
  getTransactions() { return this.txns.slice(); }
  getSettings() { return { ...this.settings }; }

  // --- subscriptions
  subscribeItems(fn: Listener) { this.itemListeners.push(fn); return () => this.itemListeners = this.itemListeners.filter(f=>f!==fn); }
  subscribeCart(fn: Listener) { this.cartListeners.push(fn); return () => this.cartListeners = this.cartListeners.filter(f=>f!==fn); }
  subscribeSettings(fn: Listener) { this.settingsListeners.push(fn); return () => this.settingsListeners = this.settingsListeners.filter(f=>f!==fn); }
  private emitItems(){ this.itemListeners.forEach(f=>f()); }
  private emitCart(){ this.cartListeners.forEach(f=>f()); }
  private emitSettings(){ this.settingsListeners.forEach(f=>f()); }

  // --- items
  addItem(partial: Omit<Item,"id">) {
    const item: Item = { id: uid(), lowStockThreshold: 3, ...partial };
    this.items.push(item);
    save(LS_ITEMS, this.items); this.emitItems();
  }
  updateItem(id: string, patch: Partial<Item>) {
    const i = this.items.findIndex(x=>x.id===id);
    if (i>-1) { this.items[i] = { ...this.items[i], ...patch }; save(LS_ITEMS, this.items); this.emitItems(); }
  }
  deleteItem(id: string) {
    const i = this.items.findIndex(x=>x.id===id);
    if (i>-1) {
      this.lastDeleted = this.items[i];
      this.items.splice(i,1);
      this.cart = this.cart.filter(c=>c.itemId!==id);
      save(LS_ITEMS, this.items); save(LS_CART, this.cart);
      this.emitItems(); this.emitCart();
    }
  }
  undoDelete() {
    if (this.lastDeleted) {
      this.items.push(this.lastDeleted);
      save(LS_ITEMS, this.items); this.emitItems();
      this.lastDeleted = null;
    }
  }

  // --- cart
  addToCart(line: LineItem) {
    const key = `${line.itemId}|${line.size ?? ""}|${line.unitPrice}`;
    const idx = this.cart.findIndex(c => `${c.itemId}|${c.size ?? ""}|${c.unitPrice}` === key);
    if (idx >= 0) this.cart[idx].qty += line.qty;
    else this.cart.push({ ...line });
    save(LS_CART, this.cart); this.emitCart();
  }
  setCartQty(index: number, qty: number) {
    if (index>=0 && index<this.cart.length) {
      if (qty<=0) this.cart.splice(index,1);
      else this.cart[index].qty = qty;
      save(LS_CART, this.cart); this.emitCart();
    }
  }
  removeCartLine(index: number) {
    if (index>=0 && index<this.cart.length) {
      this.cart.splice(index,1); save(LS_CART, this.cart); this.emitCart();
    }
  }
  clearCart(){ this.cart = []; save(LS_CART, this.cart); this.emitCart(); }

  // --- settings
  setTaxRate(rate: number){ this.settings.taxRate = Math.max(0, rate); save(LS_SETTINGS, this.settings); this.emitSettings(); }

  // --- complete sale
  completeSale(opts: { tender: "cash" | "card"; amountPaid?: number; discount?: {type:"percent"|"fixed"; value:number} | null }) {
    const taxRate = this.settings.taxRate ?? 0;

    const subtotalBefore = this.cart.reduce((s,l)=>s+l.unitPrice*l.qty,0);
    const discountVal = opts.discount
      ? (opts.discount.type==="percent" ? subtotalBefore * (opts.discount.value/100) : opts.discount.value)
      : 0;
    const subtotal = Math.max(0, +(subtotalBefore - discountVal).toFixed(2));

    const tax = +(subtotal * taxRate).toFixed(2);
    const total = subtotal + tax;

    // reduce inventory stock
    for (const line of this.cart) {
      const item = this.items.find(i=>i.id===line.itemId);
      if (item && item.sizes && line.size) {
        const ss = item.sizes.find(s=>s.size===line.size);
        if (ss) ss.stock = Math.max(0, (ss.stock ?? 0) - line.qty);
      }
    }

    const txn: Transaction = {
      id: uid(),
      timestamp: new Date().toISOString(),
      subtotal, tax, total,
      tender: opts.tender,
      amountPaid: opts.tender==="cash" ? (opts.amountPaid ?? total) : undefined,
      change: opts.tender==="cash" ? +(((opts.amountPaid ?? total)-total).toFixed(2)) : undefined,
      lines: this.cart.map(l=>({...l})),
      discount: opts.discount ?? null
    };

    this.txns.push(txn);
    save(LS_TXNS, this.txns); save(LS_ITEMS, this.items);
    this.clearCart();
  }

  // --- export/import (backup)
  exportAll(): string {
    return JSON.stringify({ items:this.items, txns:this.txns, settings:this.settings }, null, 2);
  }
  importAll(json: string) {
    const data = JSON.parse(json);
    if (Array.isArray(data.items)) this.items = data.items;
    if (Array.isArray(data.txns)) this.txns = data.txns;
    if (data.settings && typeof data.settings.taxRate === "number") this.settings = data.settings;
    save(LS_ITEMS, this.items); save(LS_TXNS, this.txns); save(LS_SETTINGS, this.settings);
    this.emitItems(); this.emitSettings();
  }
}

export const inventoryStore = new InventoryStore();
