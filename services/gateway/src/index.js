import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";
import logger from "./config/logger.js";

const app = express();
const PORT = process.env.PORT || 4000;

const CATALOG_URL =
  process.env.CATALOG_SERVICE_URL || "http://catalog-service:4001";
const PROCUREMENT_URL =
  process.env.PROCUREMENT_SERVICE_URL || "http://procurement-service:4002";

// ── Middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));

// ── Rate limiting (simple in-memory token bucket) ──
const rateLimit = new Map();
app.use((req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const window = 60_000; // 1 minute
  const maxRequests = 200;

  const entry = rateLimit.get(ip) || { count: 0, resetAt: now + window };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + window;
  }
  entry.count++;
  rateLimit.set(ip, entry);

  if (entry.count > maxRequests) {
    return res.status(429).json({ error: "Too many requests" });
  }
  next();
});

// ── Health check ───────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ status: "healthy", gateway: true }),
);

// ── Proxy routes ───────────────────────────────────
//
// IMPORTANT: We use pathFilter instead of Express mount paths.
//
// Why? When you write app.use('/api/catalog', proxy), Express STRIPS
// the mount prefix before passing the request to the middleware.
// So /api/catalog/items becomes just /items — which breaks the proxy
// because the catalog service expects /api/catalog/items.
//
// pathFilter tells http-proxy-middleware v3 to match the path itself
// WITHOUT Express stripping anything. The full URL is preserved.

app.use(
  createProxyMiddleware({
    target: CATALOG_URL,
    pathFilter: "/api/catalog/**",
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        logger.info(
          { method: req.method, path: req.url, target: CATALOG_URL },
          "Proxying to catalog",
        );
      },
      error: (err, _req, res) => {
        logger.error({ err }, "Catalog service proxy error");
        if (!res.headersSent) {
          res.status(502).json({ error: "Catalog service unavailable" });
        }
      },
    },
  }),
);

app.use(
  createProxyMiddleware({
    target: PROCUREMENT_URL,
    pathFilter: "/api/procurement/**",
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        logger.info(
          { method: req.method, path: req.url, target: PROCUREMENT_URL },
          "Proxying to procurement",
        );
      },
      error: (err, _req, res) => {
        logger.error({ err }, "Procurement service proxy error");
        if (!res.headersSent) {
          res.status(502).json({ error: "Procurement service unavailable" });
        }
      },
    },
  }),
);

// ── Start ──────────────────────────────────────────
app.listen(PORT, () => logger.info(`API Gateway listening on :${PORT}`));
