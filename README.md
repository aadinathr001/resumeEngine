# ResumeIQ — Multi-Provider Evidence-Based Resume & Job Matching Engine

ResumeIQ is a production-grade, local-first intelligence platform that evaluates candidate resumes against job descriptions through a multi-stage deterministic pipeline. Instead of relying on a black-box LLM match percentage, ResumeIQ uses language models strictly for structured parsing and grounded reasoning, while employing deterministic code for canonical skill normalization, evidence verification, and weighted compatibility scoring.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The architectural direction incorporates the user's explicit preferences for visual design, engine runtime, and multi-provider AI abstraction.

- **Visual Design Identity**: **Technical Swiss** — Crisp pure white backgrounds (`#FFFFFF`), high-contrast graphite structural surfaces and typography (`#0F172A`, `#334155`), hairline graphite dividers (`#E2E8F0`), and emerald accents (`#059669`) strictly for verified status states. Tabular numerals (`tabular-nums`) are enforced across all scores and telemetry. Zero generic dark gradients, zero neon pills, and zero AI slop.
- **Multi-Provider AI Architecture**: Pluggable provider interface supporting **Local Ollama** (`qwen3:8b`), **Groq Cloud** (`openai/gpt-oss-20b`), **OpenAI** (`gpt-4o-mini`). Each provider call records rich execution telemetry: latency in milliseconds, token counts (input/output), schema validation status, retry count, and error diagnostics.
- **Workflow Priority**: **End-to-End Pipeline** — Seamless workflow covering PDF/text ingestion, structured schema validation with human review & correction, alias-based skill taxonomy normalization, evidence verification with resume citations, deterministic weighted scoring, and grounded AI recommendations.
- **Deterministic Scoring Invariant**: Language models never invent scores. All numerical percentages and category breakdowns are computed deterministically via testable algorithms using verified citations from the candidate profile.

---

## 1. Overview & Core Concept

### What It Does
ResumeIQ transforms unstructured resume PDFs and raw job descriptions into strictly validated JSON schemas (emulating Pydantic models). It resolves skill variations to a canonical taxonomy (e.g. mapping "Retrieval-Augmented Generation" to "RAG", and distinguishing "Docker" from "Kubernetes"), tests every job requirement against candidate evidence citations (projects, experience, education), computes an unyielding mathematical compatibility score, and generates grounded, hallucination-free career recommendations.

### Target Audience & Persona
- **AI & Software Engineers**: Technical candidates aiming to diagnose resume gaps against specific job requirements with transparent reasoning.
- **Technical Recruiters & Hiring Managers**: Reviewers who need verifiable proof of qualifications rather than superficial keyword matching.
- **Portfolio Evaluators**: Observers assessing clean system architecture, deterministic validation, and multi-model benchmarking.

### Key Value
- **Zero Hallucination Scoring**: Decouples language understanding from decision-making.
- **Traceable Proof**: Every matched or partial skill cites the exact text and source section from the candidate's resume.
- **Model Benchmarking**: Compare how different providers (Ollama vs. Groq) perform on the exact same resume extraction task.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Dashboard & Metric Overview**:
   - High-density KPI strip: Total Saved Profiles, Active Job Specs, Matches Executed, Average Score, Provider Health.
   - Recent Match Runs list with instantaneous drill-down into complete reports.
2. **AI Engine Configuration & Telemetry**:
   - Provider switcher: Ollama (Local), Groq (Cloud), OpenAI,
   - Provider connectivity prober with real-time health indicator.
   - Execution Log inspector displaying latency (ms), token consumption, schema retry count, and raw payloads.
3. **Resume Management & Ingestion**:
   - Dual input: Drag-and-drop text/PDF parser or paste raw resume text.
   - Multi-stage extraction with interactive **Human Review & Schema Editor**: review extracted contact details, education, categorized skills, and work history before committing to database.
4. **Job Intelligence & Requirement Extraction**:
   - Paste job posting; automatic separation into Mandatory Requirements, Preferred Qualifications, Frameworks, and Responsibilities.
