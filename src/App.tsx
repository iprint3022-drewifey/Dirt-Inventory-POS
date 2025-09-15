import React, { useState } from "react";
import POSPage from "./pages/POS";
import ProductsPage from "./pages/Products";
import CheckoutPage from "./pages/Checkout";
import ReportsPage from "./pages/Reports";

export default function App() {
  const [page, setPage] = useState<"pos" | "inventory" | "checkout" | "reports">("pos");

  return (
    <div>
      <nav style={{ display: "flex", gap: 12, padding: 12, borderBottom: "1px solid #eee", background: "#f7f7f7" }}>
        <button onClick={() => setPage("pos")}>POS</button>
        <button onClick={() => setPage("inventory")}>Products</button>
        <button onClick={() => setPage("checkout")}>Checkout</button>
        <button onClick={() => setPage("reports")}>Reports</button>
      </nav>
      <main style={{ padding: 16 }}>
        {page === "pos" && <POSPage />}
        {page === "inventory" && <ProductsPage />}
        {page === "checkout" && <CheckoutPage />}
        {page === "reports" && <ReportsPage />}
      </main>
    </div>
  );
}
