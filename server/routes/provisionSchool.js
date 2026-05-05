/**
 * EduTrack NG — School Provisioning Route
 * POST /api/provision-school
 *
 * Called when SaaS owner approves a school application.
 * Uses the Supabase SERVICE ROLE key (server-side only) to:
 *   1. Fetch and validate the school application
 *   2. Create a Supabase Auth user for the school admin
 *   3. Insert a row into the `schools` table
 *   4. Insert a row into the `users` table linking admin → school
 *   5. Mark school_applications.status = 'approved'
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import express from "express";

const router = express.Router();

router.post("/provision-school", async (req, res) => {
  const { application_id, admin_note } = req.body;

  if (!application_id) {
    return res.status(400).json({ error: "application_id is required" });
  }

  const SUPABASE_URL  = process.env.SUPABASE_URL;
  const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({
      error: "Server not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env",
    });
  }

  const headers = {
    "Content-Type": "application/json",
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    Prefer: "return=representation",
  };

  try {
    // ── 1. Fetch the application ────────────────────────────────
    const appRes = await fetch(
      `${SUPABASE_URL}/rest/v1/school_applications?id=eq.${application_id}&select=*`,
      { headers }
    );
    const apps = await appRes.json();
    const app  = apps[0];

    if (!app)                    return res.status(404).json({ error: "Application not found" });
    if (app.status === "approved") return res.status(409).json({ error: "Application already approved" });

    // ── 2. Generate a temporary password ───────────────────────
    const tempPassword = "EduTrack@" + Math.random().toString(36).slice(-6).toUpperCase();

    // ── 3. Create Supabase Auth user ────────────────────────────
    const authRes  = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email:                app.admin_email,
        password:             tempPassword,
        email_confirm:        true,
        email_confirmed_at:   new Date().toISOString(),
        user_metadata: {
          full_name: `${app.admin_first_name} ${app.admin_last_name}`,
          role:      "admin",
        },
      }),
    });
    let authData = await authRes.json();

    if (authData.error || !authData.id) {
      // If user already exists, look up their existing id
      if (authData.msg?.includes("already") || authData.code === "email_exists") {
        const existRes  = await fetch(
          `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(app.admin_email)}`,
          { headers }
        );
        const existData = await existRes.json();
        if (!existData.users?.length) {
          return res.status(500).json({
            error: "Auth user creation failed: " + JSON.stringify(authData),
          });
        }
        authData.id = existData.users[0].id;
      } else {
        return res.status(500).json({
          error: "Auth user creation failed: " + JSON.stringify(authData),
        });
      }
    }

    const authUserId = authData.id;

    // ── 3b. Force-confirm the email via a separate PATCH ────────
    // Supabase's POST /admin/users ignores email_confirmed_at on creation;
    // a follow-up PUT to the user endpoint is required to confirm it.
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        email_confirm: true,
      }),
    });

    // ── 4. Create school record ─────────────────────────────────
    const schoolRes = await fetch(`${SUPABASE_URL}/rest/v1/schools`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name:           app.school_name,
        school_type:    app.school_type,
        ownership:      app.school_ownership,
        address:        app.school_address,
        city:           app.school_city,
        state:          app.school_state,
        lga:            app.school_lga,
        postal:         app.school_postal,
        email:          app.school_email || app.admin_email,
        phone:          app.admin_phone,
        website:        app.school_website,
        is_active:      true,
        plan:           "free",
        application_id,
      }),
    });
    const schoolArr = await schoolRes.json();
    const school    = Array.isArray(schoolArr) ? schoolArr[0] : schoolArr;

    if (!school?.id) {
      return res.status(500).json({ error: "School creation failed: " + JSON.stringify(school) });
    }

    // ── 5. Create user profile row ──────────────────────────────
    const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id:                   authUserId,
        school_id:            school.id,
        full_name:            `${app.admin_first_name} ${app.admin_last_name}`,
        email:                app.admin_email,
        phone:                app.admin_phone,
        role:                 "admin",
        is_active:            true,
        must_change_password: true,
      }),
    });
    const userArr = await userRes.json();
    const userRow = Array.isArray(userArr) ? userArr[0] : userArr;

    if (!userRow?.id) {
      console.warn("User row insert result:", JSON.stringify(userArr));
    }

    // ── 6. Mark application approved ───────────────────────────
    await fetch(
      `${SUPABASE_URL}/rest/v1/school_applications?id=eq.${application_id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status:                "approved",
          admin_note:            admin_note || null,
          reviewed_at:           new Date().toISOString(),
          provisioned_school_id: school.id,
        }),
      }
    );

    // ── 7. Return credentials to SaaS owner ────────────────────
    res.json({
      success:       true,
      school_id:     school.id,
      auth_user_id:  authUserId,
      temp_password: tempPassword,
      login_email:   app.admin_email,
      message: `School "${app.school_name}" provisioned. Admin: ${app.admin_email} / Temp password: ${tempPassword}`,
    });

  } catch (err) {
    console.error("[/api/provision-school]", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

export default router;