# Portfolio Assistant — Setup Guide

## Overview

The Portfolio Assistant has two modes:

1. **Fuzzy Matching (Default)** — Instant, free, no API needed
2. **Smart Mode (Optional)** — AI-powered RAG via Deepseek + OpenRouter, fully rate-limited

## Smart Mode Setup

Smart Mode requires an OpenRouter API key. Choose one of these approaches:

### Option 1: Cloudflare Worker Proxy (Recommended)

Use Cloudflare Workers to proxy API requests securely. This keeps your API key safe server-side.

#### Steps:

1. Create a free Cloudflare Workers account at https://workers.cloudflare.com
2. Create a new Worker with this code:

```javascript
export default {
  async fetch(request) {
    // Check rate limit headers
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    
    // Forward to OpenRouter
    const openrouterRequest = new Request('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://tylerv11.github.io',
        'X-Title': 'Tyler Vincent Portfolio',
        'Content-Type': 'application/json',
      },
      body: request.body,
    });

    const response = await fetch(openrouterRequest);
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://tylerv11.github.io',
      },
    });
  },
};
```

3. Add environment variable in Worker settings:
   - `OPENROUTER_API_KEY` = your OpenRouter API key

4. Update `portfolio-assistant.js` to use your Worker URL:
   ```javascript
   OPENROUTER_API_ENDPOINT: 'https://your-worker.your-subdomain.workers.dev/v1/chat/completions',
   ```

### Option 2: Direct Client-Side (Simple but API key visible)

**Only recommended for low-traffic personal sites with strong rate limiting.**

1. Get an API key from https://openrouter.ai
2. Before the assistant initializes, set:
   ```javascript
   <script>
     window.OPENROUTER_API_KEY = 'sk-or-xxxxx-your-key';
   </script>
   ```

**Security: Rate limiting is enforced (5/min, 15/session).**

### Option 3: Environment-Based Deployment

If deploying to Vercel, Netlify, or another service:

1. Set `OPENROUTER_API_KEY` as an environment variable
2. Use their serverless functions to proxy requests
3. Point `OPENROUTER_API_ENDPOINT` to your proxy function

## Cost Analysis

**Deepseek v3 via OpenRouter:**
- Input: ~$0.27 per 1M tokens
- Output: ~$1.10 per 1M tokens

**Per Query Cost:** ~$0.0001–$0.0003
- 15 queries/session = ~$0.002–$0.005 per session
- Monthly (100 sessions) = ~$0.20–$0.50

**Rate Limits:**
- 5 questions per minute
- 15 questions per session (1 hour timeout)
- Prevents runaway costs

## Security Features

### Input Validation
- Max 500 characters per question
- Blocks SQL injection patterns
- Blocks shell command injection
- Blocks prompt injection/jailbreak attempts
- Detects off-topic questions (must be about Tyler)

### Rate Limiting
- Per-minute: 5 queries max
- Per-session: 15 queries max
- Session timeout: 1 hour
- Graceful fallback to fuzzy matching

### Token Management
- Estimates tokens before API call
- Validates context window (max ~100k tokens)
- Falls back to fuzzy matching if too large

### Response Validation
- Checks response length (10–2000 chars)
- Blocks code injection in responses
- Validates response is about Tyler's work

## Monitoring & Debugging

Check browser console for security events:

```javascript
// View assistant state
console.log(PortfolioAssistant.getState());

// Manually reset session
PortfolioAssistant.resetSession();
```

## Q&A

**Q: Why is Smart Mode optional?**
A: Fuzzy matching is instant and free. Smart Mode costs ~$0.0001/query. Most questions work fine with fuzzy matching.

**Q: Is my API key exposed?**
A: Only if using Option 2 (direct client-side). Use Option 1 (Cloudflare Worker) to keep it secure. Rate limiting prevents abuse.

**Q: What if I hit the rate limit?**
A: You can ask again after 1 minute, or refresh the page to reset the session counter.

**Q: How accurate is Smart Mode?**
A: Better than fuzzy matching for nuanced questions. Chunks the knowledge base by heading (~500 tokens each) and finds top 2–3 relevant chunks for context.

**Q: What if the API goes down?**
A: Falls back to fuzzy matching automatically.

## Feedback

Questions? Reach out: tylervincent@alumni.usc.edu
