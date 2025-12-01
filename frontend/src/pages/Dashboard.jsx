import { useSearchParams } from "react-router-dom";

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const shop = searchParams.get("shop") || "Your Store";

  return (
    <div className="card">
      <h3>Welcome 👋</h3>
      <p>
        This is the main dashboard for <strong>{shop}</strong>.
      </p>
      <p className="small">
        Use the quick navigation above to view analytics, products, customers,
        orders, or sync data from Shopify.
      </p>
    </div>
  );
}
