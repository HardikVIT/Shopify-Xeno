// Customers.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Customers.css";   // ⬅️ add this

const Customers = () => {
  const query = new URLSearchParams(window.location.search);
  const shop = query.get("shop");

  const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;

  const [customers, setCustomers] = useState([]);

  const fetchCustomers = async () => {
    const res = await axios.get(`${API_BASE}/api/customers?shop=${shop}`);
    setCustomers(res.data);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <div className="customers-container">
      <div className="customers-header">
        <h2>Customers & Orders</h2>
        <p className="customers-subtitle">Shop: {shop}</p>
      </div>

      {customers.length === 0 && (
        <p className="customers-empty">No customers found yet.</p>
      )}

      {customers.map((c) => (
        <div key={c.customer_email} className="customer-card">
          <div className="customer-card-header">
            <div>
              <h3 className="customer-name">{c.customer_name || "Unknown"}</h3>
              <p className="customer-email">{c.customer_email || "No email"}</p>
            </div>
            <div className="customer-meta">
              <span className="meta-pill">
                Orders: {c.orders.length}
              </span>
            </div>
          </div>

          <ul className="order-list">
            {c.orders.map((o) => (
              <li key={o.order_id} className="order-item">
                <div className="order-main">
                  <span className="order-name">{o.order_name}</span>
                  <span className="order-product">{o.product_name}</span>
                </div>
                <div className="order-meta">
                  <span className="order-amount">₹{o.total_price}</span>
                  <span className={`order-status status-${(o.status || "").toLowerCase()}`}>
                    {o.status || "Unknown"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default Customers;
