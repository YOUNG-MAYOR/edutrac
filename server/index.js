import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import helmet from "helmet";
import rateLimit from "express-rate-limit";

import lessonRoute from "./routes/lesson.js";
import aiChatRoute from "./routes/aiChat.js";
import provisionRoute from "./routes/provisionSchool.js";
import resetPasswordRoute from "./routes/resetStaffPassword.js";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientDir = path.join(__dirname, "..", "client");

// ── Startup Check ─────────────────────────────────────────────────
const indexFile = path.join(clientDir, "index.html");

console.log("Client dir :", clientDir);
console.log("index.html exists:", fs.existsSync(indexFile));

// ── Security Middleware ───────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// ── CORS ──────────────────────────────────────────────────────────
app.use(
  cors({
    origin: "*"
  })
);

// ── Body Parser ───────────────────────────────────────────────────
app.use(express.json());

/*
|--------------------------------------------------------------------------
| GLOBAL API LIMITER
|--------------------------------------------------------------------------
*/
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: "Too many API requests. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false
});

/*
|--------------------------------------------------------------------------
| AI REQUEST LIMITER
|--------------------------------------------------------------------------
*/
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "AI request limit exceeded. Please wait before trying again."
  }
});

/*
|--------------------------------------------------------------------------
| PASSWORD RESET LIMITER
|--------------------------------------------------------------------------
*/
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Too many password reset attempts. Try again later."
  }
});

// ── Apply Global API Limiter ONLY to API Routes ──────────────────
app.use("/api", globalLimiter);

// ── API Routes ────────────────────────────────────────────────────

// Lesson routes
app.use("/api", lessonRoute);

// AI routes protected with stricter limiter
app.use("/api", aiLimiter, aiChatRoute);

// School provisioning routes
app.use("/api", provisionRoute);

// Password reset routes protected heavily
app.use("/api", passwordResetLimiter, resetPasswordRoute);

// ── Static Frontend Files ─────────────────────────────────────────
app.use(express.static(clientDir));

// ── Explicit Root Route ───────────────────────────────────────────
app.get("/", (_req, res) => {
  res.sendFile(indexFile);
});

// ── SPA Fallback Route ────────────────────────────────────────────
app.use((_req, res) => {
  res.sendFile(indexFile);
});

// ── Start Server ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});