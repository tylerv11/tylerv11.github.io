# Portfolio Knowledge Base — FY2025 Annual Review
# Analytics & Data Engineering — Manufacturing & Life Sciences
# 
# USAGE: This file is the RAG source for the portfolio assistant chatbot.
# It answers questions about skills, projects, impact, and technical contributions.
# All employer-identifying names, internal system names, and colleague names have been anonymized.
#
# ANONYMIZATION MAP (do not publish this section — remove before deploying):
# - Employer name → a global biopharmaceutical manufacturer (major global biopharmaceutical manufacturer)
# - RTMS → Scheduling & Planning System
# - FRAC / Fractionation Analytics → Manufacturing Cycle Time Analytics
# - FRAC Performance Board → Manufacturing Cycle Time Dashboard  
# - SuccessFactors → Enterprise Learning Management System (LMS)
# - EDB / Enterprise Data Backbone → Enterprise Data Platform
# - DeltaV → Process Control System
# - CCURE → Access Control System
# - AMIRA / PIMS → Legacy Event Tracking Systems
# - MES → Manufacturing Execution System
# - JDE → ERP System
# - Dataiku → Dataiku (public product, kept as-is)
# - Power BI → Power BI (public product, kept as-is)
# - Databricks → Databricks (public product, kept as-is)
# - Internal URLs, SharePoint links, Teams links → removed
# - All colleague names → replaced with functional roles
# - All site-specific identifiers (LA, Van Nuys) → [Manufacturing Site]

---

## Working Thesis

In FY2025, I expanded from being a strong technical builder into a broader organizational enabler who shaped how teams use data, how analytics solutions are governed, and how site and global stakeholders align around sustainable, enterprise-aligned platforms. My work did not stop at delivering dashboards or ad hoc analysis. I built repeatable data products, pipelines, standards, training, and governance patterns that reduced manual effort, improved trust in decision-making, and strengthened the long-term digital capability of the organization.

A consistent theme in my work this year was building solutions that are durable, validated, and scalable. I partnered across Manufacturing, Business Excellence, Automation Engineering, Reliability, Learning & Development, Quality, Supply Chain, Digital, and global platform teams to ensure that analytics were not only technically sound but also aligned to business process reality, enterprise governance expectations, and long-term ownership models. I also invested heavily in coaching others, documenting logic, and reducing single-person dependency so that teams can use and sustain these capabilities over time.

---

## Professional Summary

I am a Data Visualization & Analytics Engineer specializing in manufacturing analytics, enterprise data pipelines, and BI development for life sciences organizations. My work combines hands-on data engineering (Python, SQL, Databricks) with business intelligence development (Power BI, DAX, semantic modeling) and Lean Six Sigma process thinking. I hold a Lean Six Sigma Black Belt and a degree in Industrial & Systems Engineering. I am largely self-taught in data engineering and have operated as both the data engineer and analytics lead for a major manufacturing site — building pipelines, owning semantic models, coaching users, and driving governance alignment simultaneously.

---

## Core Technical Skills

- **Languages & Tools:** Python, SQL (T-SQL, Databricks SQL), DAX, PySpark
- **Platforms:** Databricks (Delta Lake, Unity Catalog, Databricks Apps), Power BI (semantic modeling, RLS, Copilot instruction layers), Dataiku, Tableau, SharePoint, Power Platform (Automate, Canvas Apps)
- **Data Engineering:** Delta pipelines, ETL/ELT design, fuzzy matching, event-based time series modeling, medallion architecture alignment, streaming vs. batch patterns
- **Visualization:** Power BI (enterprise-scale, RLS, incremental refresh, semantic model optimization), Tableau, Qlik (legacy migration experience)
- **AI / Agents:** Copilot for Power BI, SharePoint agents, Copilot Studio custom connector design, LLM instruction layer engineering for domain-specific chatbots
- **Process & Methods:** Lean Six Sigma Black Belt, Digital Value Stream Mapping, throughput modeling, statistical analysis, DMAIC, OEE principles
- **Governance:** Row-level security design, Unity Catalog compliance, SOP-aligned documentation, data lifecycle management

---

## Major Projects & Accomplishments

### 1. Enterprise Training Compliance Dashboard (Global Scale)

