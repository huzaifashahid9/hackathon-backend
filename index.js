import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import reportRoutes from "./src/routes/reportRoutes.js";
import vitalsRoutes from "./src/routes/vitalsRoutes.js";
import contactRoutes from "./src/routes/contactRoutes.js";

const app = express();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const CLIENT_URL =
  process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = [CLIENT_URL];
      if (allowed.includes(origin)) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.json({ 
    message: "💚 HealthMate API - Sehat ka Smart Dost", 
    version: "1.0",
    endpoints: {
      auth: "/api/auth",
      reports: "/api/reports",
      vitals: "/api/vitals",
      contact: "/api/contact"
    }
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/vitals", vitalsRoutes);
app.use("/api/contact", contactRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

connectDB();
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

export default app;
