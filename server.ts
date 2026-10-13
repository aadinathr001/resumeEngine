import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health & Provider Check endpoint
app.get('/api/health', async (req, res) => {
  const geminiAvailable = Boolean(process.env.GEMINI_API_KEY);
  const groqEnvKeyAvailable = Boolean(process.env.GROQ_API_KEY);
  const openaiEnvKeyAvailable = Boolean(process.env.OPENAI_API_KEY);

  // Check Ollama local status
  let ollamaAvailable = false;
  const ollamaUrl = req.query.ollamaUrl as string || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const check = await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    ollamaAvailable = check.ok;
  } catch {
    ollamaAvailable = false;
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      geminiKeyLoaded: Boolean(process.env.GEMINI_API_KEY),
      groqKeyLoaded: Boolean(process.env.GROQ_API_KEY),
      openaiKeyLoaded: Boolean(process.env.OPENAI_API_KEY),
      defaultProvider: process.env.AI_PROVIDER || 'gemini',
    },
    providers: {
      gemini: {
        available: geminiAvailable,
        envLoaded: Boolean(process.env.GEMINI_API_KEY),
        defaultModel: 'gemini-3.8-flash',
        isLocal: false,
        name: 'Google Gemini (Server-Proxied)',
      },
      ollama: {
        available: ollamaAvailable,
        defaultModel: process.env.OLLAMA_MODEL || 'qwen3:8b',
        endpoint: ollamaUrl,
        isLocal: true,
        name: 'Ollama (Local LLM)',
      },
      groq: {
        available: groqEnvKeyAvailable,
        envLoaded: Boolean(process.env.GROQ_API_KEY),
        defaultModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        isLocal: false,
        name: 'Groq Cloud (Fast LPUs)',
      },
      openai: {
        available: openaiEnvKeyAvailable,
        envLoaded: Boolean(process.env.OPENAI_API_KEY),
        defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        isLocal: false,
        name: 'OpenAI API',
      },
    },
  });
});

// Connectivity test endpoint
app.post('/api/ai/test-provider', async (req, res) => {
  const { provider, ollamaUrl, ollamaModel, groqApiKey, groqModel, openaiApiKey, openaiModel } = req.body;
  const startTime = Date.now();

  try {
    if (provider === 'gemini') {
      const resp = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Respond with exactly {"status": "ok"}',
        config: {
          responseMimeType: 'application/json',
        },
      });
      const latency = Date.now() - startTime;
      return res.json({
        success: true,
        provider: 'gemini',
        model: 'gemini-3.8-flash',
        latencyMs: latency,
        message: 'Gemini 3.8 Flash operational via server proxy.',
      });
    }

    if (provider === 'ollama') {
      const targetUrl = ollamaUrl || 'http://localhost:11434';
      const targetModel = ollamaModel || 'qwen3:8b';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${targetUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: 'Ping: reply {"status": "ok"}' }],
          format: 'json',
          stream: false,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Ollama returned status ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      const latency = Date.now() - startTime;
      return res.json({
        success: true,
        provider: 'ollama',
        model: targetModel,
        latencyMs: latency,
        message: `Local Ollama connected successfully at ${targetUrl}.`,
      });
    }

    if (provider === 'groq') {
      const apiKey = groqApiKey || process.env.GROQ_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: 'Groq API key not configured. Add GROQ_API_KEY to .env or provider settings.',
        });
      }
      const targetModel = groqModel || 'openai/gpt-oss-20b';
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: 'Reply with JSON: {"status": "ok"}' }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API returned ${response.status}: ${errText}`);
      }
      const latency = Date.now() - startTime;
      return res.json({
        success: true,
        provider: 'groq',
        model: targetModel,
        latencyMs: latency,
        message: `Groq Cloud inference verified with model ${targetModel}.`,
      });
    }

    if (provider === 'openai') {
      const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: 'OpenAI API key not configured.',
        });
      }
      const targetModel = openaiModel || 'gpt-4o-mini';
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: 'Reply with JSON: {"status": "ok"}' }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API returned ${response.status}: ${errText}`);
      }
      const latency = Date.now() - startTime;
      return res.json({
        success: true,
        provider: 'openai',
        model: targetModel,
        latencyMs: latency,
        message: `OpenAI connection verified.`,
      });
    }

    return res.status(400).json({ success: false, error: 'Unknown provider specified.' });
  } catch (err: any) {
    const latency = Date.now() - startTime;
    let friendlyError = err.message || 'Connection test failed';
    if (provider === 'ollama' && (friendlyError.includes('fetch failed') || friendlyError.includes('ECONNREFUSED'))) {
      friendlyError = `Cannot connect to Ollama at ${ollamaUrl || 'http://localhost:11434'} from the cloud container. Since this app is hosted in Cloud Run, the server's localhost refers to the cloud container, not your laptop. Use 'Direct Browser Connection' or use the built-in Gemini provider.`;
    }
    return res.json({
      success: false,
      provider,
      latencyMs: latency,
      error: friendlyError,
    });
  }
});

