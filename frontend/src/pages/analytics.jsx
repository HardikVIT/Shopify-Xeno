import { useEffect, useState } from "react";

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => res.json())
      .then(setData)
      .catch((err) => console.error(err));
  }, []);

  if (!data) {
    return <div className="card">Loading analytics…</div>;
  }

  return (
    <div className="card">
      <h3>Analytics</h3>
      <ul>
        <li>Total sessions: {data.sessions}</li>
        <li>Conversion rate: {data.conversionRate}%</li>
        <li>Revenue: ${data.revenue}</li>
      </ul>
    </div>
  );
}
