/**
 * Cloudflare Worker — OpenRouter API Proxy
 *
 * This Worker proxies requests to OpenRouter, keeping your API key secure server-side.
 *
 * Setup:
 * 1. Create account at https://workers.cloudflare.com (free tier available)
 * 2. Create new Worker
 * 3. Paste this code
 * 4. Add environment variable: OPENROUTER_API_KEY = your-key
 * 5. Deploy
 * 6. Get your Worker URL (e.g., https://tyler-portfolio.your-subdomain.workers.dev)
 * 7. Set in index.html: window.CLOUDFLARE_WORKER_URL = 'your-worker-url'
 */

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'https://tylerv11.github.io',
      'http://localhost:5000', // for local testing
      'http://localhost:8000',
    ];

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : 'https://tylerv11.github.io',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // Check origin is from your portfolio domain
    if (!allowedOrigins.includes(origin)) {
      return new Response('CORS not allowed', { status: 403, headers: corsHeaders });
    }

    // Get API key from environment (not exposed to client)
    const apiKey = env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY not set in environment');
      return new Response(
        JSON.stringify({ error: { message: 'API key not configured' } }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    try {
      // Parse incoming request
      const body = await request.json();

      // Validate request has required fields
      if (!body.model || !body.messages) {
        return new Response(
          JSON.stringify({ error: { message: 'Invalid request: missing model or messages' } }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Enforce model to prevent misuse
      const allowedModels = ['deepseek/deepseek-2.5', 'deepseek/deepseek-chat'];
      if (!allowedModels.includes(body.model)) {
        return new Response(
          JSON.stringify({ error: { message: `Model ${body.model} not allowed` } }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Forward request to OpenRouter with API key
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://tylerv11.github.io',
          'X-Title': 'Tyler Vincent Portfolio Assistant',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      // Get response data
      const data = await response.json();

      // Return response with CORS headers
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: { message: 'Internal server error' } }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  },
};
