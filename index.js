import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const SCOPES = process.env.SCOPES;
const APP_URL = process.env.APP_URL;

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse JSON for APIs
app.use(express.json());

// ---------------- OAuth Routes ----------------

app.get("/auth", (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).send("Missing shop");

  const redirectUri = `${APP_URL}/auth/callback`;

  const installUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${API_KEY}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.redirect(installUrl);
});

app.get("/auth/callback", async (req, res) => {
  const { shop, code } = req.query;
  if (!shop || !code) return res.status(400).send("Missing params");

  try {
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;

    const { data } = await axios.post(tokenUrl, {
      client_id: API_KEY,
      client_secret: API_SECRET,
      code,
    });

    const accessToken = data.access_token;

    // Save token in DB later

    res.redirect(`/?shop=${encodeURIComponent(shop)}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error getting access token");
  }
});

// ---------------- API Routes ----------------

app.get("/api/analytics", (req, res) => {
  res.json({
    sessions: 1000,
    orders: 50,
    conversionRate: 5,
  });
});

app.get("/api/shop-info", (req, res) => {
  res.json({ shop: "Demo-Shop", status: "OK" });
});

// ---------------- Serve React build ----------------

// dist folder path
const dist = path.join(__dirname, "frontend", "dist");
app.use(express.static(dist));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/auth")) {
    return next();
  }
  res.sendFile(path.join(dist, "index.html"));
});

// ---------------- Start Server ----------------

app.listen(PORT, () => {
  console.log(`Server live at http://localhost:${PORT}`);
});
