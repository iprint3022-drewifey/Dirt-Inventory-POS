import { useEffect, useMemo, useState } from "react";
import { inventoryStore } from "../store";
import type { LineItem } from "../types";

export default function CheckoutPage() {
  const [cart, setCart] = useState<LineItem[]>(inventoryStore.getCart());
  const [settings, setSettings] = useState(inventoryStore.getSettings());
  const [cashMode, setCashMode] = useState(false);
  const [cashGiven, setCashGiven] = useState<string>("");
  const [discount, setDiscount] = useState<{ type: "percent" | "fixed"; value: number } | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => inventoryStore.subscribeCart(() => setCart(inventoryStore.getCart())), []);
  useEffect(() => inventoryStore.subscribeSettings(() => setSettings(inventoryStore.getSettings())), []);

  const subtotalBefore = useMemo(() => cart.reduce((s,l)=>s+l.unitPrice*l.qty,0), [cart]);
  const discountValue = useMemo(() => {
    if (!discount) return 0;
    return discount.type==="percent" ? subtotalBefore*(discount.value/100) : discount.value;
  }, [discount, subtotalBefore]);
  const subtotal = useMemo(()=>Math.max(0, +(subtotalBefore - discountValue).toFixed(2)), [subtotalBefore, discountValue]);
  const tax = useMemo(()=> +(subtotal * (settings.taxRate ?? 0)).toFixed(2), [subtotal, settings.taxRate]);
  const total = useMemo(()=> subtotal + tax, [subtotal, tax]);

  const cashNum = useMemo(()=>Number(cashGiven || "0"), [cashGiven]);
  const validCash = !isNaN(cashNum);
  const changeDue = useMemo(()=> (cashMode && validCash ? +(cashNum - total).toFixed(2) : 0), [cashMode, validCash, cashNum, total]);
  const cashShort = cashMode && validCash && cashNum < total;

  const show = (type:"success"|"error", text:string)=>{ setMessage({type,text}); setTimeout(()=>setMessage(null),1200); };

  const setExactCash = ()=> setCashGiven(total.toFixed(2));
  const applyQuickCash = (amt:number)=> setCashGiven(String(+(cashNum + amt).toFixed(2)));

  const doCheckout = () => {
    inventoryStore.completeSale({ tender:"card", discount });
    show("success","Sale complete. Inventory updated.");
  };
  const doCheckoutCash = () => {
    if (!validCash) { show("error","Enter a valid cash amount."); return; }
    if (cashNum < total) { show("error","Cash is less than total."); return; }
    inventoryStore.completeSale({ tender:"cash", amountPaid: cashNum, discount });
    show("success", `Cash sale complete. Change: $${(cashNum-total).toFixed(2)}`);
    setCashMode(false); setCashGiven("");
  };

  if (cart.length===0) return <div className="p-4">No items in cart.</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Checkout</h1>

      {/* Settings bar */}
      <div className="flex flex-wrap gap-3 items-center mb-3 border rounded p-3">
        <label className="flex items-center gap-2">
          <span>Tax Rate</span>
          <input type="number" step="0.01" className="border rounded px-2 py-1"
            value={settings.taxRate}
            onChange={e=>inventoryStore.setTaxRate(Math.max(0, Number(e.target.value)||0))}
          />
        </label>

        <div className="flex items-center gap-2">
          <span>Discount</span>
          <select className="border rounded px-2 py-1"
                  value={discount?.type ?? ""}
                  onChange={e=> setDiscount(e.target.value ? { type: e.target.value as ("percent"|"fixed"), value: discount?.value ?? 10 } : null)}>
            <option value="">None</option>
            <option value="percent">% off</option>
            <option value="fixed">$ off</option>
          </select>
          {discount && (
            <input type="number" step="0.01" className="border rounded px-2 py-1"
              value={discount.value}
              onChange={e=> setDiscount({ type: discount.type, value: Math.max(0, Number(e.target.value)||0) })}
              style={{ width: 100 }}
            />
          )}
        </div>
      </div>

      {message && (
        <div className="mb-3 px-3 py-2 rounded"
             style={{ background: message.type==="success"?"#ecfdf5":"#fef2f2", color: message.type==="success"?"#065f46":"#991b1b",
                      border:`1px solid ${message.type==="success"?"#a7f3d0":"#fecaca"}` }}>
          {message.text}
        </div>
      )}

      {/* Cart lines with remove & qty */}
      <ul className="mb-4">
        {cart.map((c, i) => (
          <li key={i} className="flex items-center gap-2 mb-2">
            {c.imageUrl ? <img src={c.imageUrl} alt="" style={{ width:40, height:40, objectFit:"cover", borderRadius:6 }} /> : <div style={{ width:40, height:40, background:"#f3f4f6", borderRadius:6 }} />}
            <div className="flex-1">
              <div>{c.name} {c.size ? `(${c.size})` : ""}</div>
              <div className="text-sm text-gray-600">${c.unitPrice.toFixed(2)} each</div>
            </div>
            <div className="flex items-center gap-1">
              <button className="border rounded px-2" onClick={()=>inventoryStore.setCartQty(i, c.qty-1)}>-</button>
              <input className="border rounded px-2 py-1" style={{ width:56 }} type="number" value={c.qty}
                     onChange={(e)=>inventoryStore.setCartQty(i, Math.max(0, Number(e.target.value)||0))}/>
              <button className="border rounded px-2" onClick={()=>inventoryStore.setCartQty(i, c.qty+1)}>+</button>
            </div>
            <div style={{ width:90, textAlign:"right" }}>${(c.unitPrice*c.qty).toFixed(2)}</div>
            <button className="text-red-600 ml-2" onClick={()=>inventoryStore.removeCartLine(i)}>×</button>
          </li>
        ))}
      </ul>

      {/* totals */}
      <div className="mb-1">Subtotal: ${subtotalBefore.toFixed(2)}</div>
      {discount && <div className="mb-1">Discount: −${discountValue.toFixed(2)}</div>}
      <div className="mb-1">Tax: ${tax.toFixed(2)}</div>
      <div className="font-bold mb-4">Total: ${total.toFixed(2)}</div>

      {!cashMode ? (
        <div className="flex gap-3">
          <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={doCheckout}>Checkout</button>
          <button className="bg-green-600 text-white px-3 py-2 rounded" onClick={()=>setCashMode(true)}>Checkout with Cash</button>
        </div>
      ) : (
        <div className="border rounded p-4">
          <div className="mb-2 font-medium">Cash Checkout</div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <input type="number" step="0.01" className="border rounded px-2 py-1" value={cashGiven}
                   onChange={(e)=>setCashGiven(e.target.value)} placeholder={total.toFixed(2)} />
            <button className="border rounded px-2 py-1" onClick={()=>applyQuickCash(5)}>+$5</button>
            <button className="border rounded px-2 py-1" onClick={()=>applyQuickCash(10)}>+$10</button>
            <button className="border rounded px-2 py-1" onClick={()=>applyQuickCash(20)}>+$20</button>
            <button className="border rounded px-2 py-1" onClick={setExactCash}>Exact Cash</button>
          </div>
          <div className="mb-2">Change due: <strong>${validCash ? Math.max(0, changeDue).toFixed(2) : "0.00"}</strong></div>
          {cashShort && <div className="text-red-600 text-sm mb-2">Cash is less than total.</div>}
          <div className="flex gap-2">
            <button className="bg-green-600 text-white px-3 py-2 rounded" onClick={doCheckoutCash}>Confirm Cash Sale</button>
            <button className="border px-3 py-2 rounded" onClick={()=>{ setCashMode(false); setCashGiven(""); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
