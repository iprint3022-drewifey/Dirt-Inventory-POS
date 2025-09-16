import { useEffect, useMemo, useState } from "react";
import { inventoryStore } from "../store";
import type { Item } from "../types";

export default function POSPage() {
  const [items, setItems] = useState<Item[]>(inventoryStore.getItems());
  const [q, setQ] = useState("");
  const [sizeFilter, setSizeFilter] = useState<string>("");

  useEffect(() => inventoryStore.subscribeItems(() => setItems(inventoryStore.getItems())), []);

  const filtered = useMemo(() => {
    const lower = q.trim().toLowerCase();
    return items.filter(it => {
      const byQ = !lower || it.name.toLowerCase().includes(lower) || (it.vendor||"").toLowerCase().includes(lower) || (it.tags||[]).some(t=>t.toLowerCase().includes(lower));
      const bySize = !sizeFilter || (it.sizes||[]).some(s=>s.size===sizeFilter);
      return byQ && bySize;
    });
  }, [items, q, sizeFilter]);

  const allSizes = useMemo(()=>Array.from(new Set(items.flatMap(i=>i.sizes?.map(s=>s.size)||[]))),[items]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Point of Sale</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          className="border rounded px-3 py-2"
          placeholder="Search name, vendor, tag…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <select className="border rounded px-3 py-2" value={sizeFilter} onChange={e=>setSizeFilter(e.target.value)}>
          <option value="">All sizes</option>
          {allSizes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 && <div>No products match.</div>}

      <div style={{ display:"grid", gap:16, gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))" }}>
        {filtered.map(it => <POSCard key={it.id} item={it} />)}
      </div>
    </div>
  );
}

function POSCard({ item }: { item: Item }) {
  const [size, setSize] = useState<string>(item.sizes?.[0]?.size ?? "");
  const [adding, setAdding] = useState(false);
  const hasSizes = !!(item.sizes && item.sizes.length > 0);
  const chosen = (item.sizes||[]).find(s=>s.size===size);
  const low = typeof item.lowStockThreshold==="number" && chosen && chosen.stock<=item.lowStockThreshold!;

  const onAdd = () => {
    inventoryStore.addToCart({
      itemId: item.id,
      name: item.name,
      size: hasSizes ? (size || item.sizes![0].size) : undefined,
      qty: 1,
      unitPrice: item.price,
      unitCost: item.cost,
      imageUrl: item.imageUrl,
    });
    setAdding(true); setTimeout(()=>setAdding(false), 850);
  };

  return (
    <div style={{ border:"1px solid #e5e7eb", borderRadius:16, overflow:"hidden", background:"#fff", boxShadow:"0 1px 6px rgba(0,0,0,.06)" }}>
      <div style={{ position:"relative", height: 180, background:"#f3f4f6" }}>
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}
               onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display="none";}}/>
        )}
        {low && (
          <div style={{ position:"absolute", top:8, left:8, background:"#fef3c7", color:"#92400e", padding:"2px 8px", borderRadius:999, fontSize:12 }}>
            Low • {chosen?.stock ?? 0} left
          </div>
        )}
      </div>

      <div style={{ padding:12, display:"grid", gap:8 }}>
        <div style={{ fontWeight:700 }}>{item.name}</div>
        <div style={{ color:"#4b5563" }}>${item.price.toFixed(2)}</div>

        {hasSizes && (
          <select value={size} onChange={(e)=>setSize(e.target.value)} className="border rounded px-2 py-1">
            {item.sizes!.map(s => (
              <option key={s.size} value={s.size}>{s.size}{Number.isFinite(s.stock) ? ` (${s.stock})` : ""}</option>
            ))}
          </select>
        )}

        <button
          onClick={onAdd}
          className="px-3 py-2 rounded"
          style={{ background: adding ? "#16a34a" : "#111827", color:"#fff" }}
        >
          {adding ? "✓ Added" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
