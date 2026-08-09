/**
 * PORTFOLIO ASSISTANT — Enhanced Fuzzy Matching System
 * Intelligently parses and matches against ctx.md
 *
 * Security: Comprehensive guardrails against injection, jailbreak, rate limiting.
 */

// Single source of truth for the curated Q&A knowledge base, shared by
// every page's chatbot (index.html, education.html, ...) so answers can
// never drift out of sync between pages again.
// House style: every answer is a direct capability statement about
// Tyler right now - never a narrated anecdote ("in an interview...",
// "when asked..."). The reader is evaluating him, not reviewing his
// interview history.
window.TYLER_KB = [
    // KPIs
    { keys: ['hours saved','hours','annual hours','time saved'], answer: '15,000+ hrs/yr of manual reconciliation and out-of-compliance risk eliminated — a delivered outcome across 23+ global sites, not a projection. Achieved by engineering the enterprise training qualification system with CTE-based renewal logic across 15M+ records and dynamic RLS semantic models.' },
    { keys: ['records','data modeled','records modeled','15m','15 million','100m','source records'], answer: '100M+ source records processed daily — ERP, MES, LMS, LIMS systems consolidated and distilled into 15M+ records with full business context for users. Dynamic RLS semantic models reduce cardinality without losing business context, keeping models performant at scale.' },
    { keys: ['6.5m','business opportunity','value stream','sprint','opportunity identified'], answer: 'Tyler uncovered $6.5M in business opportunity during a site-wide sprint at Takeda by translating event-based production data into digital value stream maps and manufacturing analytics — tracking throughput, float, and process drift using validated Lean Six Sigma metrics (Cpk, float) in SQL, DAX, and QlikScript. Validated with stakeholders and presented to site leadership.' },
    { keys: ['data products','products shipped','dashboards','65'], answer: '65+ data products shipped: 40+ governed datasets, 25+ reports, 10 apps, 3 AI agents (training compliance, process drift detection, manpower resource leveling), and 7 Computer Vision deployments with custom-trained algorithms.' },
    { keys: ['coached','trained','mentored','people coached','37'], answer: '37+ people directly coached in Power BI, SQL, and data modeling - 24 at Takeda, 6 at Chewy, 4 at General Dynamics, and others across sites. This doesn\'t count coaching during product rollouts. Tyler believes data literacy compounds - teaching one person multiplies impact.' },
    { keys: ['region','regions','international','global','country','countries','japan','singapore','vietnam','malaysia','canada'], answer: 'Tyler has deployed data products across 6 regions: USA (Los Angeles + Groton CT), Singapore, Malaysia, Vietnam, Canada, and Japan — including site visits, manufacturing evaluations, key stakeholder presentations, and international relations. Work spans pharma, defense, e-commerce, SaaS, aerospace, and outdoor education. Countries he\'s interfaced with through international teams is roughly double this number.' },

    // Projects
    { keys: ['algorithm','optimization','satellite','scheduling','aerospace','technical project'], answer: 'At The Aerospace Corporation, I built a scheduling algorithm to coordinate ground antenna dishes tracking 100+ satellites and deep space objects across the globe in real time. The core challenge: at any given minute, I needed to know each satellite\'s position and the exact azimuth/elevation each antenna had to point to in order to connect. I built a Time-Position Matrix spanning 100,000+ data cells to solve this, structurally similar to a Traveling Salesman Problem, but for satellite connectivity instead of routing. The result optimized the shortest path to connect every satellite within a 24-hour window and cut down antenna resurveying. This was my senior thesis project, and it won an Engineering Faculty Award.' },
    { keys: ['satellite','aerospace','algorithm','traveling salesman','antenna','scheduling'], answer: 'At the Aerospace Corporation, Tyler created a "Time Position Matrix" tracking 100+ satellites every minute of the day - azimuth and elevation for each antenna dish, for every satellite, at every moment. From this he built a multi-step optimization (similar to the Traveling Salesman Problem) to schedule the shortest path connecting all satellite contacts in a 24-hour window. Deployed on a Raspberry Pi. 100,000+ cell matrix.' },
    { keys: ['takeda','pharma','pharmaceutical','manufacturing analytics','throughput','bottleneck','distribution'], answer: 'At Takeda, the raw signal is manufacturing telemetry, batch, session, and process-step events streaming off ERP, MES, LMS, and LIMS at different velocities and reliability profiles. Tyler decides system by system what deserves a tight ingestion SLA (compliance-facing reporting, technician-facing writeback) versus what can tolerate batch, then carries that decision through governance via silver-to-gold Databricks pipelines with dynamic RLS, validated in a GxP-regulated environment before it is trusted for compliance reporting. He also replaced average-based reporting with distribution-driven analysis (P20/P50/P90) because averages were masking real performance signals. That reframing plus a Flask-based writeback app capturing technician inputs against prepopulated batch context cut cycle times 27% (30 to 22 min). Serves 1,500-2,000 monthly active users daily.' },
    { keys: ['chewy','dual monitor','ergonomics','e-commerce'], answer: 'At Chewy, Tyler ran a controlled ergonomics study to answer a real business question: do dual monitors actually improve productivity for fast-paced e-commerce operations agents? He designed the measurement protocol, ran the statistical analysis, and delivered quantified workspace recommendations. Evidence-based decision-making applied to workspace design.' },
    { keys: ['electric boat','general dynamics','submarine','six sigma','nuclear','security clearance'], answer: 'At Electric Boat (General Dynamics), Tyler held a security clearance and applied Six Sigma Black Belt methods to nuclear submarine industrial sites. He redesigned work center layouts to maximize throughput, built a knowledge base for welders and machinists, and bridged engineering and floor teams - working directly with the people doing the physical work.' },
    { keys: ['saas','startup','computer vision','cctv','ai program manager','deployments'], answer: 'As AI Program Manager at a Singaporean SaaS startup, Tyler led Computer Vision programs using object recognition on CCTV footage for real-time analytics - delivered across 8 international deployments for commercial and government clients on 3+ continents. He coordinated cross-cultural engineering and delivery teams across Singapore, Malaysia, Vietnam, and beyond.' },
    { keys: ['spot','ios','fitness','app','product','wireframe'], answer: 'Tyler led a USC product team to design SPOT - an iOS fitness tracker using Hierarchical Task Analysis to quantify and prioritize user behaviors. He took it through the full product cycle: research, spec writing, user flows, and interactive wireframes ready for development handoff.' },
    { keys: ['wilderness','expedition','guide','canada','canoe','leadership'], answer: 'Tyler spent seasons as a Senior Expedition Guide leading 9–12 day canoe treks into remote Canadian wilderness. He trained 15 employees in outdoor education, crisis management, and team development. In his junior role, he also reduced operational costs by $15k+ through equipment lifecycle management. Leadership under real stakes - no signal, no backup.' },

    // Skills / approach
    { keys: ['tech stack','tyler\'s tech stack','tools','stack','skills','skill','technologies'], answer: 'Tyler\'s stack ranked by depth of experience:<br><br>1. SQL<br>Daily driver across every role. Complex CTEs, window functions, event sequencing, performance tuning at scale.<br><br>2. Python<br>Optimization algorithms, statistical analysis, automation scripts, Databricks notebooks.<br><br>3. HTML / CSS / JavaScript<br>This portfolio is proof.<br><br>4. Databricks / Delta Lake<br>Pipeline engineering, medallion architecture, Unity Catalog, pipeline orchestration, Delta writeback applications.<br><br>5. Power BI<br>Semantic model design, DAX, RLS, Copilot instruction layers, VertiPaq optimization, incremental refresh.<br><br>6. Flask<br>Web applications for data entry and analytics writeback. Databricks-integrated apps for technician delay tracking with prepopulated batch context.<br><br>7. LLMs / AI Tooling<br>Hub-and-spoke multi-agent system (OpenClaw) built on M4 Mac with MCP, Ollama, Claude, DeepSeek, Mistral, and Qwen. Copilot instruction layers, semantic guardrails, Discord as control surface.<br><br>8. macOS<br>Dedicated standard-profile agent environment on M4 Mac Mini running local models via Ollama with sandboxed MCP servers and no-sudo security design.<br><br>9. Azure<br>Cloud data platform, enterprise integrations.<br><br>10. Snowflake<br>Data warehousing and query layer.<br><br>11. QlikSense / QlikScript<br>Manufacturing analytics, value stream mapping, process drift analysis.<br><br>12. Tableau<br>Prior deployments and legacy migrations.<br><br>13. ETL / ELT<br>Data pipeline design and orchestration patterns.<br><br>14. Star Schema Modeling<br>Dimensional modeling and semantic model design.<br><br>Certifications: Six Sigma Black Belt, Agile PM, Model Context Protocol, CPR/First Aid' },
    { keys: ['data engineering','engineering','databricks','delta lake','pipelines','transformations','etl','data pipeline','sql','incremental refresh','idempotent writes','orchestration'], answer: 'The raw signal is manufacturing telemetry — batch, session, and process-step events streaming off ERP, MES, LMS, and LIMS at different velocities and reliability profiles. Tyler decides system by system what deserves a tight ingestion SLA (compliance-facing reporting, technician-facing writeback) versus what can tolerate batch, then carries that decision through governance via silver-to-gold Databricks pipelines with dynamic RLS, validated in a GxP-regulated environment before it is trusted for compliance reporting. He also replaced average-based reporting with distribution-driven analysis (P20/P50/P90) because averages were masking real performance signals. That reframing plus a Flask-based writeback app capturing technician inputs against prepopulated batch context cut cycle times 27% (30 to 22 min). Serves 1,500-2,000 monthly active users daily.' },
    { keys: ['recent work','what he been','up to','lately','ai council','automation','workflow','constraints','creative'], answer: 'Most recently, Tyler built an AI Council to help automate routine workflows and increase productivity across teams. The constraint: work within existing systems, no greenfield tooling. That\'s where creativity comes in - identifying high-value automations that fit the system, sequencing them for maximum impact. It\'s been great to work within constraints and get creative building solutions that actually compound. The goal is turning routine work into decision-focused time so teams can focus on what matters.' },
    { keys: ['strength','strengths','working style','approach','how do you work'], answer: 'Tyler is self-driven, intellectually curious, and builds for the "so what" - not just technically correct answers but insights that change decisions. He\'s a chameleon communicator: comfortable with welders, data engineers, and C-suite in the same day. He comes prepared, thinks independently, and thrives in ambiguous, cross-functional environments.' },
    { keys: ['analytical thinking','analytical','problem solving','complex problem'], answer: 'Tyler approaches problems by first asking what decision needs to be made, then working backwards to what data actually matters. At Takeda he replaced average-based metrics with distribution-driven analysis (P20/P50/P90) because averages were masking real performance signals. At Aerospace Corp he built a 100,000-cell time-position matrix to solve a satellite scheduling problem similar to the Traveling Salesman Problem.' },
    { keys: ['industry','industries','sector'], answer: 'Tyler has delivered across pharma manufacturing (Takeda), nuclear defense (Electric Boat/General Dynamics), SaaS AI (Singaporean startup), e-commerce (Chewy), aerospace (Aerospace Corporation), and outdoor leadership (Canadian wilderness). Six industries, different constraints, same principle: use data to make better decisions.' },

    // Scale, tooling depth, gap-honesty
    { keys: ['scale','big tech scale','enterprise scale','spark','data lake','large scale','scope'], answer: 'Tyler\'s scope looks single-site on paper because GxP pharma constrains architecture by design, not because of a capability ceiling. He runs silver-to-gold Databricks pipelines against 100M+ source records daily, distilled to 15M+ governed records, with dynamic RLS spanning 23+ global sites. The constraint is regulatory validation overhead, not scale of the underlying engineering.' },
    { keys: ['star schema','dimensional modeling','fact table','dimension table','scd','slowly changing dimension'], answer: 'Tyler designs star schemas from scratch when there is no existing model to inherit. FRAC Performance Board: fact table on production events, dimensions on batch, equipment, step type, crew shift. He built and validated the event framework himself with Automation Engineering before modeling it.' },
    { keys: ['dbt','airflow','kafka','snowflake experience','vector store','pinecone','gaps','tools you dont know','flink','similar tools'], answer: 'Tyler hasn\'t used dbt, Airflow, Kafka, Flink, or Snowflake inside a vendor-contracted role, but he has built the equivalent function himself. On Plutus Markets, his personal investing intelligence platform, he runs Spark Structured Streaming for real-time ingestion (Kafka/Flink\'s job) and DuckDB/Pandas batch pipelines for SEC, FRED, and CBOE data feeding a composite signal engine with a weekly backtest override. His Databricks silver-to-gold pattern at Takeda is the same layered-transformation discipline dbt formalizes into staging, intermediate, and mart layers, and he can architect that layering with correct incremental materialization trade-offs on request. The gap is vendor exposure to a specific company\'s contract stack, not the underlying engineering pattern.' },

    // Work ethic & leadership
    { keys: ['work ethic','ethic','dedicated','commitment','reliability','dependable'], answer: 'Tyler\'s work ethic is built on ownership - if it\'s his responsibility, it ships with quality. He ships systems that work *and* that people trust. He\'ll work nights on a Lean Six Sigma project, train 15 guides in the wilderness, or spend weeks optimizing a SQL query. But he\'s not grinding for grinding\'s sake - he\'s solving the actual problem that matters. He shows up prepared, asks good questions, and delivers measurable outcomes.' },
    { keys: ['leadership','leader','leadership style','lead','leading teams'], answer: 'Tyler\'s leadership style is hands-on and credibility-first. He leads by example - if he asks welders to follow a new process, he\'s spent time in the shop understanding their constraints. He trains people (37+ directly at Takeda/Chewy/Electric Boat), then trusts them to execute. He removes blockers, celebrates wins, and keeps the "why" visible so people understand how their work compounds. He\'s led in the wilderness with no backup (real stakes) and in enterprise with 100+ stakeholders (complex politics). Same principle: earn trust, communicate clearly, deliver.' },
    { keys: ['how did he make','build','website','portfolio','design','code'], answer: 'Tyler built this portfolio entirely from scratch using HTML/CSS/JavaScript - no templates, no builders, no frameworks. The cursor is a custom SVG. The matrix code rain in the background is a canvas animation. The skill bubbles on mobile rotate in a spiral with custom physics. The robot assistant (yep, that\'s me) is a keyword-matching knowledge base with 30+ pre-loaded answers. The whole thing is versioned on GitHub and auto-deploys on push. It\'s a living resume - every interaction teaches something about how he thinks. Even the funny question you\'re reading now is exactly what he means by "build for the so what."' },
    { keys: ['funny','joke','laugh','humor','easter egg'], answer: '😄 You found it. This portfolio isn\'t just information - it\'s personality. Tyler could have put a static PDF online, but instead he built an interactive experience, trained an AI assistant, added rotating skill bubbles on mobile, and buried easter eggs like this. That\'s how he approaches work too: technically sound + thoughtfully designed + a little bit delightful. Also, if you ask me anything I don\'t know, I\'ll tell you - there\'s no fake confidence here.' },
    { keys: ['why hire tyler','why hire','why tyler','hire him','should i hire','recruit','candidate','differentiator','unique','what makes tyler'], answer: 'What makes Tyler worth hiring: (1) He moves across the full stack — from raw ingestion and pipelines to executive dashboards, from SQL to Python to Power BI to product design. (2) He has credibility in high-stakes fields — nuclear defense, GxP pharma manufacturing, aerospace — where a wrong ingestion or governance call has real consequences. (3) He\'s a translator, equally fluent with welders, data engineers, and C-suite. (4) He builds systems people actually trust and use, not just systems that are technically correct. (5) He teaches (37+ people trained), so his impact compounds past his own output. (6) He asks "so what do we actually need to decide?" before writing a line of code — that question is worth more than 10 people who execute without asking it.' },

    // Contact / next steps
    { keys: ['contact','email','phone','reach','talk','calendly','interview'], answer: 'Reach Tyler at tylervincent@alumni.usc.edu or (469) 243-0073. Also on LinkedIn: linkedin.com/in/tyler-vincent11' },
    { keys: ['resume','cv'], answer: 'Tyler\'s resume isn\'t linked directly here, but his full work history is on the page - each project card shows the role, problem, approach, and outcomes. For the full PDF resume, reach out at tylervincent@alumni.usc.edu.' },
    { keys: ['education','usc','university','degree','southern california'], answer: 'Tyler is a USC (University of Southern California) Trojan - Industrial & Systems Engineering, with coursework spanning optimization, product design, economics, and human factors.' },

    // Open-ended fallbacks
    { keys: ['tell me about','who is tyler','about tyler','who are you'], answer: 'Tyler Vincent is a Sr. Data and Analytics Engineer who\'s built data products, pipelines, and tools across pharma, defense, SaaS, e-commerce, and aerospace. He helps teams work faster and make better decisions - combining data engineering depth with the communication range to make that work stick across organizations.' },
    { keys: ['curious','learning','interested in','passion','what do you enjoy','learning now'], answer: 'Tyler is currently exploring: (1) AI Council - building systems to automate workflows and increase team productivity through intelligent orchestration. (2) Device firmware compatibility - flashing and maintaining older devices (iPads, Kindles, etc.) to work with current formats and software. (3) Network infrastructure - looking at NAS (network-attached storage) and self-hosting solutions for long-term data management and independence. (4) Consultations - helping others apply technical solutions to their unique constraints. He\'s passionate about taking what he\'s learned in enterprise settings and applying it to personal projects and consultations - where you can iterate faster and see impact immediately.' },
];


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
