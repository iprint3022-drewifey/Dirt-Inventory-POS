import { useEffect, useMemo, useState } from "react";
import { inventoryStore } from "../store";

type RangePreset = "today" | "yesterday" | "last7" | "month" | "custom";

type LineAgg = { key:string; name:string; size?:string; qty:number; revenue:number; cost:number; profit:number; };
type Totals = { subtotal:number; tax:number; total:number; cogs:number; profit:number; cash:number; card:number; };

function fmt(n:number){ return n.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}); }
function yyyy_mm_dd(d:Date){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,"0"); const day=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
const sod=(d:Date)=>{ const x=new Date(d); x.setHours(0,0,0,0); return x; };
const eod=(d:Date)=>{ const x=new Date(d); x.setHours(23,59,59,999); return x; };
const som=(d:Date)=>sod(new Date(d.getFullYear(), d.getMonth(), 1));
function getPreset(p:RangePreset){ const now=new Date(); const todayS=sod(now), todayE=eod(now);
  if(p==="today") return {start:todayS, end:todayE};
  if(p==="yesterday"){ const y=new Date(now); y.setDate(now.getDate()-1); return {start:sod(y), end:eod(y)};}
  if(p==="last7"){ const s=new Date(now); s.setDate(now.getDate()-6); return {start:sod(s), end:todayE}; }
  return {start:som(now), end:todayE};
}

export default function ReportsPage(){
  const [preset,setPreset]=useState<RangePreset>("today");
  const initial=getPreset("today");
  const [start,setStart]=useState(yyyy_mm_dd(initial.start));
  const [end,setEnd]=useState(yyyy_mm_dd(initial.end));

  useEffect(()=>{ if(preset!=="custom"){ const r=getPreset(preset); setStart(yyyy_mm_dd(r.start)); setEnd(yyyy_mm_dd(r.end)); } },[preset]);

  const txns = inventoryStore.getTransactions?.() ?? [];

  const { totals, lines, topSellers } = useMemo(()=>{
    let s=new Date(start+"T00:00:00"), e=new Date(end+"T23:59:59");
    if(isNaN(s.getTime())) s=sod(new Date());
    if(isNaN(e.getTime())) e=eod(new Date());
    const wanted = txns.filter((t:any)=>{ const ts=new Date(t.timestamp); return ts>=s && ts<=e; });

    const totals:Totals = { subtotal:0,tax:0,total:0,cogs:0,profit:0, cash:0, card:0 };
    const lineMap = new Map<string,LineAgg>();

    for(const t of wanted){
      totals.subtotal += Number(t.subtotal||0);
      totals.tax      += Number(t.tax||0);
      totals.total    += Number(t.total||0);
      if(t.tender==="cash") totals.cash += Number(t.total||0);
      if(t.tender==="card") totals.card += Number(t.total||0);

      for(const l of (t.lines||[])){
        const qty=Number(l.qty||0), price=Number(l.unitPrice||0), cost=Number(l.unitCost||0);
        const revenue = price*qty, c = cost*qty;
        totals.cogs += c;

        const key = `${l.name??"Item"}|${l.size??""}`;
        const ex = lineMap.get(key);
        if(ex){ ex.qty+=qty; ex.revenue+=revenue; ex.cost+=c; ex.profit+=revenue-c; }
        else lineMap.set(key,{ key, name:String(l.name||"Item"), size:l.size, qty, revenue, cost:c, profit:revenue-c });
      }
    }

    totals.profit = totals.subtotal - totals.cogs;
    const lines = Array.from(lineMap.values()).sort((a,b)=>b.revenue-a.revenue);
    const topSellers = lines.slice(0,5);
    return { totals, lines, topSellers };
  },[txns,start,end]);

  function exportCsv(){
    const rows = [
      ["Item","Size","Qty","Revenue","Cost","Profit"],
      ...lines.map(l=>[l.name, l.size??"", String(l.qty), l.revenue.toFixed(2), l.cost.toFixed(2), l.profit.toFixed(2)])
    ];
    const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `report_${start}_to_${end}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Reports</h1>

      {/* Range controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="text-sm">Range:</label>
        <select className="border rounded px-2 py-1" value={preset} onChange={e=>setPreset(e.target.value as RangePreset)}>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last7">Last 7 Days</option>
          <option value="month">This Month</option>
          <option value="custom">Custom</option>
        </select>
        <label className="flex items-center gap-2">
          <span className="text-sm" style={{width:50}}>Start</span>
          <input type="date" className="border rounded px-2 py-1" value={start} onChange={e=>{ setStart(e.target.value); setPreset("custom"); }} />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm" style={{width:50}}>End</span>
          <input type="date" className="border rounded px-2 py-1" value={end} onChange={e=>{ setEnd(e.target.value); setPreset("custom"); }} />
        </label>

        <button className="border rounded px-3 py-2 ml-auto" onClick={exportCsv}>Export CSV</button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 md:grid-cols-3 mb-6">
        <div className="border rounded p-3"><div className="text-sm text-gray-500">Gross (Subtotal)</div><div className="text-2xl font-semibold">${fmt(totals.subtotal)}</div></div>
        <div className="border rounded p-3"><div className="text-sm text-gray-500">Tax</div><div className="text-2xl font-semibold">${fmt(totals.tax)}</div></div>
        <div className="border rounded p-3"><div className="text-sm text-gray-500">Grand Total</div><div className="text-2xl font-semibold">${fmt(totals.total)}</div></div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 mb-6">
        <div className="border rounded p-3"><div className="text-sm text-gray-500">COGS</div><div className="text-2xl font-semibold">${fmt(totals.cogs)}</div></div>
        <div className="border rounded p-3"><div className="text-sm text-gray-500">Profit (Subtotal − COGS)</div><div className="text-2xl font-semibold">${fmt(totals.profit)}</div></div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">Tender Breakdown</div>
          <div className="mt-1">Cash: <strong>${fmt(totals.cash)}</strong></div>
          <div>Card: <strong>${fmt(totals.card)}</strong></div>
        </div>
      </div>

      {/* Top Sellers */}
      <div className="border rounded p-3 mb-6">
        <div className="font-semibold mb-2">Top Sellers (by Revenue)</div>
        {topSellers.length===0 ? <div className="text-sm text-gray-500">No sales in this range.</div> :
          <ol className="text-sm list-decimal ml-5">
            {topSellers.map(l=><li key={l.key} className="py-1"><span className="font-medium">{l.name}</span>{l.size?` (${l.size})`:null} — ${fmt(l.revenue)} · {l.qty} sold</li>)}
          </ol>
        }
      </div>

      {/* Lines */}
      <div className="border rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b bg-gray-50">
              <th className="py-2 px-3">Item</th><th className="py-2 px-3">Size</th><th className="py-2 px-3">Qty</th>
              <th className="py-2 px-3">Revenue</th><th className="py-2 px-3">Cost</th><th className="py-2 px-3">Profit</th>
            </tr>
          </thead>
          <tbody>
            {lines.length===0 && <tr><td colSpan={6} className="py-6 text-center text-gray-500">No sales for this range.</td></tr>}
            {lines.map(l=>(
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

      <p className="text-xs text-gray-500 mt-3">Profit shown is pre-tax (Subtotal − COGS). Tax is reported separately.</p>
    </div>
  );
}
