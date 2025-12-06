import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useEffect } from "react";

export default function Layout({ children }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const shop = searchParams.get("shop");

  const API_BASE =
    import.meta.env.VITE_API_URL || window.location.origin;

  // ✅ Auto-auth check
  useEffect(() => {
    if (!shop) return; // If opened outside Shopify, skip

    async function checkAuth() {
      try {
        const res = await fetch(`${API_BASE}/api/check-auth?shop=${shop}`);
        const data = await res.json();

        console.log("🔍 Auth status:", data);

        if (!data.authenticated) {
          console.log("⚠️ Not authenticated → Redirecting to /auth");

          // Shopify requires redirect at top window level
          window.top.location.href = `${API_BASE}/auth?shop=${shop}`;
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    }

    checkAuth();
  }, [shop]);

  const navLink = (to, label, primary = false) => {
    const isActive = location.pathname === to;
    const baseClass =
      "btn" +
      (primary ? "" : " secondary") +
      (isActive ? " active" : "");

    return (
      <Link
        key={to}
        className={baseClass}
        to={`${to}?shop=${encodeURIComponent(shop || "")}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="app-body">
      <div className="container">

        <header className="app-header">
          <div>
            <h1>Harry-Xeno Dashboard</h1>
            <h2>Store: {shop || "Unknown Store"}</h2>
          </div>
        </header>

        <div className="card">
          <div className="section-title">Quick navigation</div>
          <p className="small">
            Choose what you want to view or sync for this store.
          </p>

          <div className="btn-row">
            {navLink("/", "Home", true)}
            {navLink("/analytics", "Analytics")}
            {navLink("/products", "Products")}
            {navLink("/customers", "Customers")}
            {navLink("/orders", "Orders")}
          </div>
        </div>

        <main style={{ marginTop: 16 }}>{children}</main>
      </div>
    </div>
  );
}
