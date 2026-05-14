import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import helmet from "helmet";
import rateLimit from "express-rate-limit";

import lessonRoute from "./routes/lesson.js";
import aiChatRoute from "./routes/aiChat.js";
import provisionRoute from "./routes/provisionSchool.js";
import resetPasswordRoute from "./routes/resetStaffPassword.js";

dotenv.config();

const app = express();

// ── Security Middleware ───────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// ── CORS ──────────────────────────────────────────────────────────
// In production, set CLIENT_ORIGIN to your Netlify URL.
// Multiple origins can be comma-separated:  https://a.netlify.app,https://yourdomain.com
const rawOrigins = process.env.CLIENT_ORIGIN || "*";
const allowedOrigins =
  rawOrigins === "*"
    ? "*"
    : rawOrigins.split(",").map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: allowedOrigins !== "*"
  })
);

// ── Body Parser ───────────────────────────────────────────────────
app.use(express.json());

// ── Health Check (Railway uses this) ─────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/*
|--------------------------------------------------------------------------
| RATE LIMITERS
|--------------------------------------------------------------------------
*/
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: "Too many API requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "AI request limit exceeded. Please wait before trying again." }
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: "Too many password reset attempts. Try again later." }
});

// ── Apply Global Limiter to all /api Routes ───────────────────────
app.use("/api", globalLimiter);

// ── API Routes ────────────────────────────────────────────────────
app.use("/api", lessonRoute);
app.use("/api", aiLimiter, aiChatRoute);
app.use("/api", provisionRoute);
app.use("/api", passwordResetLimiter, resetPasswordRoute);

// ── 404 for unknown routes ────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Start Server ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`EduTrack backend running on port ${PORT}`);
  console.log(`CORS origin: ${rawOrigins}`);
});
