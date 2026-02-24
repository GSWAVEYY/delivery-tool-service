import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./lib/env.js";
import { errorHandler } from "./lib/errors.js";
import authRoutes from "./routes/auth.js";
import platformRoutes from "./routes/platforms.js";
import dashboardRoutes from "./routes/dashboard.js";
import earningsRoutes from "./routes/earnings.js";
import shiftRoutes from "./routes/shifts.js";
import hubRoutes from "./routes/hubs.js";

const app = express();

// ─── Security & Parsing ─────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// ─── Rate Limiting ──────────────────────────────────────────

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later" },
});

// ─── Logging ────────────────────────────────────────────────

if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ─── Health Check ───────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "deliverybridge-api", version: "0.1.0" });
});

// ─── Routes ─────────────────────────────────────────────────

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/platforms", apiLimiter, platformRoutes);
app.use("/api/dashboard", apiLimiter, dashboardRoutes);
app.use("/api/earnings", apiLimiter, earningsRoutes);
app.use("/api/shifts", apiLimiter, shiftRoutes);
app.use("/api/hubs", apiLimiter, hubRoutes);

// ─── 404 ────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Centralized Error Handler ──────────────────────────────

app.use(errorHandler);

// ─── Start (only when run directly, not imported for tests) ─

if (env.NODE_ENV !== "test") {
  app.listen(env.PORT, () => {
    console.log(`DeliveryBridge API running on port ${env.PORT}`); // eslint-disable-line no-console
  });
}

export default app;
