/**
 * EduTrack NG — Reset Staff Password Route
 * POST /api/reset-staff-password
 *
 * Allows school admins to reset any staff member's Supabase Auth password.
 * Uses the SERVICE ROLE key which must never be exposed to the browser.
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import express from "express";

const router = express.Router();

router.post("/reset-staff-password", async (req, res) => {
  const { user_id, new_password } = req.body;

  if (!user_id || !new_password) {
    return res.status(400).json({ error: "user_id and new_password are required" });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({
      error: "Server not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env",
    });
  }

  try {
    const supaRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ password: new_password }),
    });

    const data = await supaRes.json();

    if (!supaRes.ok || data.error) {
      throw new Error(data.error?.message || data.msg || "Supabase admin update failed");
    }

    res.json({ success: true, user_id });

  } catch (err) {
    console.error("[/api/reset-staff-password]", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

export default router;
