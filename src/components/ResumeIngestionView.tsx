import React, { useState } from 'react';
import { Upload, FileText, Check, AlertCircle, Edit3, Trash2, ArrowRight, Plus, RefreshCw } from 'lucide-react';
import { CandidateProfile, AIProviderType, AIProviderConfig, AIExecutionLog } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface ResumeIngestionViewProps {
  resumes: CandidateProfile[];
  onSaveResume: (profile: CandidateProfile) => void;
  onDeleteResume: (id: string) => void;
  providerConfig: AIProviderConfig;
  onLogExecution: (log: AIExecutionLog) => void;
}

export const ResumeIngestionView: React.FC<ResumeIngestionViewProps> = ({
  resumes,
  onSaveResume,
  onDeleteResume,
  providerConfig,
  onLogExecution,
}) => {
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>(providerConfig.activeProvider);

  // Schema Editor state
  const [editingProfile, setEditingProfile] = useState<CandidateProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('upload');

  // PDF Text Extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setExtractionError(null);

    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let extractedText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          extractedText += `\n--- Page ${i} ---\n` + pageText;
        }

        setRawText(extractedText.trim());
      } catch (err: any) {
        console.error('PDF parsing error:', err);
        setExtractionError(`Failed to parse PDF: ${err.message || 'Corrupt or protected file'}`);
      }
    } else {
      // Plain text file
      const text = await file.text();
      setRawText(text);
    }
  };

  // Run AI Extraction
  const handleExtract = async () => {
    if (!rawText.trim()) {
      setExtractionError('Please provide resume text or upload a document.');
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const response = await fetch('/api/ai/extract-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          provider: selectedProvider,
          ollamaUrl: providerConfig.ollamaUrl,
          ollamaModel: providerConfig.ollamaModel,
          groqApiKey: providerConfig.groqApiKey,
          groqModel: providerConfig.groqModel,
          openaiApiKey: providerConfig.openaiApiKey,
          openaiModel: providerConfig.openaiModel,
        }),
      });

      const resText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error(`Server returned non-JSON response (${response.status}): ${resText.slice(0, 150)}`);
      }

      if (data.executionLog) {
        onLogExecution(data.executionLog);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Extraction failed');
      }

      const newProfile: CandidateProfile = {
        id: `cand_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fileName,
        rawText,
        ...data.profile,
        extractionProvider: selectedProvider,
        extractionModel: data.executionLog?.model,
        isReviewed: false,
      };

      setEditingProfile(newProfile);
    } catch (err: any) {
      setExtractionError(err.message || 'Error occurred during extraction');
    } finally {
      setIsExtracting(false);
    }
  };

  // Commit reviewed profile to storage
  const handleCommitProfile = () => {
    if (!editingProfile) return;
    const finalized: CandidateProfile = {
      ...editingProfile,
      updatedAt: new Date().toISOString(),
      isReviewed: true,
    };
    onSaveResume(finalized);
    setEditingProfile(null);
    setActiveTab('library');
  };

  // Realistic sample loader for testing without manual typing
  const handleLoadSample = () => {
    setFileName('sample_senior_ai_engineer.txt');
    setRawText(`ALEXANDER CHEN
Email: a.chen@alum.mit.edu | Location: Seattle, WA | GitHub: github.com/al-chen

SUMMARY
Senior AI Systems Engineer with 4+ years of production experience designing, training, and deploying distributed LLM applications, retrieval-augmented generation (RAG) pipelines, and low-latency inference services.

TECHNICAL SKILLS
- Languages: Python, SQL, TypeScript, C++, Bash
- AI & ML: RAG, LLMs, PyTorch, LangChain, Transformers, spaCy, Vector Databases (Pinecone, pgvector)
- Cloud & DevOps: AWS (EC2, S3, Lambda), Docker, Kubernetes, CI/CD, Linux
- Backend & Data: FastAPI, PostgreSQL, Redis, REST APIs, Pydantic, SQLAlchemy

PROFESSIONAL EXPERIENCE
Senior AI Engineer | NeuralScale Systems | Seattle, WA
March 2023 – Present
- Architected enterprise RAG system processing 1.4M technical manuals with hybrid vector search and reranking, reducing hallucination rates by 38% and lowering p95 retrieval latency from 450ms to 120ms.
- Built high-throughput Python and FastAPI backend microservices handling 2,500 requests/sec with Docker containerization and Kubernetes cluster auto-scaling.
- Integrated PostgreSQL with pgvector for sub-second similarity queries across 12M embedded documents.

Machine Learning Engineer | Apex Data Labs | San Francisco, CA
June 2021 – February 2023
- Developed and fine-tuned PyTorch vision-language models for automated document parsing, achieving 94.2% extraction precision.
- Engineered automated CI/CD deployment pipelines on AWS using Docker, ECS, and Terraform.

EDUCATION
B.S. in Computer Science | University of Washington
2017 – 2021 | GPA: 3.86/4.0

PROJECTS
DocuQuery — Multi-Document RAG Engine
- Engineered an open-source retrieval system utilizing Python, FastAPI, and Qdrant with semantic chunking and reciprocal rank fusion.
- Benchmarked against standard QA datasets with 91.4% factual accuracy.`);
  };

  return (
    <div className="space-y-6">
      {/* View Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Resume Ingestion & Candidate Profiles
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            PDF ingestion, structured Pydantic schema validation, and human correction workspace.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              activeTab === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ingest & Parse
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              activeTab === 'library' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Saved Profiles ({resumes.length})
          </button>
        </div>
      </div>

      {activeTab === 'upload' && !editingProfile && (
        <div className="space-y-6">
          {/* Ingestion Panel */}
          <div className="bg-white border border-slate-200 rounded p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">1. Document Input</h3>
                <p className="text-xs text-slate-500">
                  Upload a resume PDF or paste raw text below.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium underline cursor-pointer"
                >
                  Load Sample Resume
                </button>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose PDF / Text File</span>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {fileName && (
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Loaded file: <strong className="text-slate-900">{fileName}</strong></span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Resume Raw Text
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste candidate resume content here, or upload a PDF above..."
                rows={10}
                className="w-full text-xs font-mono p-3 border border-slate-200 rounded focus:outline-none focus:border-slate-400 bg-slate-50/50"
              />
            </div>

            {/* Provider Selection for this extraction task */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-700">Extraction Provider:</span>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as AIProviderType)}
                  className="text-xs border border-slate-300 rounded px-2.5 py-1 bg-white text-slate-800"
                >
                  <option value="gemini">Gemini 3.8 Flash (Server Proxied)</option>
                  <option value="ollama">Ollama (Local LLM: {providerConfig.ollamaModel})</option>
                  <option value="groq">Groq Cloud ({providerConfig.groqModel})</option>
                  <option value="openai">OpenAI ({providerConfig.openaiModel})</option>
                </select>
              </div>

              <button
                onClick={handleExtract}
                disabled={isExtracting || !rawText.trim()}
                className="px-5 py-2 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting Structured Schema...</span>
                  </>
                ) : (
                  <>
                    <span>Extract & Validate Schema</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {extractionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{extractionError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Human Review & Pydantic Schema Editor */}
      {editingProfile && (
        <div className="bg-white border border-slate-200 rounded p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="text-xs font-mono text-emerald-700 font-medium">Schema Extracted & Validated</div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                Human Review & Schema Verification
              </h2>
              <p className="text-xs text-slate-500">
                Review and correct extracted candidate data before committing to the database. Prevent LLM extraction errors from polluting deterministic scoring.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingProfile(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitProfile}
                className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Profile to Database</span>
              </button>
            </div>
          </div>

          {/* Contact & Headline */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Candidate Name</label>
              <input
                type="text"
                value={editingProfile.name}
                onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                className="w-full text-xs p-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <input
                type="text"
                value={editingProfile.email}
                onChange={(e) => setEditingProfile({ ...editingProfile, email: e.target.value })}
                className="w-full text-xs p-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Role / Headline</label>
              <input
                type="text"
                value={editingProfile.targetRole || ''}
                onChange={(e) => setEditingProfile({ ...editingProfile, targetRole: e.target.value })}
                className="w-full text-xs p-2 border border-slate-300 rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Summary</label>
            <textarea
              value={editingProfile.summary}
              onChange={(e) => setEditingProfile({ ...editingProfile, summary: e.target.value })}
              rows={2}
              className="w-full text-xs p-2 border border-slate-300 rounded"
            />
          </div>

          {/* Extracted Skills with Verbatim Evidence */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Extracted Skills & Supporting Evidence ({editingProfile.skills.length})
              </h4>
              <button
                onClick={() => {
                  const newSkill = {
                    name: 'New Skill',
                    canonicalName: 'New Skill',
                    category: 'Programming' as const,
                    evidence: 'Demonstrated in resume',
                    sourceSection: 'projects' as const,
                    confidence: 1.0,
                  };
                  setEditingProfile({
                    ...editingProfile,
                    skills: [...editingProfile.skills, newSkill],
                  });
                }}
                className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Skill
              </button>
            </div>

            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-mono uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Skill Name</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Verbatim Evidence Excerpt</th>
                    <th className="py-2 px-3 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {editingProfile.skills.map((skill, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-medium">
                        <input
                          type="text"
                          value={skill.name}
                          onChange={(e) => {
                            const updated = [...editingProfile.skills];
                            updated[idx].name = e.target.value;
                            setEditingProfile({ ...editingProfile, skills: updated });
                          }}
                          className="w-full p-1 border border-transparent hover:border-slate-300 focus:border-slate-400 rounded"
                        />
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        <select
                          value={skill.category}
                          onChange={(e) => {
                            const updated = [...editingProfile.skills];
                            updated[idx].category = e.target.value as any;
                            setEditingProfile({ ...editingProfile, skills: updated });
                          }}
                          className="p-1 border border-transparent hover:border-slate-300 rounded bg-transparent"
                        >
                          <option value="Programming">Programming</option>
                          <option value="AI & ML">AI & ML</option>
                          <option value="Cloud & DevOps">Cloud & DevOps</option>
                          <option value="Web & Backend">Web & Backend</option>
                          <option value="Databases">Databases</option>
                          <option value="Tools & Other">Tools & Other</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        <input
                          type="text"
                          value={skill.evidence}
                          onChange={(e) => {
                            const updated = [...editingProfile.skills];
                            updated[idx].evidence = e.target.value;
                            setEditingProfile({ ...editingProfile, skills: updated });
                          }}
                          className="w-full p-1 border border-transparent hover:border-slate-300 focus:border-slate-400 rounded text-slate-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => {
                            const updated = editingProfile.skills.filter((_, i) => i !== idx);
                            setEditingProfile({ ...editingProfile, skills: updated });
                          }}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Experience Highlights */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2">
              Work Experience ({editingProfile.experience.length})
            </h4>
            <div className="space-y-3">
              {editingProfile.experience.map((exp, idx) => (
                <div key={idx} className="p-3 border border-slate-200 rounded text-xs space-y-2">
                  <div className="flex items-center justify-between font-medium text-slate-900">
                    <span>{exp.role} at {exp.company}</span>
                    <span className="text-slate-400 font-mono">{exp.startDate} – {exp.endDate}</span>
                  </div>
                  <div className="text-slate-600 space-y-1">
                    {exp.highlights.map((h, hIdx) => (
                      <div key={hIdx} className="flex items-start gap-1.5">
                        <span className="text-slate-400">·</span>
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2">
              Demonstrated Projects ({editingProfile.projects.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {editingProfile.projects.map((proj, idx) => (
                <div key={idx} className="p-3 border border-slate-200 rounded text-xs space-y-1">
                  <div className="font-semibold text-slate-900">{proj.title}</div>
                  <p className="text-slate-600">{proj.description}</p>
                  {proj.evidenceText && (
                    <p className="text-slate-500 italic mt-1">Proof: {proj.evidenceText}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2 text-slate-500 font-mono text-[11px]">
                    Technologies: {proj.technologies.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Saved Profiles Library */}
      {activeTab === 'library' && (
        <div className="bg-white border border-slate-200 rounded">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Validated Candidate Profiles
              </h3>
              <p className="text-xs text-slate-500">
                {resumes.length} profiles stored locally. Ready for deterministic job matching.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('upload')}
              className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Add Resume
            </button>
          </div>

          {resumes.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No resumes saved yet. Ingest a resume above to begin.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {resumes.map((profile) => (
                <div key={profile.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{profile.name}</h4>
                      {profile.targetRole && (
                        <span className="text-xs text-slate-500">· {profile.targetRole}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1 max-w-2xl">
                      {profile.summary || 'Profile validated and ready for matching.'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono pt-1">
                      <span>{profile.skills.length} skills</span>
                      <span>·</span>
                      <span>{profile.projects.length} projects</span>
                      <span>·</span>
                      <span>{profile.experience.length} roles</span>
                      {profile.extractionProvider && (
                        <>
                          <span>·</span>
                          <span className="uppercase">{profile.extractionProvider}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditingProfile(profile)}
                      className="px-2.5 py-1 text-xs border border-slate-300 text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                    >
                      Edit Schema
                    </button>
                    <button
                      onClick={() => onDeleteResume(profile.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
