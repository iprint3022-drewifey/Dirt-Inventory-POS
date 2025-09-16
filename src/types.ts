export type VariantSize = string;

export type SizeStock = {
  size: VariantSize;
  stock: number;
};

export type Item = {
  id: string;
  name: string;
  price: number;
  cost: number;
  vendor?: string;
  imageUrl?: string;
  sizes?: SizeStock[];
  tags?: string[];          // new: for filtering/collections
  lowStockThreshold?: number; // new: when to show "Low"
};

export type LineItem = {
  itemId: string;
  name: string;
  size?: VariantSize;
  qty: number;
  unitPrice: number;
  unitCost: number;
  imageUrl?: string;
};

export type Transaction = {
  id: string;
  timestamp: string; // ISO
  subtotal: number;
  tax: number;
  total: number;
  tender: "cash" | "card";
  amountPaid?: number;
  change?: number;
  lines: LineItem[];
  discount?: { type: "percent" | "fixed"; value: number } | null; // new
};

export type Settings = {
  taxRate: number; // 0..1
};
