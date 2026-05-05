/**
 * EduTrack NG — Lesson Generator Route
 * POST /api/generate-lesson
 *
 * Uses OpenAI to generate a structured lesson note,
 * then saves it to the Supabase `lessons` table.
 *
 * Required env vars:
 *   OPENAI_API_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import express from "express";
import supabase from "../supabaseClient.js";

const router = express.Router();

router.post("/generate-lesson", async (req, res) => {
  try {
    const { subject, topic, classLevel } = req.body;

    if (!subject || !topic || !classLevel) {
      return res.status(400).json({ error: "subject, topic, and classLevel are required" });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server" });
    }

    const prompt = `You are a Nigerian school teacher.

Generate a structured lesson note for the following:

Subject: ${subject}
Class: ${classLevel}
Topic: ${topic}

Include:
- Learning Objectives
- Introduction / Motivation
- Step-by-step Explanation
- Evaluation Questions
- Assignment`;

    // ── Call OpenAI Chat Completions API ──────────────────────────
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",   // cost-effective; change to gpt-4o for higher quality
        messages: [
          { role: "system", content: "You are a helpful Nigerian school teacher." },
          { role: "user",   content: prompt },
        ],
        max_tokens: 1200,
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("OpenAI error:", errText);
      return res.status(502).json({ error: "OpenAI API request failed", detail: errText });
    }

    const aiData = await aiRes.json();
    const lesson = aiData.choices?.[0]?.message?.content;

    if (!lesson) {
      return res.status(502).json({ error: "OpenAI returned an unexpected response", detail: aiData });
    }

    // ── Save to Supabase ──────────────────────────────────────────
    const { error: dbError } = await supabase
      .from("lessons")
      .insert([{ subject, topic, class_level: classLevel, content: lesson }]);

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      // Still return the lesson even if DB save fails
      return res.status(207).json({
        lesson,
        warning: "Lesson generated but could not be saved to database: " + dbError.message,
      });
    }

    res.json({ lesson });

  } catch (err) {
    console.error("[/api/generate-lesson]", err);
    res.status(500).json({ error: "Failed to generate lesson", detail: err.message });
  }
});

export default router;
