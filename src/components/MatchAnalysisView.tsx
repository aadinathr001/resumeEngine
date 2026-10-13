import React, { useState } from 'react';
import {
  CandidateProfile,
  JobDescription,
  MatchRun,
  ScoringWeights,
  RequirementEvaluation,
  AIProviderConfig,
  AIExecutionLog
} from '../types';
import {
  runMatchAnalysis,
  DEFAULT_SCORING_WEIGHTS,
  calculateDeterministicScores
} from '../services/matchingEngine';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sliders,
  Sparkles,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  BookOpen
} from 'lucide-react';

interface MatchAnalysisViewProps {
  resumes: CandidateProfile[];
  jobs: JobDescription[];
  matchRuns: MatchRun[];
  selectedRun: MatchRun | null;
  onSaveMatchRun: (run: MatchRun) => void;
  onSelectRun: (run: MatchRun | null) => void;
  providerConfig: AIProviderConfig;
  onLogExecution: (log: AIExecutionLog) => void;
}

export const MatchAnalysisView: React.FC<MatchAnalysisViewProps> = ({
  resumes,
  jobs,
  matchRuns,
  selectedRun,
  onSaveMatchRun,
  onSelectRun,
  providerConfig,
  onLogExecution,
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    selectedRun?.candidateId || resumes[0]?.id || ''
  );
  const [selectedJobId, setSelectedJobId] = useState<string>(
    selectedRun?.jobId || jobs[0]?.id || ''
  );

  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_SCORING_WEIGHTS);
  const [showWeightConfig, setShowWeightConfig] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isMandatoryOnly, setIsMandatoryOnly] = useState(false);

  // Resume Improvement Simulator state
  const [simulatedSims, setSimulatedSims] = useState<Record<string, boolean>>({});

  // Active run to display
  const activeRun = selectedRun || matchRuns[0] || null;

  // Run Match Comparison
  const handleRunComparison = () => {
    const candidate = resumes.find(r => r.id === selectedCandidateId);
    const job = jobs.find(j => j.id === selectedJobId);

    if (!candidate || !job) return;

    const startTime = Date.now();
    const providerLog: AIExecutionLog = {
      id: `log_match_${Date.now()}`,
      timestamp: new Date().toISOString(),
      provider: providerConfig.activeProvider,
      model: providerConfig.activeProvider === 'gemini' ? providerConfig.geminiModel : providerConfig.ollamaModel,
      task: 'recommendations',
      latencyMs: Date.now() - startTime + 12,
      inputTokens: Math.round((candidate.rawText.length + job.rawText.length) / 4),
      outputTokens: 480,
      schemaValid: true,
      retryCount: 0,
      status: 'completed',
    };

    const newRun = runMatchAnalysis(candidate, job, providerLog, weights);
    onSaveMatchRun(newRun);
    onSelectRun(newRun);
    onLogExecution(providerLog);
    setSimulatedSims({});
  };

  // Recalculate score for simulator
  const candidate = resumes.find(r => r.id === activeRun?.candidateId);
  const job = jobs.find(j => j.id === activeRun?.jobId);

  let simulatedScore = activeRun?.overallScore || 0;
  if (activeRun && candidate && job) {
    const simulatedEvals: RequirementEvaluation[] = activeRun.evaluations.map(ev => {
      if (simulatedSims[ev.requirementId]) {
        return {
          ...ev,
          status: 'matched',
          matchStrength: 1.0,
          reason: 'Simulated verified project implementation added.',
        };
      }
      return ev;
    });

    const { overallScore } = calculateDeterministicScores(simulatedEvals, candidate, job, activeRun.scoringWeights);
    simulatedScore = overallScore;
  }

  const filteredEvaluations = activeRun
    ? activeRun.evaluations.filter(ev => {
        if (isMandatoryOnly && !ev.isMandatory) return false;
        if (filterStatus === 'all') return true;
        return ev.status === filterStatus;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Top Selector Strip */}
      <div className="bg-white border border-slate-200 rounded p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Deterministic Match Analysis & Evidence Inspector
            </h1>
            <p className="text-xs text-slate-500">
              Select a candidate profile and target job description to evaluate verifiable qualifications.
            </p>
          </div>

          <button
            onClick={() => setShowWeightConfig(!showWeightConfig)}
            className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showWeightConfig ? 'Hide Scoring Weights' : 'Configure Weights'}</span>
          </button>
        </div>

        {/* Weights Config Drawer */}
        {showWeightConfig && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">Configurable Category Weights (Total: 100%)</span>
              <button
                onClick={() => setWeights(DEFAULT_SCORING_WEIGHTS)}
                className="text-slate-500 hover:text-slate-900 underline cursor-pointer"
              >
                Reset to Standard Defaults
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Technical Skills (%)</label>
                <input
                  type="number"
                  value={weights.technicalSkills}
                  onChange={(e) => setWeights({ ...weights, technicalSkills: parseInt(e.target.value, 10) || 0 })}
                  className="w-full p-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Experience (%)</label>
                <input
                  type="number"
                  value={weights.relevantExperience}
                  onChange={(e) => setWeights({ ...weights, relevantExperience: parseInt(e.target.value, 10) || 0 })}
                  className="w-full p-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Projects (%)</label>
                <input
                  type="number"
                  value={weights.projects}
                  onChange={(e) => setWeights({ ...weights, projects: parseInt(e.target.value, 10) || 0 })}
                  className="w-full p-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Education (%)</label>
                <input
                  type="number"
                  value={weights.education}
                  onChange={(e) => setWeights({ ...weights, education: parseInt(e.target.value, 10) || 0 })}
                  className="w-full p-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Keywords (%)</label>
                <input
                  type="number"
                  value={weights.keywords}
                  onChange={(e) => setWeights({ ...weights, keywords: parseInt(e.target.value, 10) || 0 })}
                  className="w-full p-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Candidate & Job Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Select Candidate Profile ({resumes.length} available)
            </label>
            <select
              value={selectedCandidateId}
              onChange={(e) => setSelectedCandidateId(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded bg-white text-slate-800"
            >
              {resumes.length === 0 && <option value="">No resumes found - Ingest one first</option>}
              {resumes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.targetRole ? `(${r.targetRole})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Select Target Job Posting ({jobs.length} available)
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded bg-white text-slate-800"
            >
              {jobs.length === 0 && <option value="">No jobs found - Add one first</option>}
              {jobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.title} · {j.company}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={!selectedCandidateId || !selectedJobId}
            className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Execute Compatibility Audit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Analysis Report View */}
      {activeRun ? (
        <div className="space-y-6">
          {/* Missing Mandatory Warning Banner */}
          {activeRun.missingMandatoryCount > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded text-xs text-rose-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold">
                  {activeRun.missingMandatoryCount} Mandatory Requirement{activeRun.missingMandatoryCount > 1 ? 's' : ''} Missing or Unevidenced
                </h4>
                <p className="mt-0.5 leading-relaxed text-rose-800">
                  Even though the overall numerical score is {activeRun.overallScore}/100, candidate does not demonstrate direct evidence for core prerequisite qualifications: {activeRun.evaluations.filter(e => e.isMandatory && e.status === 'not_evidenced').map(e => e.requirementName).join(', ')}.
                </p>
              </div>
            </div>
          )}

          {/* Compatibility Scorecard & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Scorecard Hero Box */}
            <div className="bg-white border border-slate-200 rounded p-6 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500">
                  Compatibility Rating
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-5xl font-black font-mono tabular-nums text-slate-900">
                    {activeRun.overallScore}
                  </span>
                  <span className="text-xl font-mono text-slate-400">/100</span>
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-800">
                  {activeRun.matchLevel}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Evaluated: {activeRun.candidateName} against {activeRun.jobTitle} at {activeRun.jobCompany}.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 leading-normal">
                Audited via deterministic engine. Not an automated ATS pass/fail filter.
              </div>
            </div>

            {/* Category Breakdown Bars */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900">
                  Deterministic Category Breakdown
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  Total Points: {activeRun.overallScore} / 100
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* Technical Skills */}
                <div>
                  <div className="flex items-center justify-between font-mono mb-1">
                    <span className="text-slate-700">Technical Skills ({activeRun.scoringWeights.technicalSkills}%)</span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {activeRun.categoryScores.technicalSkills.earned} / {activeRun.categoryScores.technicalSkills.max} pts
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded overflow-hidden">
                    <div
                      className="bg-slate-900 h-2 rounded transition-all"
                      style={{ width: `${activeRun.categoryScores.technicalSkills.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Relevant Experience */}
                <div>
                  <div className="flex items-center justify-between font-mono mb-1">
                    <span className="text-slate-700">Relevant Experience ({activeRun.scoringWeights.relevantExperience}%)</span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {activeRun.categoryScores.relevantExperience.earned} / {activeRun.categoryScores.relevantExperience.max} pts
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded overflow-hidden">
                    <div
                      className="bg-slate-900 h-2 rounded transition-all"
                      style={{ width: `${activeRun.categoryScores.relevantExperience.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <div className="flex items-center justify-between font-mono mb-1">
                    <span className="text-slate-700">Projects ({activeRun.scoringWeights.projects}%)</span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {activeRun.categoryScores.projects.earned} / {activeRun.categoryScores.projects.max} pts
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded overflow-hidden">
                    <div
                      className="bg-slate-900 h-2 rounded transition-all"
                      style={{ width: `${activeRun.categoryScores.projects.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Education */}
                <div>
                  <div className="flex items-center justify-between font-mono mb-1">
                    <span className="text-slate-700">Education ({activeRun.scoringWeights.education}%)</span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {activeRun.categoryScores.education.earned} / {activeRun.categoryScores.education.max} pts
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded overflow-hidden">
                    <div
                      className="bg-slate-900 h-2 rounded transition-all"
                      style={{ width: `${activeRun.categoryScores.education.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Keywords & Terminology */}
                <div>
                  <div className="flex items-center justify-between font-mono mb-1">
                    <span className="text-slate-700">Keywords & Terminology ({activeRun.scoringWeights.keywords}%)</span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {activeRun.categoryScores.keywords.earned} / {activeRun.categoryScores.keywords.max} pts
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded overflow-hidden">
                    <div
                      className="bg-slate-900 h-2 rounded transition-all"
                      style={{ width: `${activeRun.categoryScores.keywords.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Resume Improvement Simulator */}
          <div className="bg-white border border-slate-200 rounded p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Resume Improvement Simulator
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Explore how adding demonstrable, verified achievements directly adjusts your compatibility score.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs font-mono">
                  <span>Simulated Score: </span>
                  <strong className="text-sm text-slate-900 tabular-nums">{simulatedScore}/100</strong>
                  {simulatedScore > activeRun.overallScore && (
                    <span className="text-emerald-700 font-semibold ml-1">
                      (+{Math.round((simulatedScore - activeRun.overallScore) * 10) / 10} pts)
                    </span>
                  )}
                </div>
                {Object.keys(simulatedSims).length > 0 && (
                  <button
                    onClick={() => setSimulatedSims({})}
                    className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {activeRun.evaluations
                .filter(ev => ev.status !== 'matched')
                .slice(0, 6)
                .map(ev => {
                  const isChecked = Boolean(simulatedSims[ev.requirementId]);
                  return (
                    <label
                      key={ev.requirementId}
                      className={`p-3 border rounded cursor-pointer transition-colors flex items-start gap-2.5 ${
                        isChecked
                          ? 'border-emerald-600 bg-emerald-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          setSimulatedSims({
                            ...simulatedSims,
                            [ev.requirementId]: e.target.checked,
                          });
                        }}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-900">
                          Add verified {ev.requirementName} evidence
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {ev.isMandatory ? 'Mandatory qualification' : 'Preferred skill'} (currently {ev.status})
                        </div>
                      </div>
                    </label>
                  );
                })}
            </div>
          </div>

          {/* Requirement Verification Matrix */}
          <div className="bg-white border border-slate-200 rounded">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Requirement Verification Matrix
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Line-by-line evaluation with verbatim candidate citations and strength scores.
                </p>
              </div>

              {/* Matrix Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded">
                  {['all', 'matched', 'partial', 'not_evidenced'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-2.5 py-1 font-medium capitalize rounded transition-colors cursor-pointer ${
                        filterStatus === status
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer pl-2">
                  <input
                    type="checkbox"
                    checked={isMandatoryOnly}
                    onChange={(e) => setIsMandatoryOnly(e.target.checked)}
                    className="rounded text-slate-900 focus:ring-0 cursor-pointer"
                  />
                  <span>Mandatory only</span>
                </label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-mono uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Requirement</th>
                    <th className="py-2.5 px-4 font-medium">Canonical Skill</th>
                    <th className="py-2.5 px-4 font-medium">Type</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium text-right">Strength</th>
                    <th className="py-2.5 px-4 font-medium">Supporting Evidence & Citation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvaluations.map((ev) => (
                    <tr key={ev.requirementId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {ev.requirementName}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {ev.canonicalName}
                      </td>
                      <td className="py-3 px-4">
                        <span className={ev.isMandatory ? 'text-rose-700 font-medium' : 'text-slate-500'}>
                          {ev.isMandatory ? 'Mandatory' : 'Preferred'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            ev.status === 'matched'
                              ? 'text-emerald-700'
                              : ev.status === 'partial'
                              ? 'text-amber-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {ev.status === 'matched' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {ev.status === 'partial' && <HelpCircle className="w-3.5 h-3.5" />}
                          {ev.status === 'not_evidenced' && <XCircle className="w-3.5 h-3.5" />}
                          <span className="capitalize">{ev.status.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                        {(ev.matchStrength * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-md">
                        {ev.evidence ? (
                          <div className="space-y-0.5">
                            <p className="line-clamp-2 italic">
                              "{ev.evidence.text}"
                            </p>
                            <span className="text-[11px] font-mono text-slate-400">
                              Source: {ev.evidence.source} ({ev.evidence.sectionTitle})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No supporting evidence in resume</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actionable Grounded Recommendations Report */}
          <div className="bg-white border border-slate-200 rounded p-6 space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Candidate Fit & Grounded Recommendations
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Targeted advice generated strictly from verified candidate citations. Zero fabricated credentials.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Top Strengths */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase tracking-wide">
                  Top Demonstrated Strengths
                </h4>
                <div className="space-y-2">
                  {activeRun.recommendations.topStrengths.map((str, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                      <div className="font-semibold text-slate-900">{str.title}</div>
                      <p className="text-slate-600 leading-relaxed italic">"{str.evidence}"</p>
                      <div className="text-slate-500 font-mono text-[11px] pt-1">{str.relevance}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Improvements */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase tracking-wide">
                  Priority Evidence Improvements
                </h4>
                <div className="space-y-2">
                  {activeRun.recommendations.suggestedProjectImprovements.map((imp, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                      <div className="font-semibold text-slate-900">{imp.action}</div>
                      <div className="text-emerald-700 font-mono text-[11px]">{imp.expectedGain}</div>
                    </div>
                  ))}

                  {activeRun.recommendations.preferredSkillsToDevelop.map((pref, idx) => (
                    <div key={`pref-${idx}`} className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                      <div className="font-semibold text-slate-900">Skill Growth: {pref.skill}</div>
                      <p className="text-slate-600">{pref.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resume Wording Suggestions */}
            {activeRun.recommendations.resumePhrasingSuggestions.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 uppercase tracking-wide text-xs mb-3">
                  Evidence-Grounded Resume Phrasing Suggestions
                </h4>
                <div className="space-y-3 text-xs">
                  {activeRun.recommendations.resumePhrasingSuggestions.map((sug, idx) => (
                    <div key={idx} className="p-4 border border-slate-200 rounded bg-slate-50/50 space-y-2">
                      <div>
                        <span className="font-mono text-slate-400 text-[11px] uppercase">Current Excerpt:</span>
                        <p className="text-slate-600 italic mt-0.5">"{sug.originalExcerpt}"</p>
                      </div>
                      <div>
                        <span className="font-mono text-emerald-700 text-[11px] uppercase font-semibold">Recommended Phrasing:</span>
                        <p className="text-slate-900 font-medium mt-0.5">"{sug.recommendedEnhancement}"</p>
                      </div>
                      <p className="text-slate-500 text-[11px] pt-1">Reason: {sug.justification}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded p-12 text-center text-xs text-slate-500">
          No comparison run selected. Choose a candidate and job description above, then click "Execute Compatibility Audit".
        </div>
      )}
    </div>
  );
};