5. **Evidence-Based Matching & Compatibility Inspector**:
   - Select candidate + job description $\rightarrow$ Run Match Analysis.
   - Detailed Scorecard: 0–100 Weighted Score with Category Breakdown (Technical Skills 35%, Experience 25%, Projects 20%, Education 10%, Keywords 10%).
   - Requirement matrix: Status tags (Matched / Partial / Not Evidenced), Normalized canonical skill, Match strength (0.0–1.0), and Quoted resume evidence citation.
6. **Resume Improvement Simulator**:
   - Interactive what-if scenario tool: toggle hypothetical verified achievements (e.g. "Add demonstrable AWS project", "Dockerize API") to observe deterministic score changes in real time.
7. **Actionable Recommendations**:
   - Top 3 verified strengths, Missing mandatory warnings, Priority growth areas, and Resume phrasing suggestions strictly grounded in real candidate achievements.

### Visual Identity & Theme Tokens
- **Style**: Technical Swiss / Utilitarian Engineering Workspace.
- **Palette**:
  - Canvas: `#F8FAFC` to `#FFFFFF` (pure crisp white panels)
  - Text & Headers: `#0F172A` (deep slate / graphite)
  - Secondary Text: `#475569` (slate 600)
  - Borders & Hairlines: `#E2E8F0` (1px subtle graphite dividers)
  - Status / Accent Emerald: `#059669` (primary actions & verified matches)
  - Warning / Partial Amber: `#D97706` (partial evidence)
  - Missing Crimson: `#DC2626` (unmet mandatory requirements)
- **Typography**: Neo-grotesque display headers, clean readable body text, and tabular numerals (`font-mono tabular-nums`) for all scores, dates, and execution metrics.
- **Anti-Slop Discipline**: No decorative pulsing dots, no code-comment titles (`// 01`), no purple gradients, no floating pill sandwiches, and no glassmorphism.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Architecture of the AI Provider Layer
- **Chosen Approach**: A unified server-side and client-pluggable `AIProviderManager` interface with adapters for:
  1. *Local Ollama*: Communicating with `http://localhost:11434` with configurable models (`qwen3:8b`, `llama3`).
  2. *Groq Cloud*: Dedicated adapter using Groq API endpoints and Groq models (`openai/gpt-oss-20b`, `llama-3.3-70b-versatile`).
  3. *OpenAI*: Adapter for standard OpenAI endpoints (`gpt-4o-mini`).
- **Why**: Enables zero-friction immediate use while providing complete local and cloud provider switching for portfolio evaluation.
- **Alternatives Considered**: Forcing a local-only Ollama requirement would fail if the local daemon isn't running on the user's host port 11434; the multi-provider fallback guarantees 100% operational uptime.

### Decision 2: Deterministic Rule-Based Scoring Engine
- **Chosen Approach**: Strict mathematical formula ($S = \sum w_i \times c_i$) where each requirement has explicit point weights, direct match gives 1.0, related partial match gives 0.5, and missing gives 0.0. Missing mandatory requirements trigger an explicit warning flag regardless of overall score.
- **Why**: Prevents LLM variance and guarantees reproducible, audit-proof evaluations.

### Decision 3: Canonical Skill Taxonomy & Alias Normalization
- **Chosen Approach**: Dedicated client/server dictionary with canonical names, verified aliases, and directional relationships (e.g., PostgreSQL $\rightarrow$ SQL, PyTorch $\rightarrow$ Torch, RAG $\rightarrow$ Retrieval-Augmented Generation).
- **Why**: Pure vector embedding cosine similarity frequently confuses related-but-not-interchangeable skills (such as Docker vs. Kubernetes). Explicit alias lookup ensures semantic precision.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ResumeIQ Frontend (React)                       │
│  ┌──────────────┬──────────────────┬─────────────────┬──────────────┐  │
│  │  Overview    │  Resume Ingestion│  Job Library    │ Match Report │  │
│  │  Dashboard   │  & Schema Editor │  & Requirements │ & Simulator  │  │
│  └──────┬───────┴────────┬─────────┴────────┬────────┴──────┬───────┘  │
└─────────┼────────────────┼──────────────────┼───────────────┼──────────┘
          │                │                  │               │           
          ▼                ▼                  ▼               ▼           
