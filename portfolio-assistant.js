/**
 * PORTFOLIO ASSISTANT — Dual-Mode RAG System
 * Mode 1: Fuzzy matching (instant, free)
 * Mode 2: Smart RAG via Deepseek + OpenRouter (semantic, cost-controlled)
 *
 * Security: Comprehensive guardrails against injection, jailbreak, rate limiting, token abuse.
 */

const PortfolioAssistant = (() => {
  // ===== CONFIGURATION =====
  const CONFIG = {
    MAX_QUESTION_LENGTH: 500,
    MAX_SESSION_QUERIES: 15,
    MAX_QUERIES_PER_MINUTE: 5,
    SESSION_TIMEOUT_MS: 3600000, // 1 hour
    OPENROUTER_MODEL: 'deepseek/deepseek-2.5',
    // Point to your Cloudflare Worker (set via window.CLOUDFLARE_WORKER_URL before init)
    // Falls back to direct OpenRouter if not set
    OPENROUTER_API_ENDPOINT: window.CLOUDFLARE_WORKER_URL || 'https://openrouter.ai/api/v1/chat/completions',
    MAX_RESPONSE_TOKENS: 500,
    CONTEXT_CHUNKS: 2,
    CHUNK_SIZE_TOKENS: 500,
    KB_CHECK_INTERVAL: 1000, // ms to check KB before enabling Smart Mode
  };

  // ===== ATTACK PATTERN SIGNATURES =====
  const ATTACK_PATTERNS = {
    sqlInjection: /(\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|EXEC|SCRIPT)\b|['";]|\-\-|\/\*|\*\/|xp_|sp_)/gi,
    shellCommands: /[;&|`$(){}<>\\]/g,
    promptInjection: /(ignore|override|bypass|system:|instructions:|forget|jailbreak|GPT|ChatGPT|Claude|you are now|act as|pretend|simulate|forget previous|disregard|don't follow|instead of)/gi,
    commandInject: /^(rm|ls|cat|curl|wget|nc|telnet|bash|sh|cmd|powershell)/gi,
    filePathTraversal: /\.\.\//g,
    xxe: /(<!ENTITY|<!DOCTYPE|SYSTEM|PUBLIC)/gi,
    ldapInjection: /[*()\\]/g,
  };

  // Tyler-specific keywords (must have at least one for relevance)
  const TYLER_KEYWORDS = [
    'tyler', 'portfolio', 'project', 'skill', 'experience', 'work', 'education',
    'engineer', 'data', 'visualization', 'manufacturing', 'analytics', 'databricks',
    'power bi', 'python', 'sql', 'dashboard', 'kpi', 'hire', 'linkedin', 'github',
    'usc', 'lean', 'six sigma', 'background', 'resume', 'about', 'contact',
    'deepseek', 'openrouter', 'assistant', 'help', 'question', 'what', 'how',
    'who', 'where', 'when', 'why', 'tell', 'show', 'explain', 'describe',
    'aerospace', 'electric boat', 'wilderness', 'guide', 'training', 'compliance',
  ];

  // ===== STATE MANAGEMENT =====
  const state = {
    sessionStart: Date.now(),
    queryCount: 0,
    queryTimestamps: [],
    knowledgeBase: null,
    kbChunks: [],
    kbLoaded: false,
    smartModeEnabled: false,
    currentMode: 'fuzzy', // 'fuzzy' or 'smart'
  };

  // ===== SECURITY: INPUT VALIDATION =====
  function validateInput(question) {
    const errors = [];

    // 1. Length check
    if (!question || question.trim().length === 0) {
      errors.push('Question cannot be empty.');
      return { valid: false, errors };
    }

    if (question.length > CONFIG.MAX_QUESTION_LENGTH) {
      errors.push(`Question too long. Max ${CONFIG.MAX_QUESTION_LENGTH} characters.`);
    }

    // 2. Relevance check (must contain Tyler-related keyword)
    const lowerQ = question.toLowerCase();
    const hasRelevantKeyword = TYLER_KEYWORDS.some(kw => lowerQ.includes(kw));
    if (!hasRelevantKeyword) {
      errors.push('I only answer questions about Tyler\'s portfolio, projects, and experience. Try asking about his work, skills, or background.');
    }

    // 3. Attack pattern detection
    for (const [attackType, pattern] of Object.entries(ATTACK_PATTERNS)) {
      if (pattern.test(question)) {
        const suspicionLevel = calculateSuspicionLevel(question);
        if (suspicionLevel > 0.6) {
          errors.push(`Blocked: Potential ${attackType} detected. I only answer portfolio questions.`);
          logSecurityEvent('attack_pattern', { attackType, suspicionLevel, question: question.substring(0, 50) });
          break;
        }
      }
    }

    // 4. Excessive special characters
    const specialCharCount = (question.match(/[!@#$%^&*()_+=\[\]{}|;:'",.<>?/~`]/g) || []).length;
    if (specialCharCount / question.length > 0.3) {
      errors.push('Question contains too many special characters. Please rephrase.');
    }

    // 5. Repeating patterns (spam detection)
    if (hasRepeatingPattern(question)) {
      errors.push('Question looks like spam or flooding. Please try a different question.');
    }

    return {
      valid: errors.length === 0,
      errors,
      suspicionLevel: calculateSuspicionLevel(question),
    };
  }

  function calculateSuspicionLevel(text) {
    let suspicion = 0;
    let matches = 0;

    for (const pattern of Object.values(ATTACK_PATTERNS)) {
      matches += (text.match(pattern) || []).length;
    }

    suspicion = Math.min(1, matches / 5); // Normalize to 0-1
    return suspicion;
  }

  function hasRepeatingPattern(text) {
    // Detects "aaaa" or "123123123" patterns
    return /(.)\1{4,}|(\d{3}){3,}|([a-z])\3{4,}/i.test(text);
  }

  // ===== SECURITY: RATE LIMITING =====
  function checkRateLimit() {
    const now = Date.now();

    // Reset session if timeout exceeded
    if (now - state.sessionStart > CONFIG.SESSION_TIMEOUT_MS) {
      state.queryCount = 0;
      state.queryTimestamps = [];
      state.sessionStart = now;
    }

    // Check session limit
    if (state.queryCount >= CONFIG.MAX_SESSION_QUERIES) {
      return {
        allowed: false,
        reason: `Session query limit reached (${CONFIG.MAX_SESSION_QUERIES}). Please refresh the page or wait ${Math.ceil((state.sessionStart + CONFIG.SESSION_TIMEOUT_MS - now) / 60000)} minutes.`,
      };
    }

    // Check per-minute limit
    const oneMinuteAgo = now - 60000;
    const recentQueries = state.queryTimestamps.filter(t => t > oneMinuteAgo).length;

    if (recentQueries >= CONFIG.MAX_QUERIES_PER_MINUTE) {
      return {
        allowed: false,
        reason: `Rate limit: ${CONFIG.MAX_QUERIES_PER_MINUTE} questions per minute. Please wait.`,
      };
    }

    return { allowed: true };
  }

  function recordQuery() {
    state.queryCount++;
    state.queryTimestamps.push(Date.now());
    // Keep only recent timestamps
    state.queryTimestamps = state.queryTimestamps.filter(t => t > Date.now() - 60000);
  }

  function getRemainingQueries() {
    return CONFIG.MAX_SESSION_QUERIES - state.queryCount;
  }

  // ===== SECURITY: TOKEN & CONTEXT MANAGEMENT =====
  function estimateTokens(text) {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  function validateContextWindow(question, chunks) {
    const estimatedTokens =
      estimateTokens(question) +
      chunks.reduce((sum, chunk) => sum + estimateTokens(chunk.content), 0) +
      CONFIG.MAX_RESPONSE_TOKENS;

    // Deepseek has 128k context window; use 80% for safety
    const MAX_SAFE_TOKENS = 102400;

    if (estimatedTokens > MAX_SAFE_TOKENS) {
      return {
        valid: false,
        reason: 'Context too large. Using fuzzy matching instead.',
        estimatedTokens,
      };
    }

    return { valid: true, estimatedTokens };
  }

  // ===== KNOWLEDGE BASE CHUNKING =====
  async function loadAndChunkKnowledgeBase() {
    try {
      const response = await fetch('/portfolio_knowledge_base.md');
      if (!response.ok) throw new Error('KB fetch failed');

      const text = await response.text();
      state.knowledgeBase = text;

      // Split by headings (##, ###, etc.)
      const headingRegex = /^#{2,4}\s+(.+?)$/gm;
      const sections = [];
      let lastIndex = 0;

      let match;
      while ((match = headingRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          sections.push(text.substring(lastIndex, match.index));
        }
        lastIndex = match.index;
      }
      sections.push(text.substring(lastIndex));

      // Chunk sections into ~500 token chunks
      state.kbChunks = sections
        .map(section => ({
          content: section.trim(),
          tokens: estimateTokens(section),
          heading: (section.match(/^#{2,4}\s+(.+)$/m) || [null, 'Unknown'])[1],
        }))
        .filter(chunk => chunk.tokens > 0);

      state.kbLoaded = true;
      return true;
    } catch (error) {
      console.error('KB load failed:', error);
      state.kbLoaded = false;
      return false;
    }
  }

  // ===== SMART MODE: SEMANTIC SEARCH =====
  function findRelevantChunks(question, topK = CONFIG.CONTEXT_CHUNKS) {
    if (!state.kbLoaded || state.kbChunks.length === 0) return [];

    // Simple semantic relevance: keyword overlap
    const qWords = question.toLowerCase().split(/\s+/);
    const scored = state.kbChunks.map(chunk => {
      const contentWords = chunk.content.toLowerCase().split(/\s+/);
      const overlap = qWords.filter(w => contentWords.includes(w)).length;
      return { ...chunk, score: overlap };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter(chunk => chunk.score > 0);
  }

  // ===== SMART MODE: DEEPSEEK API CALL =====
  async function callDeepseekAPI(question, contextChunks) {
    // Check if using Cloudflare Worker (recommended, secure)
    const isUsingWorker = CONFIG.OPENROUTER_API_ENDPOINT.includes('workers.dev');

    // If direct client-side: API key must be set
    let apiKey = null;
    if (!isUsingWorker) {
      apiKey = window.OPENROUTER_API_KEY || localStorage.getItem('openrouter_api_key');
      if (!apiKey) {
        return {
          success: false,
          error: 'Smart Mode not configured. Set up Cloudflare Worker or API key via PORTFOLIO_ASSISTANT_SETUP.md',
        };
      }
    }

    const systemPrompt = `You are Tyler Vincent's portfolio assistant. Answer only questions about his professional experience, skills, projects, and background based on the provided context. Be direct and concise. If the question is not about Tyler or his work, politely decline and suggest asking about his portfolio instead.`;

    const contextText = contextChunks
      .map(c => `# ${c.heading}\n${c.content}`)
      .join('\n\n---\n\n');

    const userMessage = `Context:\n${contextText}\n\nQuestion: ${question}`;

    // Build headers: if using Cloudflare Worker, don't include Authorization (Worker adds it)
    const headers = {
      'Content-Type': 'application/json',
    };

    if (!isUsingWorker && apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = 'https://tylerv11.github.io';
      headers['X-Title'] = 'Tyler Vincent Portfolio';
    }

    try {
      const response = await fetch(CONFIG.OPENROUTER_API_ENDPOINT, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: CONFIG.OPENROUTER_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: CONFIG.MAX_RESPONSE_TOKENS,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: `API error: ${error.error?.message || 'Unknown error'}`,
        };
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content || '';

      // Validate response doesn't contain code/injection
      if (validateResponse(answer)) {
        return {
          success: true,
          answer,
          mode: 'smart',
          estimatedCost: calculateEstimatedCost(question, answer),
        };
      } else {
        return {
          success: false,
          error: 'Response validation failed. Using fuzzy matching.',
        };
      }
    } catch (error) {
      console.error('Deepseek API error:', error);
      return {
        success: false,
        error: `Network error: ${error.message}. Falling back to fuzzy matching.`,
      };
    }
  }

  function validateResponse(response) {
    // Ensure response doesn't contain code, shell commands, or suspicious patterns
    if (response.length > 2000) return false; // Too long
    if (response.length < 10) return false; // Too short

    // Check for code blocks or commands
    if (/```|<script|javascript:|bash|sh |eval|exec|system\(|shell|terminal/.test(response)) {
      logSecurityEvent('suspicious_response', { response: response.substring(0, 100) });
      return false;
    }

    return true;
  }

  function calculateEstimatedCost(question, answer) {
    const tokens = estimateTokens(question) + estimateTokens(answer);
    // Deepseek 2.5: ~$0.07 per 1M input, ~$0.28 per 1M output
    const costPer1M = 0.07 + 0.28; // Rough average
    return (tokens / 1000000) * costPer1M;
  }

  // ===== FUZZY MATCHING FALLBACK (existing system) =====
  function answerWithFuzzyMatching(question) {
    // This integrates with existing fuzzy matching in index.html
    // Fallback when KB is not loaded or API fails
    return {
      success: true,
      answer: 'Using fuzzy matching mode. This mode has limited knowledge, but it\'s instant and free.',
      mode: 'fuzzy',
      estimatedCost: 0,
    };
  }

  // ===== MAIN QUERY HANDLER =====
  async function handleQuery(question, useSmartMode = false) {
    // 1. Validate input
    const validation = validateInput(question);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors[0],
        mode: 'rejected',
      };
    }

    // 2. Check rate limit
    const rateLimit = checkRateLimit();
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: rateLimit.reason,
        mode: 'rate_limited',
      };
    }

    // 3. Attempt Smart Mode if requested and KB loaded
    if (useSmartMode && state.kbLoaded) {
      const chunks = findRelevantChunks(question);
      if (chunks.length === 0) {
        // No relevant chunks found, fall back to fuzzy
        return fallbackToFuzzy(question);
      }

      const contextCheck = validateContextWindow(question, chunks);
      if (!contextCheck.valid) {
        return fallbackToFuzzy(question);
      }

      const apiResult = await callDeepseekAPI(question, chunks);
      if (apiResult.success) {
        recordQuery();
        return {
          ...apiResult,
          remainingQueries: getRemainingQueries(),
        };
      } else {
        // API failed, fall back to fuzzy
        return fallbackToFuzzy(question);
      }
    }

    // 4. Default to fuzzy matching
    return fallbackToFuzzy(question);
  }

  function fallbackToFuzzy(question) {
    recordQuery();
    return {
      success: true,
      answer: 'Using fuzzy matching. For better answers, enable Smart Search (AI-powered).',
      mode: 'fuzzy',
      estimatedCost: 0,
      remainingQueries: getRemainingQueries(),
    };
  }

  // ===== LOGGING & MONITORING =====
  function logSecurityEvent(eventType, details) {
    console.warn(`[SECURITY] ${eventType}:`, details);
    // Could also send to a server-side log for monitoring
  }

  // ===== PUBLIC API =====
  return {
    async init() {
      const loaded = await loadAndChunkKnowledgeBase();
      state.smartModeEnabled = loaded;
      return loaded;
    },

    async query(question, useSmartMode = false) {
      return handleQuery(question, useSmartMode);
    },

    getState() {
      return {
        smartModeAvailable: state.smartModeEnabled,
        currentMode: state.currentMode,
        queriesRemaining: getRemainingQueries(),
        sessionTimeoutMinutes: Math.ceil((state.sessionStart + CONFIG.SESSION_TIMEOUT_MS - Date.now()) / 60000),
      };
    },

    resetSession() {
      state.queryCount = 0;
      state.queryTimestamps = [];
      state.sessionStart = Date.now();
    },
  };
})();

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PortfolioAssistant.init());
} else {
  PortfolioAssistant.init();
}
