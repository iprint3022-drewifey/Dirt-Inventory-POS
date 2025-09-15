// src/pages/POS.tsx
import { useMemo, useState } from "react";
import { inventoryStore } from "../store";

export default function POSPage() {
  const items = useMemo(() => inventoryStore.getItems() ?? [], []);

  if (!items.length) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold mb-4">Point of Sale</h1>
        <div>No products yet. Go to Products to add some.</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Point of Sale</h1>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {items.map((it) => (
          <POSCard key={it.id} itemId={it.id} />
        ))}
      </div>
    </div>
  );
}

function POSCard({ itemId }: { itemId: string }) {
  const item = (inventoryStore.getItems() || []).find((i) => i.id === itemId);
  if (!item) return null;

  const [size, setSize] = useState<string>(item.sizes?.[0]?.size ?? "");
  const [adding, setAdding] = useState(false);
  const hasSizes = !!(item.sizes && item.sizes.length > 0);

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
    setAdding(true);
    setTimeout(() => setAdding(false), 900);
  };

  return (
    <div style={{ border: "1px solid #e5e7eb", padding: 12, borderRadius: 12, display: "flex", flexDirection: "column" }}>
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          style={{ height: 160, objectFit: "cover", borderRadius: 10, marginBottom: 8 }}
          onError={(e) => ((e.currentTarget.style.display = "none"))}
        />
      ) : (
        <div style={{ height: 160, background: "#f3f4f6", borderRadius: 10, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          No Image
        </div>
      )}

      <div style={{ fontWeight: 600 }}>{item.name}</div>
      <div style={{ color: "#4b5563", marginBottom: 8 }}>${item.price.toFixed(2)}</div>

      {hasSizes && (
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 8px", marginBottom: 8 }}
        >
          {item.sizes!.map((s) => (
            <option key={s.size} value={s.size}>
              {s.size}{Number.isFinite(s.stock) ? ` (${s.stock} left)` : ""}
            </option>
          ))}
        </select>
      )}

      <button
        onClick={onAdd}
        style={{
          background: adding ? "#16a34a" : "#000",
          color: "#fff",
          padding: "8px 10px",
          borderRadius: 8,
          marginTop: "auto",
        }}
      >
        {adding ? "✓ Added" : "Add to Cart"}
      </button>
    </div>
  );
}