┌────────────────────────────────────────────────────────────────────────┐
│               Deterministic Processing Engine (Core Layer)             │
│  ┌───────────────────────┬──────────────────────────────────────────┐  │
│  │ Skill Normalizer      │ Canonical taxonomy & alias dictionary    │  │
│  ├───────────────────────┼──────────────────────────────────────────┤  │
│  │ Evidence Verifier     │ Substring & section citation validation  │  │
│  ├───────────────────────┼──────────────────────────────────────────┤  │
│  │ Scoring Engine        │ Configurable category weight math        │  │
│  ├───────────────────────┼──────────────────────────────────────────┤  │
│  │ Benchmark Suite       │ Accuracy & precision evaluation runner   │  │
│  └───────────────────────┴──────────────────────────────────────────┘  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │                                    
                                     ▼                                    
┌───────────────────────────────────────────────────────────────────────┐
│                     Multi-Provider AI Engine                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                     Base Provider Interface                     │  │
│  └──────┬───────────────┬─────────────────────┬────────────────────┘  │
│         ▼               ▼                     ▼                       │
│   ┌───────────┐   ┌───────────┐         ┌───────────┐                 │
│   │  Ollama   │   │   Groq    │         │  OpenAI   │                 │
│   │  (Local)  │   │  (Cloud)  │         │  (Cloud)  │                 │
│   └───────────┘   └───────────┘         └───────────                  │
└────────────────────────────────────┬──────────────────────────────────┘
                                     │                                    
                                     ▼                                    
┌────────────────────────────────────────────────────────────────────────┐
│                  Relational Storage & Telemetry Store                  │
│  • Resumes & Candidate Profiles (Validated JSONB Schema)               │
│  • Jobs & Classified Requirements (Mandatory vs. Preferred)            │
│  • Match Runs & Requirement Evaluations (Audited Citations)            │
│  • AI Execution Logs (Provider, Model, Latency ms, Tokens, Validity)   │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Data Models

1. **CandidateProfile**:
   - `id`, `name`, `email`, `title`, `summary`
   - `skills`: `Array<{ name, canonicalName, category, evidenceText, sourceSection, confidence }>`
   - `experience`: `Array<{ company, role, startDate, endDate, achievements }>`
   - `education`: `Array<{ institution, degree, field, year }>`
   - `projects`: `Array<{ title, description, technologies, outcome }>`

2. **JobRequirement**:
   - `id`, `jobId`, `skillName`, `canonicalSkill`, `isMandatory`, `minYearsExperience`, `category`

3. **MatchRun**:
   - `id`, `resumeId`, `jobId`, `overallScore`, `categoryScores`, `missingMandatoryCount`
   - `evaluations`: `Array<{ requirement, canonicalName, status, matchStrength, evidenceCitation, source, page }>`
   - `recommendations`: `{ topStrengths, missingMandatory, growthOpportunities, wordingSuggestions }>`
   - `executionLog`: `{ provider, model, latencyMs, inputTokens, outputTokens, schemaValid, retries }>`

4. **SkillTaxonomy**:
   - Version-controlled registry with canonical names, aliases, categories, and hierarchical relations.

---

## 5. Verification Plan

1. **Automated Schema Validation**:
   - Ensure all model outputs conform strictly to the candidate and job schemas.
   - Test fallback and retry mechanics when malformed outputs occur.
2. **Deterministic Scoring Rigor**:
   - Verify that identical resume and job pairs consistently yield the identical score down to the decimal point across multiple runs.
3. **Multi-Provider Connectivity**:
   - Verify Ollama and Groq provider request formatting and error handling.
4. **Evidence Citation Authenticity**:
   - Confirm that every matched requirement links directly to verifiable text in the candidate profile.
5. **UI & Accessibility Check**:
   - Verify compliance with the Technical Swiss aesthetic (contrast ratios, tabular figures, no UI slop, zero dead clicks).
