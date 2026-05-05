/**
 * EduTrack NG — School Provisioning Edge Function
 * Route: POST /api/provision-school
 *
 * Called when SaaS owner approves a school application.
 * Uses the Supabase SERVICE ROLE key (server-side only) to:
 *   1. Create a Supabase Auth user for the school admin
 *   2. Insert a row into the `schools` table
 *   3. Insert a row into the `users` table linking admin → school
 *   4. Update school_applications.status = 'approved'
 *
 * Set in Netlify Environment Variables:
 *   ANTHROPIC_API_KEY     — for AI assistant
 *   SUPABASE_URL          — your project URL
 *   SUPABASE_SERVICE_KEY  — Settings → API → service_role key (secret!)
 */

export default async function handler(request, context) {
  const origin = request.headers.get('Origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400, corsHeaders); }

  const { application_id, admin_note } = body;
  if (!application_id) return json({ error: 'application_id required' }, 400, corsHeaders);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_KEY');

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Server not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.' }, 500, corsHeaders);
  }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Prefer': 'return=representation',
  };

  try {
    // ── 1. Fetch the application ────────────────────────────────
    const appRes = await fetch(
      `${SUPABASE_URL}/rest/v1/school_applications?id=eq.${application_id}&select=*`,
      { headers }
    );
    const apps = await appRes.json();
    const app = apps[0];
    if (!app) return json({ error: 'Application not found' }, 404, corsHeaders);
    if (app.status === 'approved') return json({ error: 'Already approved' }, 409, corsHeaders);

    // ── 2. Generate a temporary password ───────────────────────
    const tempPassword = 'EduTrack@' + Math.random().toString(36).slice(-6).toUpperCase();

    // ── 3. Create Supabase Auth user ────────────────────────────
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: app.admin_email,
        password: tempPassword,
        email_confirm: true,   // skip email confirmation
        user_metadata: {
          full_name: `${app.admin_first_name} ${app.admin_last_name}`,
          role: 'admin',
        },
      }),
    });

    const authData = await authRes.json();
    if (authData.error || !authData.id) {
      // If user already exists, fetch their ID
      if (authData.msg?.includes('already') || authData.code === 'email_exists') {
        // look up existing user
        const existRes = await fetch(
          `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(app.admin_email)}`,
          { headers }
        );
        const existData = await existRes.json();
        if (!existData.users?.length) {
          return json({ error: 'Auth user creation failed: ' + JSON.stringify(authData) }, 500, corsHeaders);
        }
        authData.id = existData.users[0].id;
      } else {
        return json({ error: 'Auth user creation failed: ' + JSON.stringify(authData) }, 500, corsHeaders);
      }
    }

    const authUserId = authData.id;

    // ── 4. Create school record ─────────────────────────────────
    const schoolRes = await fetch(`${SUPABASE_URL}/rest/v1/schools`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name:          app.school_name,
        school_type:   app.school_type,
        ownership:     app.school_ownership,
        address:       app.school_address,
        city:          app.school_city,
        state:         app.school_state,
        lga:           app.school_lga,
        postal:        app.school_postal,
        email:         app.school_email  || app.admin_email,
        phone:         app.admin_phone,
        website:       app.school_website,
        is_active:     true,
        plan:          'free',
        application_id: application_id,
      }),
    });
    const schoolArr = await schoolRes.json();
    const school = Array.isArray(schoolArr) ? schoolArr[0] : schoolArr;
    if (!school?.id) return json({ error: 'School creation failed: ' + JSON.stringify(school) }, 500, corsHeaders);

    // ── 5. Create user profile row ──────────────────────────────
    const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id:               authUserId,
        school_id:        school.id,
        full_name:        `${app.admin_first_name} ${app.admin_last_name}`,
        email:            app.admin_email,
        phone:            app.admin_phone,
        role:             'admin',
        is_active:        true,
        must_change_password: true,   // ← forces password change on first login
      }),
    });
    const userArr = await userRes.json();
    const userRow = Array.isArray(userArr) ? userArr[0] : userArr;
    if (!userRow?.id) {
      // tolerate conflict (user row already exists) but log it
      console.warn('User row insert result:', JSON.stringify(userArr));
    }

    // ── 6. Mark application approved ───────────────────────────
    await fetch(
      `${SUPABASE_URL}/rest/v1/school_applications?id=eq.${application_id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status:        'approved',
          admin_note:    admin_note || null,
          reviewed_at:   new Date().toISOString(),
          provisioned_school_id: school.id,
        }),
      }
    );

    // ── 7. Return credentials to SaaS owner ────────────────────
    return json({
      success: true,
      school_id:      school.id,
      auth_user_id:   authUserId,
      temp_password:  tempPassword,
      login_email:    app.admin_email,
      message: `School "${app.school_name}" provisioned. Admin email: ${app.admin_email}, Temp password: ${tempPassword}`,
    }, 200, corsHeaders);

  } catch (err) {
    return json({ error: err.message || String(err) }, 500, corsHeaders);
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export const config = { path: '/api/provision-school' };
