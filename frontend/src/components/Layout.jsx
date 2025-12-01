import { Link, useLocation, useSearchParams } from "react-router-dom";

export default function Layout({ children }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const shop = searchParams.get("shop") || "Your Store";

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
        to={`${to}?shop=${encodeURIComponent(shop)}`}
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
            <h2>Store: {shop}</h2>
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
            {navLink("/sync", "Sync Data")}
          </div>
        </div>

        <main style={{ marginTop: 16 }}>{children}</main>
      </div>
    </div>
  );
}
