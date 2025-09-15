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
};
