/**
 * PORTFOLIO ASSISTANT — Enhanced Fuzzy Matching System
 * Intelligently parses and matches against ctx.md
 *
 * Security: Comprehensive guardrails against injection, jailbreak, rate limiting.
 */

const PortfolioAssistant = (() => {
  // ===== CONFIGURATION =====
  const CONFIG = {
    MAX_QUESTION_LENGTH: 500,
    MAX_SESSION_QUERIES: 30,
    MAX_QUERIES_PER_MINUTE: 10,
    SESSION_TIMEOUT_MS: 3600000, // 1 hour
  };

  // ===== ATTACK PATTERN SIGNATURES =====
  const ATTACK_PATTERNS = {
    sqlInjection: /(\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|EXEC|SCRIPT)\b|['";]|\-\-|\/\*|\*\/|xp_|sp_)/gi,
    shellCommands: /[;&|`$(){}<>\\]/g,
    promptInjection: /(ignore|override|bypass|system:|instructions:|forget|jailbreak|GPT|ChatGPT|Claude|you are now|act as|pretend|simulate|forget previous|disregard|don't follow|instead of)/gi,
    commandInject: /^(rm|ls|cat|curl|wget|nc|telnet|bash|sh|cmd|powershell)/gi,
    filePathTraversal: /\.\.\//g,
  };

  // Tyler-specific keywords (must have at least one for relevance)
  const TYLER_KEYWORDS = [
    'tyler', 'portfolio', 'project', 'skill', 'experience', 'work', 'education',
    'engineer', 'data', 'visualization', 'manufacturing', 'analytics', 'databricks',
    'power bi', 'python', 'sql', 'dashboard', 'kpi', 'hire', 'linkedin', 'github',
    'usc', 'lean', 'six sigma', 'background', 'resume', 'about', 'contact',
    'assistant', 'help', 'question', 'what', 'how', 'who', 'where', 'when', 'why',
    'tell', 'show', 'explain', 'describe', 'aerospace', 'electric boat', 'wilderness',
    'guide', 'training', 'compliance', 'strength', 'weakness', 'project', 'challenge',
    'impact', 'leadership', 'governance', 'ai', 'machine learning', 'coaching',
  ];

  // ===== STATE MANAGEMENT =====
  const state = {
    sessionStart: Date.now(),
    queryCount: 0,
    queryTimestamps: [],
    knowledgeBase: null,
    kbCategories: {},
    kbLoaded: false,
    currentMode: 'fuzzy',
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
          logSecurityEvent('attack_pattern', { attackType, suspicionLevel });
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
      errors.push('Question looks like spam. Please try a different question.');
    }

    return {
      valid: errors.length === 0,
      errors,
      suspicionLevel: calculateSuspicionLevel(question),
    };
  }

  function calculateSuspicionLevel(text) {
    let matches = 0;
    for (const pattern of Object.values(ATTACK_PATTERNS)) {
      matches += (text.match(pattern) || []).length;
    }
    return Math.min(1, matches / 5);
  }

  function hasRepeatingPattern(text) {
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
    state.queryTimestamps = state.queryTimestamps.filter(t => t > Date.now() - 60000);
  }

  function getRemainingQueries() {
    return CONFIG.MAX_SESSION_QUERIES - state.queryCount;
  }

  // ===== KNOWLEDGE BASE LOADING & PARSING =====
  async function loadAndParseKnowledgeBase() {
    try {
      const kbUrl = 'https://raw.githubusercontent.com/tylerv11/tylerv11.github.io/main/ctx.md';
      const response = await fetch(kbUrl);
      if (!response.ok) throw new Error(`KB fetch failed: ${response.status}`);

      const text = await response.text();
      state.knowledgeBase = text;

      // Parse into categories by heading
      const sections = text.split(/^## /m);

      state.kbCategories = {
        'professional_summary': extractSection(text, 'Professional Summary'),
        'technical_skills': extractSection(text, 'Core Technical Skills'),
        'projects': extractSection(text, 'Major Projects'),
        'architecture': extractSection(text, 'Technical Architecture'),
        'impact': extractSection(text, 'Impact Summary'),
        'leadership': extractSection(text, 'Leadership & Coaching'),
        'strategic_themes': extractSection(text, 'Strategic Themes'),
        'career_interests': extractSection(text, 'Career Interests'),
        'full_kb': text,
      };

      state.kbLoaded = true;
      return true;
    } catch (error) {
      console.error('KB load failed:', error);
      state.kbLoaded = false;
      return false;
    }
  }

  function extractSection(text, heading) {
    const regex = new RegExp(`## ${heading}[\\s\\S]*?(?=^## |$)`, 'm');
    const match = text.match(regex);
    return match ? match[0] : '';
  }

  // ===== INTELLIGENT FUZZY MATCHING WITH NARRATIVE FORMATTING =====
  function findBestAnswerInKB(question) {
    const lowerQ = question.toLowerCase();
    const words = lowerQ.split(/\s+/).filter(w => w.length > 2);

    // Category routing based on question intent
    let category = 'full_kb';
    if (lowerQ.includes('strength') || lowerQ.includes('strong') || lowerQ.includes('best at') || lowerQ.includes('excel')) {
      category = 'strategic_themes';
    }
    if (lowerQ.includes('weakness') || lowerQ.includes('weak') || lowerQ.includes('challenge') || lowerQ.includes('struggle')) {
      category = 'strategic_themes';
    }
    if (lowerQ.includes('project') || lowerQ.includes('built') || lowerQ.includes('build') || lowerQ.includes('work on') || lowerQ.includes('created')) {
      category = 'projects';
    }
    if (lowerQ.includes('skill') || lowerQ.includes('tech') || lowerQ.includes('language') || lowerQ.includes('tools') || lowerQ.includes('platform')) {
      category = 'technical_skills';
    }
    if (lowerQ.includes('leadership') || lowerQ.includes('team') || lowerQ.includes('coaching') || lowerQ.includes('manage') || lowerQ.includes('mentor') || lowerQ.includes('lead')) {
      category = 'leadership';
    }
    if (lowerQ.includes('govern') || lowerQ.includes('compliance') || lowerQ.includes('architecture') || lowerQ.includes('design') || lowerQ.includes('model')) {
      category = 'architecture';
    }
    if (lowerQ.includes('impact') || lowerQ.includes('scale') || lowerQ.includes('metric') || lowerQ.includes('result') || lowerQ.includes('outcome')) {
      category = 'impact';
    }
    if (lowerQ.includes('interest') || lowerQ.includes('career') || lowerQ.includes('future') || lowerQ.includes('next') || lowerQ.includes('growth')) {
      category = 'career_interests';
    }
    if (lowerQ.includes('summary') || lowerQ.includes('overview') || lowerQ.includes('about') || lowerQ.includes('who')) {
      category = 'professional_summary';
    }

    const categoryText = state.kbCategories[category] || state.kbCategories['full_kb'];

    // Extract and score relevant snippets
    const snippets = extractRelevantSnippets(categoryText, words);
    if (snippets.length > 0) {
      return formatSnippetsAsAnswer(snippets, question);
    }

    // Fallback to category summary
    return formatCategorySummary(categoryText, category);
  }

  function extractRelevantSnippets(text, keywords) {
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 20);
    const scored = paragraphs.map(para => {
      const paraLower = para.toLowerCase();
      let score = 0;
      keywords.forEach(word => {
        const wordCount = (paraLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
        score += wordCount * (word.length / 5);
      });
      return { text: para, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(s => s.text);
  }

  function formatSnippetsAsAnswer(snippets, question) {
    // Clean up markdown formatting and create narrative answer
    let answer = snippets
      .map(s => s.replace(/^#+\s+/gm, '').trim())
      .filter(s => s.length > 0)
      .join('\n\n');

    // Limit length
    if (answer.length > 800) {
      answer = answer.substring(0, 800).trim() + '...';
    }

    return answer;
  }

  function formatCategorySummary(categoryText, category) {
    const cleaned = categoryText.replace(/^#+\s+/gm, '').trim();
    let summary = cleaned.substring(0, 700).trim();
    if (cleaned.length > 700) summary += '...';
    return summary;
  }

  // ===== MAIN QUERY HANDLER =====
  function handleQuery(question) {
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

    // 3. Find answer using hybrid approach
    recordQuery();

    // Try to find answer from curated KB first (best results)
    let answer = findAnswerInCuratedKB(question);

    // If no good match in curated KB, try knowledge base parsing
    if (!answer && state.kbLoaded) {
      answer = findBestAnswerInKB(question);
    }

    // Fallback if nothing found
    if (!answer) {
      answer = 'Great question! I\'m not sure I have a direct answer for that one. Try asking about Tyler\'s projects, KPIs, skills, industries, or working style. Or reach out directly at tylervincent@alumni.usc.edu.';
    }

    return {
      success: true,
      answer,
      mode: 'fuzzy',
      remainingQueries: getRemainingQueries(),
    };
  }


  // ===== LOGGING =====
  function logSecurityEvent(eventType, details) {
    console.log(`[SECURITY] ${eventType}:`, details);
  }

  // ===== PUBLIC API =====
  return {
    init: async () => {
      await loadAndParseKnowledgeBase();
    },
    handleQuery,
    getState: () => ({
      queryCount: state.queryCount,
      queriesRemaining: getRemainingQueries(),
      sessionTimeoutMinutes: Math.ceil((CONFIG.SESSION_TIMEOUT_MS - (Date.now() - state.sessionStart)) / 60000),
      kbLoaded: state.kbLoaded,
    }),
  };
})();

// Auto-initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    PortfolioAssistant.init();
  });
} else {
  PortfolioAssistant.init();
}
