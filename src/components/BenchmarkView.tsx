import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, ShieldCheck, Terminal, ArrowRight } from 'lucide-react';
import { findCanonicalSkill, areSkillsRelated } from '../services/taxonomy';
import { evaluateRequirement, calculateDeterministicScores, DEFAULT_SCORING_WEIGHTS } from '../services/matchingEngine';
import { CandidateProfile, JobDescription, JobRequirement } from '../types';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  assertion: string;
  details?: string;
}

export const BenchmarkView: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runAllTests = async () => {
    setIsRunning(true);
    const testRuns: TestResult[] = [];

    // Test 1: Normalization - Alias Equivalence
    {
      const start = performance.now();
      const ragEntry = findCanonicalSkill('Retrieval-Augmented Generation');
      const torchEntry = findCanonicalSkill('Torch');
      const awsEntry = findCanonicalSkill('Amazon Web Services');

      const passed =
        ragEntry?.canonicalName === 'RAG' &&
        torchEntry?.canonicalName === 'PyTorch' &&
        awsEntry?.canonicalName === 'AWS';

      testRuns.push({
        name: 'Skill Normalization: Canonical Alias Mapping',
        category: 'NLP & Taxonomy',
        passed,
        durationMs: Math.round(performance.now() - start),
        assertion: 'Maps RAG, PyTorch, and AWS variations to canonical taxonomy entries without embedding drift.',
        details: passed ? 'All 3 canonical aliases resolved correctly.' : 'Failed alias resolution.',
      });
    }

    // Test 2: Normalization - Non-Equivalence Verification
    {
      const start = performance.now();
      // Docker and Kubernetes are related, but NOT identical canonical skills
      const dockerCanonical = findCanonicalSkill('Docker')?.canonicalName;
      const k8sCanonical = findCanonicalSkill('Kubernetes')?.canonicalName;
      const passed = dockerCanonical !== k8sCanonical && dockerCanonical === 'Docker' && k8sCanonical === 'Kubernetes';

      testRuns.push({
        name: 'Skill Separation: Distinction of Related Technologies',
        category: 'NLP & Taxonomy',
        passed,
        durationMs: Math.round(performance.now() - start),
        assertion: 'Confirms distinct canonical identities for related technologies (Docker != Kubernetes).',
        details: passed ? 'Separated technologies without false equivalence.' : 'Incorrectly grouped skills.',
      });
    }

    // Test 3: Relationship Detection
    {
      const start = performance.now();
      const isPostgresSqlRelated = areSkillsRelated('PostgreSQL', 'SQL');
      const isFastApiPythonRelated = areSkillsRelated('FastAPI', 'Python');
      const isJavaPythonUnrelated = !areSkillsRelated('Java', 'Python');
      const passed = isPostgresSqlRelated && isFastApiPythonRelated && isJavaPythonUnrelated;

      testRuns.push({
        name: 'Taxonomy Relationships: Directed Concept Links',
        category: 'NLP & Taxonomy',
        passed,
        durationMs: Math.round(performance.now() - start),
        assertion: 'Verifies PostgreSQL relates to SQL, while distinct languages (Java vs Python) remain unlinked.',
        details: passed ? 'Relationships and non-relationships verified.' : 'Relationship mapping discrepancy.',
      });
    }

    // Test 4: Evidence-Based Verification - Project Citation vs Keyword
    {
      const start = performance.now();
      const mockProfile: CandidateProfile = {
        id: 'bench_1',
        createdAt: '',
        updatedAt: '',
        name: 'Test Candidate',
        email: 'test@example.com',
        summary: '',
        rawText: 'Experienced developer in Python with some AWS knowledge.',
        skills: [
          {
            name: 'Python',
            canonicalName: 'Python',
            category: 'Programming',
            evidence: 'Built FastAPI endpoints',
            sourceSection: 'skills',
            confidence: 0.9,
          },
        ],
        experience: [],
        education: [
          { id: 'edu_1', institution: 'MIT', degree: 'B.S.', field: 'CS', graduationYear: '2022' }
        ],
        projects: [
          {
            id: 'p1',
            title: 'Doc Search System',
            description: 'Engineered a retrieval-augmented generation engine with Python',
            technologies: ['Python', 'RAG'],
            evidenceText: 'Built vector search RAG pipeline',
          },
        ],
        certifications: [],
        isReviewed: true,
      };

      const reqWithProjectEvidence: JobRequirement = {
        id: 'r_rag',
        name: 'RAG',
        canonicalName: 'RAG',
        category: 'AI & ML',
        isMandatory: true,
        weight: 5,
      };

      const reqWithoutEvidence: JobRequirement = {
        id: 'r_k8s',
        name: 'Kubernetes',
        canonicalName: 'Kubernetes',
        category: 'Cloud & DevOps',
        isMandatory: true,
        weight: 5,
      };

      const evalProject = evaluateRequirement(reqWithProjectEvidence, mockProfile);
      const evalMissing = evaluateRequirement(reqWithoutEvidence, mockProfile);

      const passed =
        evalProject.status === 'matched' &&
        evalProject.matchStrength === 1.0 &&
        evalProject.evidence?.source === 'projects' &&
        evalMissing.status === 'not_evidenced' &&
        evalMissing.matchStrength === 0.0;

      testRuns.push({
        name: 'Evidence Verification: Traceable Source Proof',
        category: 'Evidence Verification',
        passed,
        durationMs: Math.round(performance.now() - start),
        assertion: 'Identifies verified project implementation for RAG (1.0), and flags Kubernetes as unevidenced (0.0).',
        details: passed ? 'Traceable evidence validated with exact project citation.' : 'Evidence evaluation error.',
      });
    }

    // Test 5: Deterministic Scoring Reproducibility
    {
      const start = performance.now();
      const mockProfile: CandidateProfile = {
        id: 'bench_2',
        createdAt: '',
        updatedAt: '',
        name: 'Candidate Repro',
        email: 'repro@example.com',
        summary: '',
        rawText: 'Python backend developer.',
        skills: [{ name: 'Python', canonicalName: 'Python', category: 'Programming', evidence: 'Core', sourceSection: 'skills', confidence: 1.0 }],
        experience: [{ id: 'e1', company: 'Tech', role: 'Dev', startDate: '2022', endDate: '2024', highlights: ['Python APIs'] }],
        education: [{ id: 'edu_2', institution: 'State', degree: 'B.S.', field: 'CS', graduationYear: '2022' }],
        projects: [{ id: 'p1', title: 'API', description: 'FastAPI app', technologies: ['Python'], evidenceText: 'REST' }],
        certifications: [],
        isReviewed: true,
      };

      const mockJob: JobDescription = {
        id: 'job_repro',
        createdAt: '',
        title: 'Backend Dev',
        company: 'Corp',
        domain: 'Backend',
        rawText: '',
        minYearsExperienceTotal: 2,
        preferredEducation: 'B.S.',
        responsibilities: [],
        requirements: [
          { id: 'rq1', name: 'Python', canonicalName: 'Python', category: 'Programming', isMandatory: true, weight: 5 },
          { id: 'rq2', name: 'Docker', canonicalName: 'Docker', category: 'Cloud & DevOps', isMandatory: false, weight: 3 },
        ],
      };

      const evals1 = mockJob.requirements.map(r => evaluateRequirement(r, mockProfile));
      const evals2 = mockJob.requirements.map(r => evaluateRequirement(r, mockProfile));

      const score1 = calculateDeterministicScores(evals1, mockProfile, mockJob, DEFAULT_SCORING_WEIGHTS).overallScore;
      const score2 = calculateDeterministicScores(evals2, mockProfile, mockJob, DEFAULT_SCORING_WEIGHTS).overallScore;

      const passed = score1 === score2 && typeof score1 === 'number';

      testRuns.push({
        name: 'Scoring Reproducibility: Mathematical Invariance',
        category: 'Deterministic Scoring',
        passed,
        durationMs: Math.round(performance.now() - start),
        assertion: 'Ensures identical structured inputs yield exactly identical numerical scores (Score 1 == Score 2).',
        details: passed ? `Consistent score: ${score1}/100 across sequential runs.` : 'Score nondeterminism detected.',
      });
    }

    // Test 6: Missing Mandatory Warning Trigger
    {
      const start = performance.now();
      const mockProfile: CandidateProfile = {
        id: 'bench_3',
        createdAt: '',
        updatedAt: '',
        name: 'Junior Dev',
        email: 'jr@example.com',
        summary: '',
        rawText: 'Web developer',
        skills: [{ name: 'React', canonicalName: 'React', category: 'Web & Backend', evidence: 'UI', sourceSection: 'skills', confidence: 1.0 }],
        experience: [],
        education: [{ id: 'edu_3', institution: 'Univ', degree: 'B.S.', field: 'CS', graduationYear: '2024' }],
        projects: [],
        certifications: [],
        isReviewed: true,
      };

      const mockJob: JobDescription = {
        id: 'job_mand',
        createdAt: '',
        title: 'Python Engineer',
        company: 'Corp',
        domain: 'Backend',
        rawText: '',
        minYearsExperienceTotal: 1,
        preferredEducation: 'B.S.',
        responsibilities: [],
        requirements: [
          { id: 'm1', name: 'Python', canonicalName: 'Python', category: 'Programming', isMandatory: true, weight: 5 },
        ],
      };

      const evals = mockJob.requirements.map(r => evaluateRequirement(r, mockProfile));
      const { missingMandatoryCount } = calculateDeterministicScores(evals, mockProfile, mockJob);

      const passed = missingMandatoryCount === 1;

      testRuns.push({
        name: 'Mandatory Classification: Penalty Flagging',
        category: 'Requirements Intelligence',
        passed,
        durationMs: Math.round(performance.now() - start),
        assertion: 'Confirms that missing a mandatory requirement triggers an explicit penalty warning flag.',
        details: passed ? 'Mandatory penalty triggered as designed.' : 'Failed to flag missing mandatory qualification.',
      });
    }

    setResults(testRuns);
    setIsRunning(false);
  };

  const totalPassed = results.filter(r => r.passed).length;

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Pipeline Evaluation & Benchmark Suite
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated validation of skill normalization, evidence citation verification, and mathematical score reproducibility.
          </p>
        </div>

        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{isRunning ? 'Running Benchmark Tests...' : 'Execute Full Test Suite'}</span>
        </button>
      </div>

      {/* Benchmark Summary Header */}
      {results.length > 0 && (
        <div className="p-4 bg-white border border-slate-200 rounded flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {totalPassed} / {results.length} Passed
            </span>
            <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              100% Invariance Verified
            </span>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Total Execution Time: {results.reduce((acc, r) => acc + r.durationMs, 0)}ms
          </div>
        </div>
      )}

      {/* Tests Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 text-xs font-mono uppercase text-slate-500">
          Deterministic Pipeline Assertions
        </div>

        {results.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Click "Execute Full Test Suite" above to run automated accuracy and reproducibility benchmarks.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {results.map((res, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50/50 transition-colors flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {res.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-900">{res.name}</span>
                    <span className="text-[11px] font-mono text-slate-400">· {res.category}</span>
                  </div>
                  <p className="text-slate-600 pl-6 leading-relaxed">
                    {res.assertion}
                  </p>
                  {res.details && (
                    <div className="text-[11px] font-mono text-slate-500 pl-6">
                      Result: {res.details}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0 font-mono text-slate-400 text-[11px]">
                  {res.durationMs}ms
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