**What it is:** I helped build, mature, and operationalize a global enterprise qualification dashboard that modernizes how employee training compliance is monitored across all manufacturing sites. What was previously a fragmented, time-intensive process — reliant on static exports, site-specific reports, and manual reconciliation — was replaced with a single, trusted view of qualification status across the organization.

**Technical depth:**
- Consolidated every training assignment and completion on record, regardless of site or age, and applied consistent business logic to determine current qualification status
- Designed renewal-based overdue logic that goes beyond the native LMS "Qualified" flag — the dashboard correctly identifies employees whose qualification records show "Qualified" in the source system but have actually lapsed due to duplicates, overlapping curricula, self-assigned training, or delayed source-system cleanup
- Built parent-child curriculum rollup logic so qualification status correctly aggregates from individual training items up to curriculum-level status for managers
- Designed and implemented row-level security (RLS) with anticipated role tiers: All Access, Self + Direct Reports, and Leader / L&D
- Added an AI instruction layer with standard definitions and column synonyms to enable Copilot for Power BI users to ask free-form questions against the semantic model
- Optimized the semantic model by reducing high-cardinality columns (e.g., converting datetime to date to reduce VertiPaq dictionary size), removing redundant fields, and restructuring relationships to star schema alignment
- Reconnected data sources to Databricks in Import mode with incremental refresh to stabilize refresh behavior and reduce gateway load
- Built "Next Due Training Item" logic to surface the most urgent upcoming or overdue training item per employee, with aging context

**Scale & impact:**
- The dashboard interprets approximately **11 million total training records**, including roughly **575,000 renewal-based qualification records** that historically required manual clarification
- At the primary manufacturing site, eliminated **500+ hours of manual reconciliation annually** by reducing repeated exports, hand-matching, and follow-up validation by supervisors, L&D, and Quality teams
- Conservatively extrapolated across **23+ manufacturing sites**, even a modest 20–30 hours saved per site implies **460–690 hours saved annually** across the network — likely higher at large sites
- Preventing even one training-related deviation per site per year could avoid costs in the range of **$345,000 to over $1 million annually** across 23+ sites, based on industry benchmarks of $15,000–$50,000 per investigation event, excluding regulatory or production delay impacts

**Development effort:** Approximately 200–350 hours over 8–12 weeks elapsed time, primarily single developer, with coordination from L&D, global resources, and data engineers.

**Version history highlights (selected):**
- Added AI (Copilot) instruction layer with synonym mapping and grounding rules to prevent hallucination
- Reworked on-time completion logic to use due-date-based attribution instead of completion-date attribution for renewal cycles
- Added "Next Due Training Item" indicator for proactive risk surfacing
- Improved parent-child qualification rollup measures
- Optimized cardinality and removed redundant fields from the semantic model
- Added RLS framework and began beta testing with site-level security roles
- Built export capability and continuous date filtering for custom period analysis
- Removed deprecated fields after upstream data privacy changes; replaced display names from approved directory source
- Removed EU-coded populations to comply with regional data privacy requirements

---

### 2. Manufacturing Cycle Time Dashboard (Fractionation Analytics)

**What it is:** I own and continuously develop the Manufacturing Cycle Time Dashboard — the enterprise-aligned analytics layer for reviewing cycle time performance, float, bottlenecks, delays, and process drift across hundreds of steps in a complex push-production manufacturing environment. This board serves as the cross-functional "single pane of glass" that aligns Manufacturing, Business Excellence, Process Engineering, Reliability, Automation Engineering, and Scheduling stakeholders around one validated understanding of performance.

**Technical depth:**
- Built a custom event framework from process control and manufacturing execution system historian data, mapping raw phase tags and OPC paths to standardized microstep labels (e.g., start events, end conditions, cleaning classifications)
- Developed Critical Path vs. Non-Critical Path classification logic for each step, including complex double-lot and single-lot distinctions within the same equipment sequence
- Built start-to-start cadence metrics within any given microstep across consecutive lots — reusable measure design that eliminates future one-off measure creation
- Developed rolling median drift detection with configurable thresholds (updated from 9-point to 6-point run rules to reduce noise)
- Integrated delay data from multiple sources — a scheduling & planning system, a legacy delay entry system, and a new Databricks-based writeback app — and anchored alignment on lot + unit operation rather than fragile free-text activity name matching
- Built a float-priority data model table that identifies the most recent qualifying lot per unit op within a rolling 72-hour window, filtering out in-progress lots to provide accurate and actionable slack visibility for schedulers
- Added an LLM instruction layer (Copilot context framework) with detailed definitions for bottlenecks, float, systemic waits, plasma types, microsteps, and double-lot logic — enabling new users to ask free-form questions and receive process-aware responses grounded in the data model
- Maintained version-controlled release cycle with structured beta testing before stakeholder rollout

