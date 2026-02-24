import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth.js";
import platformRoutes from "./routes/platforms.js";
import dashboardRoutes from "./routes/dashboard.js";
import earningsRoutes from "./routes/earnings.js";
import shiftRoutes from "./routes/shifts.js";
import hubRoutes from "./routes/hubs.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// ─── Middleware ──────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
}));
app.use(express.json());
app.use(morgan("dev"));

// ─── Health Check ───────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "deliverybridge-api", version: "0.1.0" });
});

// ─── Routes ─────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/platforms", platformRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/earnings", earningsRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/hubs", hubRoutes);

// ─── 404 Handler ────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Error Handler ──────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start ──────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`DeliveryBridge API running on port ${PORT}`);
});

export default app;
