/**
 * EduTrack NG — AI Chat Proxy Route
 * POST /api/ai-chat
 *
 * Keeps the Anthropic API key server-side.
 * Receives { messages, system } from the client and forwards
 * the request to Anthropic, returning the raw response.
 *
 * Required env var:
 *   ANTHROPIC_API_KEY
 */

import express from "express";

const router = express.Router();

router.post("/ai-chat", async (req, res) => {
  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY is not configured on the server",
    });
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system: system || "You are EduTrack NG's helpful AI assistant for Nigerian schools.",
        messages,
      }),
    });

    const data = await anthropicRes.json();

    // Forward Anthropic's status code so the client can handle errors properly
    res.status(anthropicRes.status).json(data);

  } catch (err) {
    console.error("[/api/ai-chat]", err);
    res.status(502).json({
      error: "Failed to reach Anthropic API",
      detail: err.message,
    });
  }
});

export default router;