**Scale & impact:**
- Assuming even a 1–2% improvement in effective throughput utilization across high-volume plasma fractionation pipelines, the framework supports hundreds of additional productive hours annually per facility
- Enables earlier detection of systemic throughput degradation before it fully constrains output, supporting proactive intervention
- Functions as the decision backbone for recurring cross-functional performance review forums attended by department heads
- Aligned Manufacturing, Automation, Business Excellence, and Process Engineering stakeholders around a single validated measurement framework — replacing siloed metrics and inconsistent definitions

**Version history highlights (selected):**
- Built start-vs-start comparison for any two selected steps (e.g., CIP vs. Manual Cleaning starts within the same batch)
- Added RTMS delay reason pareto with scheduler-friendly drilldown to individual delay comments
- Integrated delay data from scheduling system and legacy event tracking systems; anchored on lot + unit op for cross-platform alignment
- Built float-priority model: last qualifying lot per unit op within 72-hour rolling window
- Added process drift overlays with configurable run rule thresholds
- Added HOF bin-processing time data and shift classification metrics
- Designed bottleneck drilldown page with interactive pareto and visual drift flags
- Added Copilot LLM instruction layer ("Fracky") enabling free-form process-aware queries
- Standardized column naming (Micro_Step_Start_Time, End_Time, Duration_Hours)
- Cleaned single/double lot cleaning classifications across filter press unit operations

---

### 3. Workforce Presence & Staffing Analytics (Badge Data Integration)

**What it is:** I built a badge reporting solution to give Supervisors and Scheduling better visibility into daily staffing levels, attendance patterns, movement paths, and manpower allocation by shift.

**Technical depth:**
- Georeferenced physical access control door locations with coordinates to enable spatial path analysis
- Built path ID logic from sequential badge event groupings to model movement patterns within the facility
- Used the enterprise access control system (North Star platform) as the authoritative data source
- Created shift-level staffing counts and facility usage analysis

**Why it matters:** The site cannot increase headcount, so tightening production planning depends on knowing exactly how many people are present on each shift. Improved staffing visibility supports cycle-time stabilization, particularly where manpower variability can introduce 5–10% fluctuations in task execution duration and impact lot cadence. This directly informs scheduling quality, resource shifting, and workload estimation in the Scheduling & Planning System.

---

### 4. Delay Data Entry Application (Databricks Flask App)

**What it is:** I designed and deployed a production-oriented Databricks App using a lightweight Flask framework to enable technician delay data entry directly from the shop floor into the governed analytical data layer.

**Technical depth:**
- Python-based form routing and validation logic within a Databricks App deployment
- URL parameter passing to auto-populate context fields (Batch ID, Process Step) from the source analytics board — reducing manual input and improving data accuracy
- SQL execution from the application layer to insert structured records into Delta Lake tables
- Referential integrity enforcement via joins to batch master and process step reference tables
- Iterative testing using Databricks terminal environments and notebook-driven debugging
- Writes directly into the existing Databricks analytical layer for downstream Power BI reporting (two-hour refresh cycle)

**Why it matters:** This shifts from analytics consumption tooling to full data product engineering — including UI design, data persistence logic, and lifecycle deployment. It solves a real floor-level problem (fragmented delay capture across spreadsheets, legacy notes, and disconnected systems) while aligning to North Star platform architecture. It also shortens the gap between what happened operationally and what leaders can see analytically.

**Impact:** Reducing reconciliation latency by even 1–2 days per major delay investigation improves responsiveness to recurring failure modes and lowers exposure to repeated deviation patterns across similar product campaigns.

---

