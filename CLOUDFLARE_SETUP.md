# Cloudflare Worker Setup — Complete Guide

## Overview

This guide sets up a **Cloudflare Worker** to securely proxy API calls to OpenRouter. Your API key stays **server-side only** — never exposed to the browser.

## Cost Breakdown

- **Cloudflare Worker:** Free tier (up to 100k requests/day)
- **OpenRouter (Deepseek 2.5):** ~$0.07 per 1M input tokens, ~$0.28 per 1M output
- **Per query:** ~$0.0001–$0.0003
- **Monthly (100 sessions × 15 queries):** ~$0.20–$0.50

---

## Step 1: Get an OpenRouter API Key

1. Go to https://openrouter.ai
2. Sign up (free account)
3. Go to **Settings** → **Keys**
4. Create a new key
5. Copy it (you'll use it in Step 3)

---

## Step 2: Create a Cloudflare Worker

### 2a. Sign Up for Cloudflare (if needed)
1. Go to https://workers.cloudflare.com
2. Sign up with email or GitHub
3. Verify email
4. Create account (free tier is fine)

### 2b. Create a New Worker
1. Click **Create a Service**
2. Name: `tyler-portfolio-api` (or similar)
3. Keep "Hello World" template
4. Click **Deploy**

### 2c. Copy the Worker Code
1. Click the worker name to open it
2. Click **Edit code**
3. Delete all existing code
4. Paste the code from `cloudflare-worker.js` (in this repo)
5. Click **Save and deploy**

### 2d. Add Environment Variable (API Key)
1. In the worker dashboard, go to **Settings**
2. Under **Environment Variables**, click **Edit variables**
3. Add new variable:
   - **Name:** `OPENROUTER_API_KEY`
   - **Value:** Paste your OpenRouter key (from Step 1)
4. Click **Encrypt** (turns it into `[protected]`)
5. Click **Save**

### 2e. Get Your Worker URL
1. Go back to worker overview
2. Copy the **Worker URL** (looks like `https://tyler-portfolio.your-subdomain.workers.dev`)
3. Save it for Step 3

---

## Step 3: Configure Your Portfolio

### 3a. Add Worker URL to index.html

In the `<head>` section, before the portfolio-assistant script:

```html
<script>
  // Point to your Cloudflare Worker
  window.CLOUDFLARE_WORKER_URL = 'https://tyler-portfolio.your-subdomain.workers.dev';
</script>
<!-- Portfolio Assistant — Dual-Mode RAG + Security -->
<script src="portfolio-assistant.js" type="text/javascript" defer></script>
```

**Replace** `https://tyler-portfolio.your-subdomain.workers.dev` with your actual Worker URL from Step 2e.

### 3b. (Optional) Create Local .env.local File

For local testing:

```bash
cd /Users/experimental/tylerv11.github.io
cp .env.example .env.local
```

Edit `.env.local` and add:
```
CLOUDFLARE_WORKER_URL=https://tyler-portfolio.your-subdomain.workers.dev
```

This file is `.gitignore`'d and won't be committed.

---

## Step 4: Test It

### 4a. Test on Live Site
1. Go to https://tylerv11.github.io
2. Click robot icon (opens assistant)
3. Toggle **🧠 Smart** checkbox
4. Ask a question: "What are Tyler's biggest impacts?"
5. You should see:
   - ✅ Question sent to Worker
   - ✅ Worker proxies to OpenRouter
   - ✅ Deepseek 2.5 returns answer
   - ✅ Cost shown: ~$0.0001

### 4b. Test Locally
If testing locally (e.g., with `python -m http.server 8000`):

1. Make sure you have the Worker URL set in Step 3a
2. Open http://localhost:8000
3. Test as above

### 4c. Check Logs
In Cloudflare dashboard:
1. Click your worker
2. Go to **Logs**
3. You should see incoming requests + responses

---

## Security Checklist

✅ **API Key is server-side only** (in Cloudflare environment)
✅ **Client never sees key** (proxy handles all auth)
✅ **CORS restricted** (only requests from tylerv11.github.io allowed)
✅ **Model whitelisted** (only deepseek-2.5 allowed)
✅ **Rate limiting** (5/min, 15/session on client-side)
✅ **Input validation** (injection detection, relevance checks)
✅ **.gitignore configured** (no .env files committed)

---

## Troubleshooting

### Worker returns 403 (CORS)
- **Cause:** Request from wrong domain
- **Fix:** Add your domain to `allowedOrigins` in cloudflare-worker.js
- **Example:** `'http://localhost:8000'` for local testing

### Worker returns 400 (Invalid request)
- **Cause:** Missing model or messages field
- **Fix:** Make sure portfolio-assistant.js is up to date

### Worker returns 500 (Server error)
- **Cause:** API key not set or OpenRouter error
- **Fix:** 
  1. Check API key is set in Cloudflare environment
  2. Test key directly at https://openrouter.ai/keys
  3. Check Worker logs for error details

### Smart Mode checkbox grayed out
- **Cause:** Knowledge base failed to load
- **Fix:**
  1. Check browser console for errors
  2. Make sure `portfolio_knowledge_base.md` exists
  3. Check CORS headers from your server

### "API key not configured" message
- **Cause:** `window.CLOUDFLARE_WORKER_URL` not set
- **Fix:** Add to index.html before portfolio-assistant.js:
  ```javascript
  window.CLOUDFLARE_WORKER_URL = 'your-worker-url';
  ```

---

## Updating the Worker

If you need to update the Worker code:

1. Go to your Worker in Cloudflare dashboard
2. Click **Edit code**
3. Update the code from `cloudflare-worker.js`
4. Click **Save and deploy**

---

## Monitoring Usage

### View Requests in Cloudflare Dashboard
1. Click your worker
2. Go to **Logs**
3. See all requests + responses
4. Monitor errors in real-time

### Estimate Monthly Cost
```
Average per query: $0.0002
Max queries per session: 15
Estimated cost = $0.0002 × 15 × (# of sessions)
```

If you get 100 sessions/month: `$0.0002 × 15 × 100 = $0.30/month`

---

## Questions?

- **OpenRouter docs:** https://openrouter.ai/docs
- **Cloudflare Workers docs:** https://developers.cloudflare.com/workers/
- **My email:** tylervincent@alumni.usc.edu

---

## Next Steps

1. ✅ Complete Step 1 (get OpenRouter key)
2. ✅ Complete Step 2 (create Cloudflare Worker)
3. ✅ Complete Step 3 (add Worker URL to index.html)
4. ✅ Complete Step 4 (test)
5. ✅ Commit & push to main
6. 🚀 Live on https://tylerv11.github.io

**You're done!** Smart Mode is now live and secure.
