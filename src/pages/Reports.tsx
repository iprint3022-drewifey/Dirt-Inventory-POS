// src/pages/Reports.tsx
import { useMemo, useState, useEffect } from "react";
import { inventoryStore } from "../store";

type RangePreset = "today" | "yesterday" | "last7" | "month" | "custom";

type LineAgg = {
  key: string;
  name: string;
  size?: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
};

type Totals = {
  subtotal: number;
  tax: number;
  total: number;
  cogs: number;
  profit: number;
};

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function yyyy_mm_dd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function startOfMonth(d: Date) { return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1)); }
function getPresetRange(preset: RangePreset): { start: Date; end: Date } {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  if (preset === "today") return { start: todayStart, end: todayEnd };
  if (preset === "yesterday") { const y = new Date(now); y.setDate(now.getDate() - 1); return { start: startOfDay(y), end: endOfDay(y) }; }
  if (preset === "last7") { const start = new Date(now); start.setDate(now.getDate() - 6); return { start: startOfDay(start), end: todayEnd }; }
  return { start: startOfMonth(now), end: todayEnd };
}

export default function ReportsPage() {
  const [preset, setPreset] = useState<RangePreset>("today");
  const initial = getPresetRange("today");
  const [start, setStart] = useState<string>(yyyy_mm_dd(initial.start));
  const [end, setEnd] = useState<string>(yyyy_mm_dd(initial.end));

  useEffect(() => {
    if (preset !== "custom") {
      const r = getPresetRange(preset);
      setStart(yyyy_mm_dd(r.start));
      setEnd(yyyy_mm_dd(r.end));
    }
  }, [preset]);

  const txns = inventoryStore.getTransactions?.() ?? [];

  const { totals, lines, topSellers } = useMemo(() => {
    let startDate = new Date(start + "T00:00:00");
    let endDate = new Date(end + "T23:59:59");
    if (isNaN(startDate.getTime())) startDate = startOfDay(new Date());
    if (isNaN(endDate.getTime())) endDate = endOfDay(new Date());

    const wanted = txns.filter((t: any) => {
      const ts = new Date(t.timestamp);
      return ts >= startDate && ts <= endDate;
    });

    const totals: Totals = { subtotal: 0, tax: 0, total: 0, cogs: 0, profit: 0 };
    const lineMap = new Map<string, LineAgg>();

    for (const t of wanted) {
      const subtotal = Number(t.subtotal || 0);
      const tax = Number(t.tax || 0);
      const total = Number(t.total || 0);
      totals.subtotal += subtotal;
      totals.tax += tax;
      totals.total += total;

      for (const l of (t.lines || [])) {
        const qty = Number(l.qty || 0);
        const unitPrice = Number(l.unitPrice || 0);
        const unitCost = Number(l.unitCost || 0);
        const revenue = unitPrice * qty;
        const cost = unitCost * qty;
        totals.cogs += cost;

        const key = `${l.name ?? "Item"}|${l.size ?? ""}`;
        const existing = lineMap.get(key);
        if (existing) {
          existing.qty += qty;
          existing.revenue += revenue;
          existing.cost += cost;
          existing.profit += revenue - cost;
        } else {
          lineMap.set(key, {
            key,
            name: String(l.name || "Item"),
            size: l.size,
            qty,
            revenue,
            cost,
            profit: revenue - cost,
          });
        }
      }
    }

    totals.profit = totals.subtotal - totals.cogs;

    const lines = Array.from(lineMap.values()).sort((a, b) => b.revenue - a.revenue);
    const topSellers = lines.slice(0, 5);

    return { totals, lines, topSellers };
  }, [txns, start, end]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Reports</h1>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="text-sm">Range:</label>
        <select className="border rounded px-2 py-1" value={preset} onChange={(e) => setPreset(e.target.value as RangePreset)}>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last7">Last 7 Days</option>
          <option value="month">This Month</option>
          <option value="custom">Custom</option>
        </select>

        <label className="flex items-center gap-2">
          <span className="text-sm" style={{ width: 50 }}>Start</span>
          <input type="date" className="border rounded px-2 py-1" value={start} onChange={(e) => { setStart(e.target.value); setPreset("custom"); }} />
        </label>

        <label className="flex items-center gap-2">
          <span className="text-sm" style={{ width: 50 }}>End</span>
          <input type="date" className="border rounded px-2 py-1" value={end} onChange={(e) => { setEnd(e.target.value); setPreset("custom"); }} />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3 mb-6">
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">Gross Sales (Subtotal)</div>
          <div className="text-2xl font-semibold">${fmt(totals.subtotal)}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">Tax Collected</div>
          <div className="text-2xl font-semibold">${fmt(totals.tax)}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">Grand Total</div>
          <div className="text-2xl font-semibold">${fmt(totals.total)}</div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 mb-6">
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">COGS (Our Cost)</div>
          <div className="text-2xl font-semibold">${fmt(totals.cogs)}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">Profit (Subtotal − COGS)</div>
          <div className="text-2xl font-semibold">${fmt(totals.profit)}</div>
        </div>
      </div>

      <div className="border rounded p-3 mb-6">
        <div className="font-semibold mb-2">Top Sellers (by Revenue)</div>
        {topSellers.length === 0 ? (
          <div className="text-sm text-gray-500">No sales in this range.</div>
        ) : (
          <ol className="text-sm list-decimal ml-5">
            {topSellers.map((l) => (
              <li key={l.key} className="py-1">
                <span className="font-medium">{l.name}</span>
                {l.size ? <span> ({l.size})</span> : null}
                <span> — ${fmt(l.revenue)} · {l.qty} sold</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="border rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b bg-gray-50">
              <th className="py-2 px-3">Item</th>
              <th className="py-2 px-3">Size</th>
              <th className="py-2 px-3">Qty</th>
              <th className="py-2 px-3">Revenue</th>
              <th className="py-2 px-3">Cost</th>
              <th className="py-2 px-3">Profit</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  No sales for this range.
                </td>
              </tr>
            )}
            {lines.map((l) => (
              <tr key={l.key} className="border-b">
                <td className="py-2 px-3">{l.name}</td>
                <td className="py-2 px-3">{l.size ?? "—"}</td>
                <td className="py-2 px-3">{l.qty}</td>
                <td className="py-2 px-3">${fmt(l.revenue)}</td>
                <td className="py-2 px-3">${fmt(l.cost)}</td>
                <td className="py-2 px-3">${fmt(l.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Profit shown is pre-tax (Subtotal − COGS). Tax is reported separately.
      </p>
    </div>
  );
}