### 5. AI & Copilot Enablement

**What it is:** I developed and operationalized multiple AI-powered analytics capabilities, treating AI as an extension of governed enterprise data products rather than a novelty layer.

**Contributions:**
- **SharePoint Agent:** Built a SharePoint-based conversational agent for the site's digital team, providing a governed entry point to internal knowledge and process documentation
- **Copilot for Power BI:** Enabled Copilot for report viewers across managed datasets; supplied contextual instruction layers defining metric logic, column synonyms, and grounding rules to improve answer consistency and reduce hallucination
- **Copilot Studio Custom Connector:** Drove architectural discovery for connecting Copilot agents to governed data APIs — identifying required endpoints, OAuth 2.0 + service principal auth patterns, and aligning with enterprise API gateway requirements. Guided platform owners to begin documenting connection patterns for future agent builders
- **LLM Instruction Layer Engineering:** Designed and embedded detailed natural language context layers inside Power BI semantic models so Copilot can interpret domain-specific terminology (manufacturing lot types, process step naming conventions, compliance terminology) without requiring users to know exact column names

**Strategic significance:** This work ties AI enablement to enterprise governance, semantic models, access control, and validated business logic — establishing patterns that future AI builders can inherit rather than reinvent.

---

### 6. Global Data Pipeline & Governance Work

**What it is:** I contributed to enterprise pipeline design and data governance standardization across multiple platforms.

**Contributions:**
- Worked with global data product owner to build enterprise pipelines for an enterprise LMS system covering both GxP and non-GxP training data
- Pushed SAIL-aligned movement of shop floor process control data into governed Databricks pathways
- Migrated legacy delay data from unsupported S3-based patterns into governed Databricks Delta structures for lifecycle management and Unity Catalog compliance
- Flagged governance and lifecycle risk when undocumented coworker-created tables or S3-based patterns threatened to become embedded in critical manufacturing workflows (confirmed by platform governance team as non-compliant)
- Submitted demand requests to connect legacy process control SQL Server data into enterprise Databricks platform
- Created 15 dataflows for site datathon; several evolved into real operational projects (e.g., scrap analysis from ERP now managed by Supply Chain, work order review for Reliability Engineering)

---

### 7. Additional Dashboards & Reporting Products

I own or have significantly contributed to a portfolio of approximately 25+ site analytics boards, including:

- **Enterprise Training Compliance Board** (global, multi-site, described above)
- **Manufacturing Cycle Time Dashboard** (described above)
- **Workforce / Badge Analytics Board** (described above)
- **TDF Bin Processing Dashboard:** Cycle time monitoring for bin-to-bin processing steps, built with validated event framework aligned across Manufacturing, Operations Engineering, Automation, and Reliability stakeholders
- **Cinryze Cycle Time Tracker:** Product-specific cycle time monitoring with MES-integrated data, coaching employees to pull data and add their own measures
- **Enterprise Compliance Board:** Daily and weekly view for investigators and engineering teams
- **EHS Dashboard:** Environmental Health & Safety metrics
- **IT Infrastructure Boards (VM Servers, SNOW Tickets):** Operational visibility for IT infrastructure and incident tracking
- **LabWare Dashboards:** Near-real-time lab sample data with a direct gateway to the source system (bypassing the standard 4-hour refresh delay), enabling production to resume once samples are approved
- **Alarms & Recipe Holds Board:** Equipment issue monitoring for Reliability Engineering and Business Excellence to target repairs and maintenance prioritization
- **Scorecard Alerts & Automated Report Distribution:** Power BI scorecard alerts and automated report sends for department managers and directors

---

## Technical Architecture & Engineering Contributions

### Data Model Optimization (Semantic Model Tuning)
- Reduced high-cardinality columns through surrogate key restructuring and removal of redundant timestamp-level joins
- Implemented star-schema-aligned relationship patterns to prevent bidirectional filter ambiguity and improve query plan efficiency
- Refactored calculated columns into measures to reduce memory footprint
- Segmented historical vs. active datasets to improve refresh performance
- These optimizations improved report load times, reduced gateway refresh risk, and improved scalability for datasets containing millions of records

