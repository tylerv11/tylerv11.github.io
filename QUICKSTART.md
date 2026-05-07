# Smart Mode Setup — Quick Reference

## TL;DR (5 Minutes)

### Step 1: Get API Key
```bash
→ Go to https://openrouter.ai
→ Sign up
→ Settings > Keys > Create Key
→ Copy key (looks like: sk-or-xxxxxxxxxxxxx)
```

### Step 2: Create Cloudflare Worker
```bash
→ Go to https://workers.cloudflare.com
→ Sign up or log in
→ Create Service > "tyler-portfolio-api"
→ Edit code > paste cloudflare-worker.js code
→ Save & Deploy
→ Copy Worker URL (e.g., https://tyler-portfolio.xxx.workers.dev)
```

### Step 3: Add Environment Variable to Worker
```bash
→ In Cloudflare dashboard, go to your worker Settings
→ Environment Variables > Edit
→ Add: OPENROUTER_API_KEY = your-key-from-step-1
→ Click Encrypt
→ Save
```

### Step 4: Update index.html

In the `<head>` section, add this BEFORE the portfolio-assistant script:

```html
<script>
  window.CLOUDFLARE_WORKER_URL = 'https://your-worker-url-here.workers.dev';
</script>
```

Replace with your actual Worker URL from Step 2.

### Step 5: Test
```bash
→ Go to https://tylerv11.github.io
→ Click robot icon
→ Toggle 🧠 Smart checkbox
→ Ask: "What are Tyler's biggest impacts?"
→ Should see answer + cost (~$0.0001)
```

### Step 6: Commit & Push
```bash
git add -A
git commit -m "Enable Smart Mode with Cloudflare Worker"
git push origin main
```

---

## Files You Need

- ✅ `cloudflare-worker.js` — Deploy to Cloudflare (ready to go)
- ✅ `portfolio-assistant.js` — Already in repo (uses Worker URL)
- ✅ `index.html` — Update with Worker URL (one script tag)
- ✅ `.gitignore` — Already configured (protects API keys)
- ✅ `.env.example` — Reference only, for local dev

---

## Security

- 🔒 **API key is server-side only** (Cloudflare environment)
- 🔒 **Client never sees key**
- 🔒 **CORS restricted** (only tylerv11.github.io)
- 🔒 **Rate limited** (5/min, 15/session)
- 🔒 **Input validated** (injection detection, relevance checks)

---

## Cost

| Item | Cost |
|------|------|
| Deepseek 2.5 per query | ~$0.0001–$0.0003 |
| Per session (15 queries) | ~$0.002–$0.005 |
| Per month (100 sessions) | ~$0.20–$0.50 |
| Cloudflare Worker | FREE (up to 100k req/day) |

---

## If Something Breaks

| Issue | Fix |
|-------|-----|
| "API key not configured" | Add `window.CLOUDFLARE_WORKER_URL` to index.html |
| CORS error (403) | Check Worker URL is correct |
| Smart Mode doesn't toggle | Check browser console for errors |
| Worker returns 500 | Verify API key is set in Cloudflare environment |
| Know unknown error | Check `CLOUDFLARE_SETUP.md` → Troubleshooting section |

---

## Questions?

- **Full guide:** See `CLOUDFLARE_SETUP.md`
- **Contact:** tylervincent@alumni.usc.edu

---

## Summary

You're about to:
1. ✅ Secure your API key (server-side only)
2. ✅ Enable AI-powered answers (~$0.0001/query)
3. ✅ Keep it FREE on Cloudflare
4. ✅ Maintain dual-mode fallback (fuzzy matching always works)

**That's it! 🚀**
