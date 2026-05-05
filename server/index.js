import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import lessonRoute        from "./routes/lesson.js";
import aiChatRoute        from "./routes/aiChat.js";
import provisionRoute     from "./routes/provisionSchool.js";
import resetPasswordRoute from "./routes/resetStaffPassword.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const clientDir  = path.join(__dirname, "..", "client");

// ── Startup check ─────────────────────────────────────────────────
const indexFile = path.join(clientDir, "index.html");
console.log("Client dir :", clientDir);
console.log("index.html exists:", fs.existsSync(indexFile));

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());

// ── API Routes ────────────────────────────────────────────────────
app.use("/api", lessonRoute);
app.use("/api", aiChatRoute);
app.use("/api", provisionRoute);
app.use("/api", resetPasswordRoute);

// ── Static files ──────────────────────────────────────────────────
app.use(express.static(clientDir));

// ── Explicit root ─────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.sendFile(indexFile);
});

// ── Fallback ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.sendFile(indexFile);
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});