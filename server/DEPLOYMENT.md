# EduTrack NG — Deployment Guide
## Netlify (Frontend) + Railway (Backend)

---

## Architecture Overview

```
Browser
  │
  ├─► Netlify CDN  (client/)
  │     Static HTML, CSS, JS, PWA
  │     /api/* → proxied to Railway
  │
  └─► Railway      (server/)
        Express API
        POST /api/ai-chat
        POST /api/ai-chat
        POST /api/generate-lesson
        POST /api/provision-school
        POST /api/reset-staff-password
        GET  /health
```

All `/api/*` calls from the browser hit Netlify first, which transparently
proxies them to your Railway backend. This avoids any CORS issues and keeps
your Railway URL out of client-side code.

---

## Step 0 — Prerequisites

- A **GitHub** account with a repo containing your project
- A **Netlify** account — [netlify.com](https://netlify.com) (free tier is fine)
- A **Railway** account — [railway.app](https://railway.app) (free $5 credit/month)
- Your API keys ready: Supabase, Anthropic, OpenAI

**Recommended repo structure:**
```
edutrac/
├── client/          ← Netlify deploys this
│   ├── netlify.toml
│   ├── js/config.js
│   └── ...
└── server/          ← Railway deploys this
    ├── railway.toml
    ├── package.json
    ├── index.js
    └── ...
```

---

## Step 1 — Push to GitHub

```bash
# From your project root
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/edutrac.git
git push -u origin main
```

> **Tip:** Make sure `.gitignore` in `server/` includes `.env` so your
> real secrets are never committed.

---

## Step 2 — Deploy the Backend on Railway

### 2a. Create a New Railway Project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub repo**
3. Select your `edutrac` repo
4. Railway will detect the project — click **Add service → GitHub Repo**

### 2b. Set the Root Directory

In the Railway service settings:

1. Go to your service → **Settings** tab
2. Under **Source**, set **Root Directory** to `server`
3. Railway will now only look inside `server/` for the Node.js app

### 2c. Set Environment Variables

In Railway → your service → **Variables** tab, add:

| Variable                   | Value                                      |
|----------------------------|--------------------------------------------|
| `CLIENT_ORIGIN`            | `https://YOUR_SITE.netlify.app`            |
| `SUPABASE_URL`             | `https://nbgdjwuoiglkrmdeezsk.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY`| your Supabase service role key             |
| `ANTHROPIC_API_KEY`        | your Anthropic API key                     |
| `OPENAI_API_KEY`           | your OpenAI API key                        |

> **Do NOT set `PORT`** — Railway injects it automatically.

### 2d. Deploy

Railway auto-deploys when you push to `main`. After the build finishes:

1. Go to your service → **Settings** → **Networking**
2. Click **Generate Domain** to get a public URL
3. **Copy your Railway URL** — you'll need it in the next steps.
   It looks like: `https://edutrac-backend-production.up.railway.app`

### 2e. Verify the Backend is Live

```bash
curl https://YOUR_RAILWAY_URL/health
# Expected: {"status":"ok","timestamp":"..."}
```

---

## Step 3 — Update the Client Config Files

Before deploying the frontend you must replace the two placeholders:

### 3a. `client/js/config.js`

Open `client/js/config.js` and replace `REPLACE_WITH_RAILWAY_URL` with your
Railway URL (**without** a trailing slash):

```js
API_BASE_URL: 'https://edutrac-backend-production.up.railway.app',
```

### 3b. `client/netlify.toml`

Open `client/netlify.toml` and replace `REPLACE_WITH_RAILWAY_URL` in the
redirect block:

```toml
[[redirects]]
  from   = "/api/*"
  to     = "https://edutrac-backend-production.up.railway.app/api/:splat"
  status = 200
  force  = true
```

Commit and push both changes:

```bash
git add client/js/config.js client/netlify.toml
git commit -m "chore: set Railway backend URL"
git push
```

---

## Step 4 — Deploy the Frontend on Netlify

### 4a. Create a New Netlify Site

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git**
2. Connect your GitHub account and select your `edutrac` repo
3. Configure the build settings:

| Setting          | Value    |
|------------------|----------|
| Base directory   | `client` |
| Build command    | *(leave blank — no build step)* |
| Publish directory| `client` |

> Netlify auto-discovers `netlify.toml` inside `client/` and uses it.

4. Click **Deploy site**

### 4b. Get Your Netlify URL

After deploy, Netlify gives you a URL like `https://random-name.netlify.app`.

You can rename it under **Site settings → General → Site name**.

### 4c. Update Railway CORS

Go back to Railway → **Variables** and update `CLIENT_ORIGIN` to your
real Netlify URL:

```
CLIENT_ORIGIN=https://your-site-name.netlify.app
```

Railway redeploys automatically.

---

## Step 5 — Custom Domain (Optional)

### Netlify custom domain
1. **Site settings → Domain management → Add custom domain**
2. Add your domain (e.g. `app.edutrac.ng`)
3. Update your DNS provider's CNAME to `your-site.netlify.app`
4. Netlify auto-provisions HTTPS via Let's Encrypt

### After adding a custom domain
Remember to update `CLIENT_ORIGIN` in Railway to your custom domain:
```
CLIENT_ORIGIN=https://app.edutrac.ng
```

---

## Step 6 — Post-Deployment Checklist

- [ ] `https://YOUR_RAILWAY_URL/health` returns `{"status":"ok"}`
- [ ] Netlify site loads without the red config-error banner
- [ ] Login page works and authenticates via Supabase
- [ ] AI chat responds (tests the `/api/ai-chat` → Railway proxy)
- [ ] Lesson generator works (tests `/api/generate-lesson`)
- [ ] School provisioning works from the SaaS console
- [ ] PWA installs correctly on mobile (check `manifest.json` and `sw.js`)
- [ ] Service worker offline page shows when network is cut

---

## Environment Variables Reference

### Railway (server/.env in production)

| Variable                    | Required | Description                                  |
|-----------------------------|----------|----------------------------------------------|
| `CLIENT_ORIGIN`             | Yes      | Netlify URL for CORS — e.g. `https://x.netlify.app` |
| `SUPABASE_URL`              | Yes      | Your Supabase project URL                    |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Supabase service role key (never expose publicly) |
| `ANTHROPIC_API_KEY`         | Yes      | For `/api/ai-chat`                           |
| `OPENAI_API_KEY`            | Yes      | For `/api/generate-lesson`                   |
| `PORT`                      | Auto     | Set by Railway — do not override             |

### Netlify (no env vars needed)

All secrets live on Railway. Netlify only serves static files and proxies
`/api/*` to Railway — no secrets required on the Netlify side.

---

## Troubleshooting

### CORS errors in the browser console
- Verify `CLIENT_ORIGIN` in Railway exactly matches your Netlify URL (no trailing slash)
- Check that the `/api/*` redirect in `netlify.toml` points to your Railway URL
- Railway redeploys on env var changes — wait ~30 seconds and retry

### Railway build fails
- Make sure **Root Directory** is set to `server` in Railway service settings
- Confirm `server/package.json` has `"start": "node index.js"` in scripts
- Check Railway build logs for missing packages

### Netlify deploys but API calls 404
- Confirm the `[[redirects]]` block in `netlify.toml` has the correct Railway URL
- Make sure `API_BASE_URL` in `config.js` is set (not `''` or the placeholder)
- Test the redirect: `curl https://YOUR_NETLIFY_URL/api/health` should return `{"status":"ok"}`

### PWA not installing
- Netlify must serve over HTTPS (it does by default)
- Check browser DevTools → Application → Service Workers for registration errors
- The `sw.js` cache header (`no-cache`) is already set in `netlify.toml`

---

## How API Calls Flow

```
Browser fetch('/api/ai-chat', ...)
    │
    ▼
Netlify Edge (redirect rule)
    │  from: /api/*
    │  to:   https://railway-url/api/:splat
    │
    ▼
Railway Express
    POST /api/ai-chat
    → rate-limited
    → proxied to Anthropic
    → response returned
    │
    ▼
Back to Browser
```

Because Netlify proxies the request (status 200, not 301/302), the browser
always sees requests going to the same Netlify origin — no CORS preflight,
no Railway URL exposed to end users.
