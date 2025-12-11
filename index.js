import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import path from "path";
import fs from "fs";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const SCOPES = process.env.SCOPES;
const APP_URL = process.env.APP_URL;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/webhooks/orders/create", express.raw({ type: "application/json" }));
app.use(express.json());


// -----------------------------------------------
// MYSQL (Aiven) CONNECTION
// -----------------------------------------------

let sslConfig = undefined;

if (process.env.DB_SSL) {
  console.log("🔐 Loading SSL certificate:", process.env.DB_SSL);
  sslConfig = { ca: fs.readFileSync(process.env.DB_SSL) };
} else {
  console.warn("⚠ WARNING: DB_SSL not set — SSL disabled.");
}

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: sslConfig
});


// Tables
await db.execute(`
  CREATE TABLE IF NOT EXISTS shop_tokens (
    shop VARCHAR(255) PRIMARY KEY,
    access_token TEXT NOT NULL
  )
`);

await db.execute(`
  CREATE TABLE IF NOT EXISTS shop_orders (
    shop VARCHAR(255),
    order_id VARCHAR(255) PRIMARY KEY,
    order_name VARCHAR(255),
    product_name VARCHAR(255),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    total_price DECIMAL(10,2),
    created_at DATETIME,
    status VARCHAR(255)
  )
`);

async function saveToken(shop, token) {
  await db.execute(
    `REPLACE INTO shop_tokens (shop, access_token) VALUES (?, ?)`,
    [shop, token]
  );
}

async function getToken(shop) {
  const [rows] = await db.execute(
    `SELECT access_token FROM shop_tokens WHERE shop = ?`,
    [shop]
  );
  return rows.length ? rows[0].access_token : null;
}

// -----------------------------------------------
// AUTH
// -----------------------------------------------
app.get("/auth", (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).send("Missing shop param");

  const redirectUri = `${APP_URL}/auth/callback`;

  const installUrl =
    `https://${shop}/admin/oauth/authorize?client_id=${API_KEY}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.redirect(installUrl);
});

app.get("/api/check-auth", async (req, res) => {
  const shop = req.query.shop;
  if (!shop) return res.json({ authenticated: false });

  const token = await getToken(shop);
  res.json({ authenticated: !!token });
});

app.get("/auth/callback", async (req, res) => {
  const { shop, code } = req.query;
  if (!shop || !code) return res.status(400).send("Invalid OAuth params");

  try {
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;

    const { data } = await axios.post(tokenUrl, {
      client_id: API_KEY,
      client_secret: API_SECRET,
      code,
    });

    await saveToken(shop, data.access_token);
    console.log("✔ Token stored for:", shop);

    res.redirect(`/?shop=${shop}`);
  } catch (err) {
    console.error("OAuth error:", err.response?.data || err);
    res.status(500).send("Auth failed");
  }
});

// -----------------------------------------------
// PRODUCTS API
// -----------------------------------------------
app.get("/api/products", async (req, res) => {
  const shop = req.query.shop;

  console.log("📦 Products requested by:", shop);

  if (!shop) return res.status(400).json({ error: "Missing shop parameter" });

  const token = await getToken(shop);
  if (!token) return res.status(403).json({ error: "Install app first" });

  const query = `
  {
    products(first: 20) {
      edges {
        node {
          id
          title
          images(first: 1) {
            edges { node { transformedSrc(maxWidth: 400) } }
          }
          variants(first: 1) {
            edges { node { price } }
          }
        }
      }
    }
  }
  `;

  try {
    const response = await axios.post(
      `https://${shop}/admin/api/2024-10/graphql.json`,
      { query },
      {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data.data.products.edges);
  } catch (err) {
    console.log("Product API Error:", err.response?.data || err);
    res.status(500).json({ error: "Products fetch failed" });
  }
});

