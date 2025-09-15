// src/pages/Checkout.tsx
import { useEffect, useMemo, useState } from "react";
import { inventoryStore } from "../store";
import type { LineItem } from "../types";

export default function CheckoutPage() {
  const [cart, setCart] = useState<LineItem[]>(inventoryStore.getCart());
  const [cashMode, setCashMode] = useState(false);
  const [cashGiven, setCashGiven] = useState<string>("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => inventoryStore.subscribeCart(() => setCart(inventoryStore.getCart())), []);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.unitPrice * l.qty, 0), [cart]);
  const taxRate = 0;
  const tax = useMemo(() => +(subtotal * taxRate).toFixed(2), [subtotal, taxRate]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  const cashNum = useMemo(() => Number(cashGiven || "0"), [cashGiven]);
  const validCash = !isNaN(cashNum);
  const changeDue = useMemo(() => (cashMode && validCash ? +(cashNum - total).toFixed(2) : 0), [cashMode, validCash, cashNum, total]);
  const cashShort = cashMode && validCash && cashNum < total;

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 1500);
  };

  const doCheckout = () => {
    inventoryStore.completeSale({ tender: "card", taxRate });
    showMsg("success", "Sale complete. Inventory updated.");
  };
  const doCheckoutCash = () => {
    if (!validCash) { showMsg("error", "Enter a valid cash amount."); return; }
    if (cashNum < total) { showMsg("error", "Cash is less than total."); return; }
    inventoryStore.completeSale({ tender: "cash", amountPaid: cashNum, taxRate });
    const changeText = `Change due: $${(cashNum - total).toFixed(2)}`;
    showMsg("success", `Cash sale complete. ${changeText}`);
    setCashMode(false);
    setCashGiven("");
  };
  const setExactCash = () => setCashGiven(total.toFixed(2));

  if (cart.length === 0) return <div className="p-4">No items in cart.</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-2">Checkout</h1>

      {message && (
        <div
          className="mb-3 px-3 py-2 rounded"
          style={{
            background: message.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: message.type === "success" ? "#065f46" : "#991b1b",
            border: `1px solid ${message.type === "success" ? "#a7f3d0" : "#fecaca"}`,
          }}
        >
          {message.text}
        </div>
      )}

      <ul className="mb-4">
        {cart.map((c, i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            {c.imageUrl ? (
              <img src={c.imageUrl} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} onError={(e) => (e.currentTarget.style.display = "none")} />
            ) : (
              <div style={{ width: 40, height: 40, background: "#f3f4f6", borderRadius: 6 }} />
            )}
            <span>
              {c.name} {c.size ? `(${c.size})` : ""} ×{c.qty} — ${(c.unitPrice * c.qty).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mb-2">Subtotal: ${subtotal.toFixed(2)}</div>
      <div className="mb-2">Tax: ${tax.toFixed(2)}</div>
      <div className="font-bold mb-4">Total: ${total.toFixed(2)}</div>

      {!cashMode ? (
        <div className="flex gap-3">
          <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={doCheckout}>Checkout</button>
          <button className="bg-green-600 text-white px-3 py-2 rounded" onClick={() => setCashMode(true)}>Checkout with Cash</button>
        </div>
      ) : (
        <div className="border rounded p-4">
          <div className="mb-3 font-medium">Cash Checkout</div>
          <div className="grid gap-2 mb-3">
            <label className="flex items-center gap-2">
              <span style={{ width: 120 }}>Cash received</span>
              <input type="number" step="0.01" className="border rounded px-2 py-1" value={cashGiven} onChange={(e) => setCashGiven(e.target.value)} placeholder={total.toFixed(2)} />
              <button type="button" className="border rounded px-2 py-1" onClick={setExactCash}>Exact Cash</button>
            </label>
            <div>Change due: <strong>${validCash ? Math.max(0, changeDue).toFixed(2) : "0.00"}</strong></div>
            {cashShort && <div className="text-red-600 text-sm">Cash is less than total.</div>}
          </div>
          <div className="flex gap-2">
            <button className="bg-green-600 text-white px-3 py-2 rounded" onClick={doCheckoutCash}>Confirm Cash Sale</button>
            <button className="border px-3 py-2 rounded" onClick={() => { setCashMode(false); setCashGiven(""); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
