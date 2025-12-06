import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Orders.css"; // ⬅️ Add this line

const Orders = () => {
  const query = new URLSearchParams(window.location.search);
  const shop = query.get("shop");

  const API_BASE =
    import.meta.env.VITE_API_URL || window.location.origin;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE}/api/orders?shop=${shop}`
      );
      setOrders(response.data);
    } catch (err) {
      console.log("❌ Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h2>Orders for {shop}</h2>
        <button className="refresh-btn" onClick={fetchOrders}>
          Refresh Orders
        </button>
      </div>

      {loading && <p className="loading">Loading...</p>}

      {!loading && orders.length === 0 && (
        <p className="no-orders">No orders found.</p>
      )}

      {orders.length > 0 && (
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Order Name</th>
              <th>Product Name</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Total</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr key={order.order_id}>
                <td>{order.order_id}</td>
                <td>{order.order_name}</td>
                <td>{order.product_name}</td>
                <td>{order.customer_name}</td>
                <td>{order.customer_email}</td>
                <td>${Number(order.total_price).toFixed(2)}</td>
                <td>
                  <span className={`status-badge ${order.status}`}>
                    {order.status}
                  </span>
                </td>
                <td>{new Date(order.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Orders;