// -----------------------------------------------
// ORDER WEBHOOK 
// -----------------------------------------------
app.post("/webhooks/orders/create", async (req, res) => {
  try {
    console.log("\n🔔 --- WEBHOOK FIRED ---");

    const shop = req.get("X-Shopify-Shop-Domain");
    console.log("🏪 Shop:", shop);

    const rawBody = req.body; // Buffer from express.raw
    console.log("📨 Body is Buffer:", rawBody instanceof Buffer);

    const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
    const webhookSecretHex = process.env.SHOPIFY_WEBHOOK_SECRET;

    let generatedHash = "";
    if (webhookSecretHex) {
      const secretBuf = Buffer.from(webhookSecretHex, "hex");
      generatedHash = crypto
        .createHmac("sha256", secretBuf)
        .update(rawBody)
        .digest("base64");
    }

    console.log("🔐 HMAC Shopify  :", hmacHeader);
    console.log("🔐 HMAC Generated:", generatedHash || "(no secret set)");


    const order = JSON.parse(rawBody.toString("utf8"));
    console.log("📦 Order ID:", order.id);

    await db.execute(
      `INSERT INTO shop_orders
        (shop, order_id, order_name, product_name, customer_name, customer_email, total_price, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         total_price = VALUES(total_price),
         status = VALUES(status),
         product_name = VALUES(product_name),
         order_name = VALUES(order_name)
      `,
      [
        shop,
        order.id,
        order.name, 
        order.line_items?.[0]?.title || "Unknown Product",
        `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim(),
        order.customer?.email || "",
        order.total_price,
        order.created_at,
        order.financial_status,
      ]
    );

    console.log("✅ SAVED TO DB");
    res.status(200).send("OK");
  } catch (err) {
    console.error("🔥 Webhook error:", err);
    res.status(500).send("Webhook Error");
  }
});

// -----------------------------------------------
// GET ORDERS API
// -----------------------------------------------
app.get("/api/orders", async (req, res) => {
  try {
    const shop = req.query.shop;

    const [rows] = await db.execute(
      "SELECT * FROM shop_orders WHERE shop = ? ORDER BY created_at DESC",
      [shop]
    );

    res.json(rows);
  } catch (err) {
    console.error("Orders API Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// -----------------------------------------------
// CUSTOMERS API (GROUPED ORDERS)
// -----------------------------------------------
app.get("/api/customers", async (req, res) => {
  try {
    const shop = req.query.shop;

    if (!shop) {
      return res.status(400).json({ error: "Missing shop parameter" });
    }

    const [rows] = await db.execute(
      `
      SELECT 
        customer_name,
        customer_email,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'order_id', order_id,
            'order_name', order_name,
            'product_name', product_name,
            'total_price', total_price,
            'status', status,
            'created_at', created_at
          )
        ) AS orders
      FROM shop_orders
      WHERE shop = ?
      GROUP BY customer_email, customer_name
      ORDER BY customer_name;
      `,
      [shop]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ Customer API Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// -----------------------------------------------
// ANALYTICS API
// -----------------------------------------------
app.get("/api/analytics", async (req, res) => {
  try {
    const shop = req.query.shop;

    if (!shop) {
      return res.status(400).json({ error: "Missing shop parameter" });
    }

    const [[totalOrders]] = await db.execute(
      "SELECT COUNT(*) AS total_orders FROM shop_orders WHERE shop = ?",
      [shop]
    );
    const [[totalCustomers]] = await db.execute(
      "SELECT COUNT(DISTINCT customer_email) AS total_customers FROM shop_orders WHERE shop = ?",
      [shop]
    );
    const [revenueByCustomer] = await db.execute(
      `
      SELECT 
        customer_name,
        customer_email,
        SUM(total_price) AS total_spent
      FROM shop_orders
      WHERE shop = ?
      GROUP BY customer_email, customer_name
      ORDER BY total_spent DESC
      `,
      [shop]
    );

    const [ordersPerDay] = await db.execute(
      `
      SELECT 
        DATE(created_at) AS day,
        COUNT(*) AS orders
      FROM shop_orders
      WHERE shop = ?
      GROUP BY DATE(created_at)
      ORDER BY day ASC
      `,
      [shop]
    );

    return res.json({
      totalOrders: totalOrders.total_orders,
      totalCustomers: totalCustomers.total_customers,
      revenueByCustomer,
      ordersPerDay,
    });
  } catch (err) {
    console.error("❌ Analytics API Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// -----------------------------------------------
// FRONTEND BUILD
// -----------------------------------------------
const dist = path.join(__dirname, "frontend", "dist");
app.use(express.static(dist));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/auth")) {
    return next();
  }
  res.sendFile(path.join(dist, "index.html"));
});

// -----------------------------------------------
// START SERVER
// -----------------------------------------------
app.listen(PORT, () =>
  console.log(`🚀 Server running → ${APP_URL} or http://localhost:${PORT}`)
);
