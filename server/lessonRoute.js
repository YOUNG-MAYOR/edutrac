import express from "express";
import fetch from "node-fetch";
import supabase from "./supabaseClient.js";

const router = express.Router();

router.post("/generate-lesson", async (req, res) => {
  try {
    const { subject, topic, classLevel } = req.body;

    const prompt = `
You are a Nigerian school teacher.

Generate a structured lesson note:

Subject: ${subject}
Class: ${classLevel}
Topic: ${topic}

Include:
- Objectives
- Introduction
- Explanation
- Evaluation
- Assignment
`;

    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.3",
        input: prompt,
      }),
    });

    const aiData = await aiRes.json();
    const lesson = aiData.output[0].content[0].text;

    // Save to Supabase
    const { error } = await supabase
      .from("lessons")
      .insert([{ subject, topic, class_level: classLevel, content: lesson }]);

    if (error) throw error;

    res.json({ lesson });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate lesson" });
  }
});

export default router;