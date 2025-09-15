// src/pages/Products.tsx
import { useEffect, useState } from "react";
import { inventoryStore } from "../store";
import type { Item, SizeStock, VariantSize } from "../types";

export default function ProductsPage() {
  const [items, setItems] = useState<Item[]>(inventoryStore.getItems());
  useEffect(() => inventoryStore.subscribeItems(() => setItems(inventoryStore.getItems())), []);

  const onDelete = (id: string) => {
    if (confirm("Delete this product?")) inventoryStore.deleteItem(id);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Products / Inventory</h1>

      <AddProductForm />

      <table className="min-w-full text-sm border mt-6">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 px-3">Product</th>
            <th className="py-2 px-3">Price</th>
            <th className="py-2 px-3">Our Cost</th>
            <th className="py-2 px-3">Vendor</th>
            <th className="py-2 px-3">Sizes</th>
            <th className="py-2 px-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id} className="border-b align-top">
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  {it.imageUrl && <img src={it.imageUrl} className="w-10 h-10 object-cover rounded" alt="" />}
                  <div className="font-medium">{it.name}</div>
                </div>
              </td>
              <td className="py-2 px-3">${it.price.toFixed(2)}</td>
              <td className="py-2 px-3">${it.cost.toFixed(2)}</td>
              <td className="py-2 px-3">{it.vendor ?? "—"}</td>
              <td className="py-2 px-3">
                {it.sizes?.length ? it.sizes.map(s => `${s.size}(${s.stock})`).join(", ") : "—"}
              </td>
              <td className="py-2 px-3">
                <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => onDelete(it.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={6} className="text-center py-6 text-gray-500">No products yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AddProductForm() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [vendor, setVendor] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sizes, setSizes] = useState<SizeStock[]>([]);

  const addSize = () => setSizes(prev => [...prev, { size: "M", stock: 0 }]);
  const updateSize = (i: number, field: "size" | "stock", val: string) => {
    setSizes(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: field === "stock" ? Number(val) || 0 : (val as VariantSize) } : s));
  };
  const removeSize = (i: number) => setSizes(prev => prev.filter((_, idx) => idx !== i));
  const clear = () => { setName(""); setPrice(0); setCost(0); setVendor(""); setImageUrl(""); setSizes([]); };

  const save = () => {
    if (!name.trim()) { alert("Name is required"); return; }
    inventoryStore.addItem({
      name,
      price: Number(price) || 0,
      cost: Number(cost) || 0,
      vendor: vendor || undefined,
      imageUrl: imageUrl || undefined,
      sizes
    });
    clear();
  };

  return (
    <div className="border rounded p-4 bg-white">
      <h2 className="font-semibold mb-3">Add Product</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span>Name *</span>
          <input className="border rounded px-2 py-1" value={name} onChange={e=>setName(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1">
          <span>Image URL</span>
          <input className="border rounded px-2 py-1" placeholder="https://…" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1">
          <span>Price (customer pays)</span>
          <input type="number" step="0.01" className="border rounded px-2 py-1" value={price} onChange={e=>setPrice(Number(e.target.value)||0)} />
        </label>

        <label className="flex flex-col gap-1">
          <span>Our Cost</span>
          <input type="number" step="0.01" className="border rounded px-2 py-1" value={cost} onChange={e=>setCost(Number(e.target.value)||0)} />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span>Vendor</span>
          <input className="border rounded px-2 py-1" value={vendor} onChange={e=>setVendor(e.target.value)} placeholder="e.g., SanMar" />
        </label>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <strong>Sizes (optional)</strong>
            <button className="px-2 py-1 rounded border" type="button" onClick={addSize}>+ Add Size</button>
          </div>
          {sizes.length === 0 && <div className="text-sm text-gray-500 mb-2">No sizes added.</div>}
          <div className="grid gap-2">
            {sizes.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_80px] gap-2 items-center">
                <input className="border rounded px-2 py-1" value={s.size} onChange={e=>updateSize(i, "size", e.target.value)} placeholder="S / M / L / XL…" />
                <input type="number" min={0} className="border rounded px-2 py-1" value={s.stock} onChange={e=>updateSize(i, "stock", e.target.value)} placeholder="Stock" />
                <button className="border rounded px-2 py-1" type="button" onClick={()=>removeSize(i)}>Remove</button>
              </div>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2 flex gap-2 mt-1">
          <button className="bg-black text-white px-3 py-2 rounded" type="button" onClick={save}>Save Product</button>
          <button className="border px-3 py-2 rounded" type="button" onClick={clear}>Clear</button>
        </div>
      </div>
    </div>
  );
}
