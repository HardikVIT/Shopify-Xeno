import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Chart } from "chart.js/auto";

const Analytics = () => {
  const query = new URLSearchParams(window.location.search);
  const shop = query.get("shop");

  const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;

  const [analytics, setAnalytics] = useState(null);

  // Chart instance references
  const customerChartRef = useRef(null);
  const dailyChartRef = useRef(null);

  // 1️⃣ Fetch analytics
  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const res = await axios.get(`${API_BASE}/api/analytics?shop=${shop}`);
    setAnalytics(res.data);
  };

  // 2️⃣ Render charts ONLY when analytics is loaded AND canvas exists
  useEffect(() => {
    if (!analytics) return;

    // Destroy previous charts
    if (customerChartRef.current) customerChartRef.current.destroy();
    if (dailyChartRef.current) dailyChartRef.current.destroy();

    const customerCanvas = document.getElementById("customerChart");
    const dailyCanvas = document.getElementById("dailyChart");

    if (!customerCanvas || !dailyCanvas) return;

    // Revenue per Customer chart
    customerChartRef.current = new Chart(customerCanvas, {
      type: "bar",
      data: {
        labels: analytics.revenueByCustomer.map((c) => c.customer_name),
        datasets: [
          {
            label: "Total Revenue",
            data: analytics.revenueByCustomer.map((c) => c.total_spent),
            backgroundColor: "rgba(75, 192, 255, 0.6)",
            borderColor: "rgba(75, 192, 255, 1)",
            borderWidth: 2,
          },
        ],
      },
    });

    // Orders per Day chart
    dailyChartRef.current = new Chart(dailyCanvas, {
      type: "line",
      data: {
        labels: analytics.ordersPerDay.map((d) => d.day),
        datasets: [
          {
            label: "Orders per Day",
            data: analytics.ordersPerDay.map((d) => d.orders),
            borderColor: "rgba(255, 99, 132, 1)",
            fill: false,
            tension: 0.3,
            borderWidth: 2,
          },
        ],
      },
    });
  }, [analytics]); // Re-run when analytics is loaded

  if (!analytics) return <p>Loading analytics...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Analytics Dashboard</h2>

      {/* Summary Cards */}
      <div style={{
        display: "flex",
        gap: "20px",
        marginTop: "20px"
      }}>
        <div style={cardStyle}>
          <h3>Total Orders</h3>
          <p style={valueStyle}>{analytics.totalOrders}</p>
        </div>

        <div style={cardStyle}>
          <h3>Total Customers</h3>
          <p style={valueStyle}>{analytics.totalCustomers}</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <h3 style={{ marginTop: "40px" }}>Revenue per Customer</h3>
      <canvas id="customerChart" height="100"></canvas>

      {/* Orders Chart */}
      <h3 style={{ marginTop: "40px" }}>Orders per Day</h3>
      <canvas id="dailyChart" height="100"></canvas>
    </div>
  );
};

const cardStyle = {
  padding: "20px",
  background: "white",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  width: "200px",
  textAlign: "center",
};

const valueStyle = {
  fontSize: "28px",
  fontWeight: "bold",
  marginTop: "10px"
};

export default Analytics;
