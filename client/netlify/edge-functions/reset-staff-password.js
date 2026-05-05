/**
 * EduTrack NG — Reset Staff Password Edge Function
 * Route: POST /api/reset-staff-password
 *
 * Allows school admins to reset any staff member's password.
 * Uses SUPABASE_SERVICE_KEY (server-side only — never exposed to browser).
 *
 * Netlify Environment Variables needed:
 *   SUPABASE_URL          — your project URL
 *   SUPABASE_SERVICE_KEY  — service_role key from Settings → API
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
  catch { return json({ error: 'Invalid JSON body' }, 400, corsHeaders); }

  const { user_id, new_password } = body;

  if (!user_id || !new_password) {
    return json({ error: 'user_id and new_password are required' }, 400, corsHeaders);
  }
  if (new_password.length < 8) {
    return json({ error: 'Password must be at least 8 characters' }, 400, corsHeaders);
  }

  const SUPABASE_URL  = Deno.env.get('SUPABASE_URL');
  const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_KEY');

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Server not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Netlify.' }, 500, corsHeaders);
  }

  try {
    // Use Supabase Admin API to update the user's password
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ password: new_password }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error?.message || data.msg || 'Supabase admin update failed');
    }

    return json({ success: true, user_id }, 200, corsHeaders);

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

export const config = { path: '/api/reset-staff-password' };
