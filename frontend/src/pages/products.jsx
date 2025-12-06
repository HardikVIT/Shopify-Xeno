import { useEffect, useState } from "react";
import "./Products.css";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const SHOP = new URLSearchParams(window.location.search).get("shop");

  useEffect(() => {
    if (!SHOP) {
      setError("Missing shop context — open from Shopify admin.");
      setLoading(false);
      return;
    }

    async function fetchProducts() {
      try {
        const res = await fetch(`/api/products?shop=${SHOP}`);
        if (!res.ok) throw new Error("Shop not authorized or API error");

        const data = await res.json();
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [SHOP]);

  return (
    <div className="products-container">
      <h3 className="products-title">Products</h3>

      {loading && <p className="products-loading">⏳ Loading products...</p>}

      {error && <p className="products-error">{error}</p>}

      {!loading && products.length === 0 && (
        <p className="products-empty">No products found.</p>
      )}

      {!loading && products.length > 0 && (
        <div className="products-grid">
          {products.map(({ node }) => {
            const image =
              node?.images?.edges?.[0]?.node?.transformedSrc ||
              node?.images?.edges?.[0]?.node?.src ||
              null;

            const price =
              node?.variants?.edges?.[0]?.node?.price ??
              "N/A";

            return (
              <div key={node.id} className="product-card">
                {image && (
                  <img
                    className="product-image"
                    src={image}
                    alt={node.title}
                  />
                )}

                <h4 className="product-title">{node.title}</h4>

                <p className="product-price">₹{price}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