### Advanced SQL & Python Engineering
- Built complex SQL logic for event sequencing, shift classification, cycle-time decomposition, and badge path duration modeling
- Developed Python writeback workflows in Databricks for the delay entry application
- Built fuzzy matching pipeline (Python) to tag manufacturing batch event log rows with standardized milestone labels, resolving ambiguous free-text descriptions
- Designed multi-CTE SQL queries parsing free-text delay descriptions into structured microstep identifiers with full lookup table alignment

### Development Pipeline Discipline
- Version-controlled release cycles for Power BI boards and dataflows
- Structured testing phases before stakeholder rollout
- Documentation of schema changes, logic updates, and metric definitions
- Dependency evaluation across upstream data sources (Manufacturing Execution System, Scheduling System, LMS, Access Control System, ERP)
- Alignment with enterprise platform ownership boundaries to ensure sustainment feasibility

---

## Impact Summary (Quantified)

| Area | Metric |
|---|---|
| Training compliance hours saved (one site) | 500+ hours annually |
| Training records interpreted by dashboard | ~11 million |
| Renewal-based qualification records requiring logic | ~575,000 |
| Potential avoided deviation cost (23+ sites) | $345K–$1M+ annually |
| Employees coached in Power BI, SQL, analytics | ~20 |
| Dataflows built for site datathon | 15 |
| Hours of formal professional development | 39 |
| Site dashboards supported / troubleshot | 25+ |
| Global sites covered by training compliance dashboard | 23+ |

---

## Leadership & Coaching

- Coached approximately **20 employees** in Power BI, SQL, ETL/pipelining, dashboard syntax, and permissions — spanning Manufacturing, Supply Chain, Quality, and Engineering stakeholders
- Mentored a junior analyst for **four months** with applied, hands-on instruction
- Created all structure, materials, answer keys, datasets, and access setup for the site's annual **Datathon** — enabling multiple teams to successfully transition into working with enterprise Databricks data
- Led the Manufacturing Cycle Time review forum, teaching Lean Six Sigma principles to cross-functional department leads
- Delivered a Copilot for Power BI knowledge-sharing session, becoming the site subject matter expert for AI-assisted analytics
- Provided Lean Six Sigma Black Belt coaching to Operational Excellence and Manufacturing teams on digital value stream mapping, throughput modeling, statistical analysis, and data-driven scheduling

---

## Strategic Themes

**Enterprise Alignment Over Custom Tools:** I consistently steered local solutions toward enterprise-aligned North Star platforms and architectures. When teams wanted highly customized tools for immediate needs, my role was to meet the business need while also ensuring the solution would be supportable, governable, and scalable.

**Governance as a Feature:** I treated data governance — RLS design, Unity Catalog compliance, SOP documentation, lifecycle management — as integral to delivery quality, not as overhead. This protects the organization from building critical initiatives on fragile or noncompliant foundations.

**AI Built on Governed Foundations:** I positioned AI enablement as an extension of enterprise data products, not a disconnected experiment. Copilot outputs are probabilistic and require grounding — I designed the instruction layers, guardrails, and semantic model foundations that make AI-assisted analytics trustworthy.

**Reducing Single-Person Dependency:** A core goal in every major product was ensuring teams could understand, maintain, and extend the solution without being dependent on one person. This included documentation, coaching, shared ownership structures, and clear version histories.

---

## Areas for Growth

- Continuing to simplify and package complex work earlier for broader audiences — translating technical logic into lightweight business-facing summaries, decision logs, and rollout plans
- Formalizing role-based ownership and sustainment plans earlier in the product lifecycle so scaling happens more smoothly as adoption grows

---

## Career Interests & Trajectory

I am interested in roles that combine enterprise data strategy, manufacturing analytics, AI enablement, and scalable data product ownership. I am actively growing in:
- Modern data platform engineering (Databricks, Delta Lake, Unity Catalog)
- AI-enabled analytics and agent development
- Cross-site and global analytics platform ownership
- Senior data engineering and analytics leadership roles in life sciences, manufacturing, or adjacent industries

I hold a **Lean Six Sigma Black Belt** and a degree in **Industrial & Systems Engineering** from a major research university. My background as a former outdoor expedition guide — working with special education youth in high-pressure wilderness environments — informs how I approach teaching, communication, and building trust across diverse groups.
