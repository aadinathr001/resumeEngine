import React from 'react';
import { FileText, Briefcase, BarChart2, ShieldCheck, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { CandidateProfile, JobDescription, MatchRun, AIProviderType } from '../types';

interface OverviewViewProps {
  resumes: CandidateProfile[];
  jobs: JobDescription[];
  matchRuns: MatchRun[];
  activeProvider: AIProviderType;
  onNavigate: (tab: string) => void;
  onSelectRun: (run: MatchRun) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  resumes,
  jobs,
  matchRuns,
  activeProvider,
  onNavigate,
  onSelectRun,
}) => {
  const avgScore = matchRuns.length > 0
    ? Math.round((matchRuns.reduce((acc, r) => acc + r.overallScore, 0) / matchRuns.length) * 10) / 10
    : 0;

  return (
    <div className="space-y-8">
      {/* Workspace Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Workspace Overview
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Local evidence-based resume matching pipeline with multi-provider AI extraction and deterministic scoring.
        </p>
      </div>

      {/* KPI Stat Strip - Clean high contrast, tabular numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-wide">
            Saved Resumes
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {resumes.length.toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Validated candidate profiles
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-wide">
            Job Descriptions
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {jobs.length.toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Structured requirement sets
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-wide">
            Analyses Completed
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {matchRuns.length.toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Reproducible audits run
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-wide">
            Average Match
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {avgScore > 0 ? `${avgScore}%` : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Deterministic weighted score
          </div>
        </div>
      </div>

      {/* Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-white border border-slate-200 rounded flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono text-slate-500 mb-1">01. Ingestion & Schema</div>
            <h3 className="text-base font-semibold text-slate-900">
              Structured Resume Extraction
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Accepts PDF and raw text. Converts unstructured career history into validated candidate models with verbatim citation mapping.
            </p>
          </div>
          <button
            onClick={() => onNavigate('resumes')}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-900 hover:text-slate-700 cursor-pointer"
          >
            Manage Resumes <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono text-slate-500 mb-1">02. Requirements & Taxonomies</div>
            <h3 className="text-base font-semibold text-slate-900">
              Canonical Skill Normalization
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Classifies job criteria into mandatory vs. preferred requirements. Maps aliases and hierarchical relationships (e.g. RAG, SQL, AWS).
            </p>
          </div>
          <button
            onClick={() => onNavigate('jobs')}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-900 hover:text-slate-700 cursor-pointer"
          >
            Manage Jobs <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono text-slate-500 mb-1">03. Deterministic Engine</div>
            <h3 className="text-base font-semibold text-slate-900">
              Evidence-Based Matching
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Every point is calculated mathematically using verified citations. Models never invent scores or hallucinate qualifications.
            </p>
          </div>
          <button
            onClick={() => onNavigate('matches')}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-900 hover:text-slate-700 cursor-pointer"
          >
            Launch Matcher <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recent Analyses Table */}
      <div className="bg-white border border-slate-200 rounded">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Recent Match Analyses
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical compatibility runs and audited evidence logs
            </p>
          </div>
          {matchRuns.length > 0 && (
            <button
              onClick={() => onNavigate('matches')}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              View Full Workspace
            </button>
          )}
        </div>

        {matchRuns.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-600">No match analyses completed yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Upload a resume and job description to execute your first deterministic compatibility audit.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('resumes')}
                className="px-3.5 py-1.5 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Ingest Resume
              </button>
              <button
                onClick={() => onNavigate('jobs')}
                className="px-3.5 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Add Job Description
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-mono text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Candidate</th>
                  <th className="py-2.5 px-4 font-medium">Target Role</th>
                  <th className="py-2.5 px-4 font-medium text-right">Score</th>
                  <th className="py-2.5 px-4 font-medium">Result Level</th>
                  <th className="py-2.5 px-4 font-medium">Provider</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matchRuns.slice(0, 5).map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {run.candidateName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {run.jobTitle} <span className="text-slate-400">({run.jobCompany})</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {run.overallScore}/100
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className={
                        run.overallScore >= 75 ? 'text-emerald-700 font-medium' :
                        run.overallScore >= 55 ? 'text-amber-700 font-medium' : 'text-slate-600'
                      }>
                        {run.matchLevel}
                        {run.missingMandatoryCount > 0 && ` (${run.missingMandatoryCount} missing req)`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500 uppercase">
                      {run.executionLog?.provider || 'gemini'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          onSelectRun(run);
                          onNavigate('matches');
                        }}
                        className="text-xs font-medium text-slate-900 hover:underline cursor-pointer"
                      >
                        Inspect Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