// Resume Structured Extraction
app.post('/api/ai/extract-resume', async (req, res) => {
  const {
    rawText,
    provider = 'gemini',
    ollamaUrl,
    ollamaModel,
    groqApiKey,
    groqModel,
    openaiApiKey,
    openaiModel,
  } = req.body;

  if (!rawText || rawText.trim().length < 20) {
    return res.status(400).json({ error: 'Resume text is required and must contain at least 20 characters.' });
  }

  const startTime = Date.now();
  let retryCount = 0;
  let modelUsed = '';

  const extractionPrompt = `You are a precision resume information extractor for ResumeIQ.
Extract and convert the candidate resume text into a strictly validated JSON structure.
Do not invent or hallucinate achievements, certifications, or technologies not present in the text.
For every extracted skill, extract the verbatim supporting quote/evidence sentence from the resume text and the section where it was found (projects, experience, skills, or education).

Required JSON structure:
{
  "name": "Candidate Full Name",
  "email": "candidate@example.com",
  "phone": "+1-...",
  "location": "City, Country",
  "targetRole": "Primary Professional Role / Headline",
  "summary": "Concise candidate summary",
  "skills": [
    {
      "name": "Skill Name",
      "canonicalName": "Canonical Normalized Name",
      "category": "Programming" | "AI & ML" | "Cloud & DevOps" | "Web & Backend" | "Databases" | "Tools & Other",
      "evidence": "Verbatim quote or project excerpt demonstrating this skill",
      "sourceSection": "projects" | "experience" | "skills" | "education" | "certifications",
      "confidence": 0.95
    }
  ],
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "startDate": "YYYY or Month YYYY",
      "endDate": "YYYY or Present",
      "isCurrent": false,
      "location": "Location",
      "highlights": ["Key achievement with metrics or technical outcomes"]
    }
  ],
  "education": [
    {
      "institution": "University / School Name",
      "degree": "B.S. / B.Tech / M.S. / etc.",
      "field": "Computer Science / AI / etc.",
      "graduationYear": "YYYY",
      "gpa": "GPA if mentioned"
    }
  ],
  "projects": [
    {
      "title": "Project Title",
      "description": "What the project does",
      "technologies": ["Python", "FastAPI", "etc"],
      "evidenceText": "Implementation details demonstrating engineering capability",
      "url": "Project link if mentioned"
    }
  ],
  "certifications": ["Certification 1"]
}

Resume Text to analyze:
---
${rawText}
---`;

  try {
    let rawJsonResult = '';
    let inTokens = Math.round(rawText.length / 4) + 300;
    let outTokens = 0;

    if (provider === 'gemini') {
      modelUsed = 'gemini-3.8-flash';
      const response = await ai.models.generateContent({
        model: modelUsed,
        contents: extractionPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              location: { type: Type.STRING },
              targetRole: { type: Type.STRING },
              summary: { type: Type.STRING },
              skills: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    canonicalName: { type: Type.STRING },
                    category: { type: Type.STRING },
                    evidence: { type: Type.STRING },
                    sourceSection: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                  },
                  required: ['name', 'category', 'evidence'],
                },
              },
              experience: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    company: { type: Type.STRING },
                    role: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING },
                    isCurrent: { type: Type.BOOLEAN },
                    location: { type: Type.STRING },
                    highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['company', 'role'],
                },
              },
              education: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    institution: { type: Type.STRING },
                    degree: { type: Type.STRING },
                    field: { type: Type.STRING },
                    graduationYear: { type: Type.STRING },
                    gpa: { type: Type.STRING },
                  },
                  required: ['institution', 'degree'],
                },
              },
              projects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
                    evidenceText: { type: Type.STRING },
                    url: { type: Type.STRING },
                  },
                  required: ['title'],
                },
              },
              certifications: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['name', 'skills'],
          },
        },
      });

      rawJsonResult = response.text || '{}';
      outTokens = Math.round(rawJsonResult.length / 4);
    } else if (provider === 'ollama') {
      modelUsed = ollamaModel || 'qwen3:8b';
      const targetUrl = ollamaUrl || 'http://localhost:11434';

      const response = await fetch(`${targetUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelUsed,
          messages: [
            { role: 'system', content: 'You are an accurate resume extraction engine. Return only JSON.' },
            { role: 'user', content: extractionPrompt },
          ],
          format: 'json',
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed with HTTP ${response.status}`);
      }
      const data = await response.json();
      rawJsonResult = data.message?.content || '{}';
      inTokens = data.prompt_eval_count || inTokens;
      outTokens = data.eval_count || Math.round(rawJsonResult.length / 4);
    } else if (provider === 'groq') {
      modelUsed = groqModel || 'openai/gpt-oss-20b';
      const apiKey = groqApiKey || process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error('Groq API Key is not configured.');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelUsed,
          messages: [
            { role: 'system', content: 'You are an accurate resume parser. Extract concise verbatim evidence (under 25 words per evidence field) to ensure complete, valid JSON.' },
            { role: 'user', content: extractionPrompt },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 4096,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = errText;
        try {
          const errObj = JSON.parse(errText);
          if (errObj.error?.message) {
            errMsg = errObj.error.message;
            if (errObj.error?.failed_generation) {
              errMsg += ` (${errObj.error.failed_generation})`;
            }
          }
        } catch {}
        throw new Error(`Groq API returned HTTP ${response.status}: ${errMsg}`);
      }
      const data = await response.json();
      rawJsonResult = data.choices?.[0]?.message?.content || '{}';
      inTokens = data.usage?.prompt_tokens || inTokens;
      outTokens = data.usage?.completion_tokens || Math.round(rawJsonResult.length / 4);
    } else if (provider === 'openai') {
      modelUsed = openaiModel || 'gpt-4o-mini';
      const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OpenAI API Key is not configured.');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelUsed,
          messages: [
            { role: 'system', content: 'You are an accurate resume parser. Always output valid JSON.' },
            { role: 'user', content: extractionPrompt },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI API returned HTTP ${response.status}: ${err}`);
      }
      const data = await response.json();
      rawJsonResult = data.choices?.[0]?.message?.content || '{}';
      inTokens = data.usage?.prompt_tokens || inTokens;
      outTokens = data.usage?.completion_tokens || Math.round(rawJsonResult.length / 4);
    }

    const parsed = JSON.parse(rawJsonResult);
    const latency = Date.now() - startTime;

    // Normalize array fallbacks
    const profile = {
      name: parsed.name || 'Candidate',
      email: parsed.email || '',
      phone: parsed.phone || '',
      location: parsed.location || '',
      targetRole: parsed.targetRole || '',
      summary: parsed.summary || '',
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
    };

    const executionLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      provider,
      model: modelUsed,
      task: 'resume_extraction',
      latencyMs: latency,
      inputTokens: inTokens,
      outputTokens: outTokens,
      schemaValid: true,
      retryCount,
      status: 'completed',
    };

    return res.json({
      success: true,
      profile,
      executionLog,
    });
  } catch (err: any) {
    const latency = Date.now() - startTime;
    const executionLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      provider,
      model: modelUsed,
      task: 'resume_extraction',
      latencyMs: latency,
      inputTokens: Math.round(rawText.length / 4),
      outputTokens: 0,
      schemaValid: false,
      retryCount,
      status: 'failed',
      error: err.message,
    };
    return res.json({
      success: false,
      error: err.message || 'Failed to extract resume',
      executionLog,
    });
  }
});

// Job Description Structured Extraction
app.post('/api/ai/extract-job', async (req, res) => {
  const {
    rawText,
    provider = 'gemini',
    ollamaUrl,
    ollamaModel,
    groqApiKey,
    groqModel,
    openaiApiKey,
    openaiModel,
  } = req.body;

  if (!rawText || rawText.trim().length < 20) {
    return res.status(400).json({ error: 'Job description text is required and must contain at least 20 characters.' });
  }

  const startTime = Date.now();
  let modelUsed = '';

  const jobExtractionPrompt = `You are a technical job description intelligence parser for ResumeIQ.
Analyze the following job description and extract structured requirements.
CRITICAL: You MUST distinguish between:
1. Mandatory qualifications (isMandatory = true): essential requirements, core prerequisites, non-negotiable tech.
2. Preferred qualifications (isMandatory = false): nice-to-haves, pluses, bonus skills, or optional tools.

Output JSON matching this schema:
{
  "title": "Official Job Title",
  "company": "Company Name (or 'Confidential' if unstated)",
  "location": "Job Location or Remote",
  "employmentType": "Full-time / Contract / etc",
  "domain": "Primary Engineering Domain (e.g. AI / Machine Learning, Backend, Data)",
  "minYearsExperienceTotal": 2,
  "preferredEducation": "Bachelor's degree in Computer Science or equivalent",
  "responsibilities": ["Primary day-to-day responsibility 1", "Responsibility 2"],
  "requirements": [
    {
      "name": "Skill or Qualification Name",
      "canonicalName": "Canonical Name (e.g. Python, RAG, AWS, Docker)",
      "category": "Programming" | "AI & ML" | "Cloud & DevOps" | "Web & Backend" | "Databases" | "Education" | "Experience" | "Other",
      "isMandatory": true,
      "minYearsExperience": 2,
      "contextSnippet": "Short excerpt from job description where this is mentioned",
      "weight": 5
    }
  ]
}

Job Posting Text:
---
${rawText}
---`;

  try {
    let rawJsonResult = '';
    let inTokens = Math.round(rawText.length / 4) + 300;
    let outTokens = 0;

    if (provider === 'gemini') {
      modelUsed = 'gemini-3.8-flash';
      const response = await ai.models.generateContent({
        model: modelUsed,
        contents: jobExtractionPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              company: { type: Type.STRING },
              location: { type: Type.STRING },
              employmentType: { type: Type.STRING },
              domain: { type: Type.STRING },
              minYearsExperienceTotal: { type: Type.NUMBER },
              preferredEducation: { type: Type.STRING },
              responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
              requirements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    canonicalName: { type: Type.STRING },
                    category: { type: Type.STRING },
                    isMandatory: { type: Type.BOOLEAN },
                    minYearsExperience: { type: Type.NUMBER },
                    contextSnippet: { type: Type.STRING },
                    weight: { type: Type.NUMBER },
                  },
                  required: ['name', 'category', 'isMandatory'],
                },
              },
            },
            required: ['title', 'requirements'],
          },
        },
      });

      rawJsonResult = response.text || '{}';
      outTokens = Math.round(rawJsonResult.length / 4);
    } else if (provider === 'ollama') {
      modelUsed = ollamaModel || 'qwen3:8b';
      const targetUrl = ollamaUrl || 'http://localhost:11434';

      const response = await fetch(`${targetUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelUsed,
          messages: [
            { role: 'system', content: 'You are an accurate job description parser. Output only valid JSON.' },
            { role: 'user', content: jobExtractionPrompt },
          ],
          format: 'json',
          stream: false,
        }),
      });

      if (!response.ok) throw new Error(`Ollama request failed with HTTP ${response.status}`);
      const data = await response.json();
      rawJsonResult = data.message?.content || '{}';
      inTokens = data.prompt_eval_count || inTokens;
      outTokens = data.eval_count || Math.round(rawJsonResult.length / 4);
    } else if (provider === 'groq') {
      modelUsed = groqModel || 'openai/gpt-oss-20b';
      const apiKey = groqApiKey || process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error('Groq API Key is not configured.');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelUsed,
          messages: [
            { role: 'system', content: 'You are an accurate job parser. Output concise, complete valid JSON.' },
            { role: 'user', content: jobExtractionPrompt },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 4096,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = errText;
        try {
          const errObj = JSON.parse(errText);
          if (errObj.error?.message) errMsg = errObj.error.message;
        } catch {}
        throw new Error(`Groq API returned HTTP ${response.status}: ${errMsg}`);
      }
      const data = await response.json();
      rawJsonResult = data.choices?.[0]?.message?.content || '{}';
      inTokens = data.usage?.prompt_tokens || inTokens;
      outTokens = data.usage?.completion_tokens || Math.round(rawJsonResult.length / 4);
    } else if (provider === 'openai') {
      modelUsed = openaiModel || 'gpt-4o-mini';
      const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OpenAI API Key is not configured.');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelUsed,
          messages: [
            { role: 'system', content: 'You are an accurate job parser. Output valid JSON.' },
            { role: 'user', content: jobExtractionPrompt },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI API returned HTTP ${response.status}: ${err}`);
      }
      const data = await response.json();
      rawJsonResult = data.choices?.[0]?.message?.content || '{}';
      inTokens = data.usage?.prompt_tokens || inTokens;
      outTokens = data.usage?.completion_tokens || Math.round(rawJsonResult.length / 4);
    }

    const parsed = JSON.parse(rawJsonResult);
    const latency = Date.now() - startTime;

    const requirements = (parsed.requirements || []).map((r: any, idx: number) => ({
      id: `req_${Date.now()}_${idx}`,
      name: r.name || 'Requirement',
      canonicalName: r.canonicalName || r.name || 'Requirement',
      category: r.category || 'Programming',
      isMandatory: Boolean(r.isMandatory),
      minYearsExperience: r.minYearsExperience || 0,
      contextSnippet: r.contextSnippet || '',
      weight: r.weight || (r.isMandatory ? 5 : 3),
    }));

    const job = {
      title: parsed.title || 'Software Engineer',
      company: parsed.company || 'Company',
      location: parsed.location || 'Remote',
      employmentType: parsed.employmentType || 'Full-time',
      domain: parsed.domain || 'Software Engineering',
      minYearsExperienceTotal: parsed.minYearsExperienceTotal || 2,
      preferredEducation: parsed.preferredEducation || "Bachelor's Degree",
      responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
      requirements,
    };

    const executionLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      provider,
      model: modelUsed,
      task: 'job_extraction',
      latencyMs: latency,
      inputTokens: inTokens,
      outputTokens: outTokens,
      schemaValid: true,
      retryCount: 0,
      status: 'completed',
    };

    return res.json({
      success: true,
      job,
      executionLog,
    });
  } catch (err: any) {
    const latency = Date.now() - startTime;
    return res.json({
      success: false,
      error: err.message || 'Failed to extract job description',
      executionLog: {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        provider,
        model: modelUsed,
        task: 'job_extraction',
        latencyMs: latency,
        inputTokens: Math.round(rawText.length / 4),
        outputTokens: 0,
        schemaValid: false,
        retryCount: 0,
        status: 'failed',
        error: err.message,
      },
    });
  }
});

// Mount Vite middleware for dev server
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ResumeIQ Server listening on port http://127.0.0.1:${PORT}`);
  });
}

startServer();
