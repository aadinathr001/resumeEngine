import React, { useState } from 'react';
import { Briefcase, Plus, Trash2, Edit3, ArrowRight, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { JobDescription, JobRequirement, AIProviderType, AIProviderConfig, AIExecutionLog } from '../types';

interface JobLibraryViewProps {
  jobs: JobDescription[];
  onSaveJob: (job: JobDescription) => void;
  onDeleteJob: (id: string) => void;
  providerConfig: AIProviderConfig;
  onLogExecution: (log: AIExecutionLog) => void;
}

export const JobLibraryView: React.FC<JobLibraryViewProps> = ({
  jobs,
  onSaveJob,
  onDeleteJob,
  providerConfig,
  onLogExecution,
}) => {
  const [rawText, setRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>(providerConfig.activeProvider);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [editingJob, setEditingJob] = useState<JobDescription | null>(null);

  const handleExtractJob = async () => {
    if (!rawText.trim()) {
      setExtractionError('Please paste a job description.');
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const response = await fetch('/api/ai/extract-job', {
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
        throw new Error(data.error || 'Job requirement extraction failed');
      }

      const newJob: JobDescription = {
        id: `job_${Date.now()}`,
        createdAt: new Date().toISOString(),
        rawText,
        ...data.job,
        extractionProvider: selectedProvider,
        extractionModel: data.executionLog?.model,
      };

      setEditingJob(newJob);
    } catch (err: any) {
      setExtractionError(err.message || 'Error extracting job');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCommitJob = () => {
    if (!editingJob) return;
    onSaveJob(editingJob);
    setEditingJob(null);
    setActiveTab('list');
    setRawText('');
  };

  const handleLoadSampleJob = () => {
    setRawText(`Junior AI Engineer (RAG & Backend Systems)
Company: Cortex Labs
Location: Seattle, WA (Hybrid)

About the Role:
We are looking for a Junior AI Engineer to build, evaluate, and scale retrieval-augmented generation (RAG) pipelines and backend inference microservices. You will work closely with our core machine learning team to turn unstructured enterprise documents into verifiable conversational knowledge bases.

Mandatory Qualifications:
- Bachelor's degree in Computer Science, Software Engineering, or related technical field.
- 1–2 years of practical experience with Python programming.
- Hands-on experience developing and deploying RAG (Retrieval-Augmented Generation) applications and vector indexing.
- Proficiency in relational databases and SQL (PostgreSQL preferred).
- Experience building RESTful APIs using FastAPI or similar Python backend frameworks.

Preferred / Plus Qualifications:
- Familiarity with cloud container deployment using Docker and Kubernetes.
- Experience with cloud services on AWS (S3, EC2, Lambda).
- Experience with PyTorch or Hugging Face Transformers.
- Knowledge of continuous integration and CI/CD pipelines.

Responsibilities:
- Build and maintain low-latency Python backend APIs for LLM generation workflows.
- Implement chunking, embedding generation, and hybrid search with pgvector.
- Write unit and regression tests for prompt pipelines and extraction models.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Job Intelligence & Requirements Library
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Extract structured requirements, separate mandatory vs. preferred skills, and assign deterministic evaluation weights.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              activeTab === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Add Job Spec
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
              activeTab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Saved Jobs ({jobs.length})
          </button>
        </div>
      </div>

      {activeTab === 'create' && !editingJob && (
        <div className="bg-white border border-slate-200 rounded p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Paste Job Description</h3>
              <p className="text-xs text-slate-500">
                The intelligence parser will classify core qualifications and identify mandatory criteria.
              </p>
            </div>
            <button
              onClick={handleLoadSampleJob}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium underline cursor-pointer"
            >
              Load Sample AI Engineer Job
            </button>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste job posting title, responsibilities, and requirements here..."
            rows={10}
            className="w-full text-xs font-mono p-3 border border-slate-200 rounded focus:outline-none focus:border-slate-400 bg-slate-50/50"
          />

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-700">Parser Provider:</span>
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
              onClick={handleExtractJob}
              disabled={isExtracting || !rawText.trim()}
              className="px-5 py-2 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Extracting Requirements...</span>
                </>
              ) : (
                <>
                  <span>Extract & Classify Requirements</span>
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
      )}

      {/* Structured Job Editor */}
      {editingJob && (
        <div className="bg-white border border-slate-200 rounded p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="text-xs font-mono text-emerald-700 font-medium">Requirements Extracted</div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                Requirement Calibration & Verification
              </h2>
              <p className="text-xs text-slate-500">
                Verify mandatory versus preferred qualification tags. Mandatory requirements enforce a warning penalty if unevidenced.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingJob(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitJob}
                className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Job to Library</span>
              </button>
            </div>
          </div>

          {/* Job Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                value={editingJob.title}
                onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
                className="w-full text-xs p-2 border border-slate-300 rounded font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Company</label>
              <input
                type="text"
                value={editingJob.company}
                onChange={(e) => setEditingJob({ ...editingJob, company: e.target.value })}
                className="w-full text-xs p-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Domain</label>
              <input
                type="text"
                value={editingJob.domain}
                onChange={(e) => setEditingJob({ ...editingJob, domain: e.target.value })}
                className="w-full text-xs p-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Min Exp (Years)</label>
              <input
                type="number"
                value={editingJob.minYearsExperienceTotal}
                onChange={(e) => setEditingJob({ ...editingJob, minYearsExperienceTotal: parseInt(e.target.value, 10) || 0 })}
                className="w-full text-xs p-2 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          {/* Requirements Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Extracted Job Requirements ({editingJob.requirements.length})
              </h4>
              <button
                onClick={() => {
                  const newReq: JobRequirement = {
                    id: `req_${Date.now()}`,
                    name: 'New Requirement',
                    canonicalName: 'New Requirement',
                    category: 'Programming',
                    isMandatory: true,
                    weight: 5,
                  };
                  setEditingJob({
                    ...editingJob,
                    requirements: [...editingJob.requirements, newReq],
                  });
                }}
                className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Requirement
              </button>
            </div>

            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-mono uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Requirement</th>
                    <th className="py-2 px-3">Canonical Skill</th>
                    <th className="py-2 px-3">Classification</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {editingJob.requirements.map((req, idx) => (
                    <tr key={req.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-medium">
                        <input
                          type="text"
                          value={req.name}
                          onChange={(e) => {
                            const updated = [...editingJob.requirements];
                            updated[idx].name = e.target.value;
                            setEditingJob({ ...editingJob, requirements: updated });
                          }}
                          className="w-full p-1 border border-transparent hover:border-slate-300 rounded"
                        />
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono">
                        <input
                          type="text"
                          value={req.canonicalName}
                          onChange={(e) => {
                            const updated = [...editingJob.requirements];
                            updated[idx].canonicalName = e.target.value;
                            setEditingJob({ ...editingJob, requirements: updated });
                          }}
                          className="w-full p-1 border border-transparent hover:border-slate-300 rounded"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...editingJob.requirements];
                            updated[idx].isMandatory = !updated[idx].isMandatory;
                            setEditingJob({ ...editingJob, requirements: updated });
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                            req.isMandatory
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {req.isMandatory ? 'Mandatory' : 'Preferred'}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        <select
                          value={req.category}
                          onChange={(e) => {
                            const updated = [...editingJob.requirements];
                            updated[idx].category = e.target.value as any;
                            setEditingJob({ ...editingJob, requirements: updated });
                          }}
                          className="p-1 border border-transparent hover:border-slate-300 rounded bg-transparent"
                        >
                          <option value="Programming">Programming</option>
                          <option value="AI & ML">AI & ML</option>
                          <option value="Cloud & DevOps">Cloud & DevOps</option>
                          <option value="Web & Backend">Web & Backend</option>
                          <option value="Databases">Databases</option>
                          <option value="Education">Education</option>
                          <option value="Experience">Experience</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => {
                            const updated = editingJob.requirements.filter((_, i) => i !== idx);
                            setEditingJob({ ...editingJob, requirements: updated });
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
        </div>
      )}

      {/* Saved Jobs List */}
      {activeTab === 'list' && (
        <div className="bg-white border border-slate-200 rounded">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Saved Job Descriptions</h3>
              <p className="text-xs text-slate-500">
                {jobs.length} job postings available for candidate compatibility matching.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('create')}
              className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Add Job
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No job postings saved yet. Paste and parse a job description above.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <div key={job.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{job.title}</h4>
                      <span className="text-xs text-slate-500">· {job.company}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <span>{job.domain}</span>
                      <span>·</span>
                      <span>{job.minYearsExperienceTotal} yrs min exp</span>
                      <span>·</span>
                      <span>{job.requirements.filter(r => r.isMandatory).length} mandatory reqs</span>
                      <span>·</span>
                      <span>{job.requirements.filter(r => !r.isMandatory).length} preferred</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditingJob(job)}
                      className="px-2.5 py-1 text-xs border border-slate-300 text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                    >
                      Edit Requirements
                    </button>
                    <button
                      onClick={() => onDeleteJob(job.id)}
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
