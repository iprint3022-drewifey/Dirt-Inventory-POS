import { useEffect, useState } from "react";
import { inventoryStore } from "../store";
import type { Item, SizeStock } from "../types";

// NOTE: keep your existing AddProductForm here if you already have uploads.
// I'm focusing this snippet on the list/table with inline edits.

export default function ProductsPage() {
  const [items, setItems] = useState<Item[]>(inventoryStore.getItems());
  const [undoVisible, setUndoVisible] = useState(false);

  useEffect(() => inventoryStore.subscribeItems(() => setItems(inventoryStore.getItems())), []);

  const onDelete = (id: string) => {
    inventoryStore.deleteItem(id);
    setUndoVisible(true);
    setTimeout(()=>setUndoVisible(false), 4000);
  };

  const onUndo = () => { inventoryStore.undoDelete(); setUndoVisible(false); };

  const setField = (id:string, field: keyof Item, value:any) => inventoryStore.updateItem(id, { [field]: value } as Partial<Item>);
  const adjustStock = (id:string, size:string, delta:number) => {
    const it = items.find(x=>x.id===id); if (!it || !it.sizes) return;
    const sizes = it.sizes.map(s => s.size===size ? { ...s, stock: Math.max(0, (s.stock||0) + delta) } : s);
    inventoryStore.updateItem(id, { sizes });
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Products / Inventory</h1>

      {/* Keep your AddProductForm above this line if you already have it */}
      {/* <AddProductForm /> */}

      {undoVisible && (
        <div className="mb-3 px-3 py-2 rounded border" style={{ background:"#fffbeb", borderColor:"#fde68a", color:"#92400e" }}>
          Product deleted. <button className="underline ml-2" onClick={onUndo}>Undo</button>
        </div>
      )}

      <table className="min-w-full text-sm border mt-2">
        <thead>
          <tr className="text-left border-b bg-gray-50">
            <th className="py-2 px-3">Product</th>
            <th className="py-2 px-3">Price</th>
            <th className="py-2 px-3">Our Cost</th>
            <th className="py-2 px-3">Vendor</th>
            <th className="py-2 px-3">Tags</th>
            <th className="py-2 px-3">Sizes</th>
            <th className="py-2 px-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id} className="border-b align-top">
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  {it.imageUrl && <img src={it.imageUrl} className="w-10 h-10 object-cover rounded" alt=""/>}
                  <div className="font-medium">{it.name}</div>
                </div>
              </td>

              <td className="py-2 px-3">
                <input type="number" step="0.01" className="border rounded px-2 py-1 w-28"
                  value={it.price} onChange={e=>setField(it.id,"price", Number(e.target.value)||0)} />
              </td>

              <td className="py-2 px-3">
                <input type="number" step="0.01" className="border rounded px-2 py-1 w-28"
                  value={it.cost} onChange={e=>setField(it.id,"cost", Number(e.target.value)||0)} />
              </td>

              <td className="py-2 px-3">
                <input className="border rounded px-2 py-1 w-36"
                  value={it.vendor||""} onChange={e=>setField(it.id,"vendor", e.target.value)} placeholder="Vendor" />
              </td>

              <td className="py-2 px-3">
                <input className="border rounded px-2 py-1 w-44"
                  value={(it.tags||[]).join(", ")}
                  onChange={e=>setField(it.id,"tags", e.target.value.split(",").map(t=>t.trim()).filter(Boolean))} placeholder="comma,separated,tags" />
              </td>

              <td className="py-2 px-3">
                {(it.sizes||[]).length===0 && <div className="text-gray-500">—</div>}
                <div className="grid gap-1">
                  {(it.sizes||[]).map(s=>(
                    <div key={s.size} className="flex items-center gap-2">
                      <div className="w-16">{s.size}</div>
                      <div className="w-10 text-right">{s.stock}</div>
                      <div className="flex gap-1">
                        <button className="border rounded px-2" onClick={()=>adjustStock(it.id, s.size, +10)}>+10</button>
                        <button className="border rounded px-2" onClick={()=>adjustStock(it.id, s.size, +1)}>+1</button>
                        <button className="border rounded px-2" onClick={()=>adjustStock(it.id, s.size, -1)}>-1</button>
                        <button className="border rounded px-2" onClick={()=>adjustStock(it.id, s.size, -10)}>-10</button>
                      </div>
                    </div>
                  ))}
                </div>
              </td>

              <td className="py-2 px-3">
                <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={()=>onDelete(it.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {items.length===0 && <tr><td colSpan={7} className="text-center py-6 text-gray-500">No products yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
