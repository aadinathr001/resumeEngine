import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OverviewView } from './components/OverviewView';
import { ResumeIngestionView } from './components/ResumeIngestionView';
import { JobLibraryView } from './components/JobLibraryView';
import { MatchAnalysisView } from './components/MatchAnalysisView';
import { AIEngineView } from './components/AIEngineView';
import { BenchmarkView } from './components/BenchmarkView';
import { StorageService } from './services/storage';
import {
  CandidateProfile,
  JobDescription,
  MatchRun,
  AIProviderConfig,
  AIExecutionLog
} from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('overview');

  // Application Data States
  const [resumes, setResumes] = useState<CandidateProfile[]>([]);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [matchRuns, setMatchRuns] = useState<MatchRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<MatchRun | null>(null);

  // AI Provider & Telemetry States
  const [providerConfig, setProviderConfig] = useState<AIProviderConfig>(StorageService.getProviderConfig());
  const [logs, setLogs] = useState<AIExecutionLog[]>([]);
  const [providerStatus, setProviderStatus] = useState<'connected' | 'untested' | 'error'>('untested');

  // Load from StorageService on mount
  useEffect(() => {
    setResumes(StorageService.getResumes());
    setJobs(StorageService.getJobs());
    setMatchRuns(StorageService.getMatchRuns());
    setLogs(StorageService.getExecutionLogs());

    // Check health & provider status
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          setProviderStatus('connected');
        } else {
          setProviderStatus('error');
        }
      })
      .catch(() => {
        setProviderStatus('error');
      });
  }, []);

  // Handlers
  const handleSaveResume = (profile: CandidateProfile) => {
    StorageService.saveResume(profile);
    setResumes(StorageService.getResumes());
  };

  const handleDeleteResume = (id: string) => {
    StorageService.deleteResume(id);
    setResumes(StorageService.getResumes());
  };

  const handleSaveJob = (job: JobDescription) => {
    StorageService.saveJob(job);
    setJobs(StorageService.getJobs());
  };

  const handleDeleteJob = (id: string) => {
    StorageService.deleteJob(id);
    setJobs(StorageService.getJobs());
  };

  const handleSaveMatchRun = (run: MatchRun) => {
    StorageService.saveMatchRun(run);
    setMatchRuns(StorageService.getMatchRuns());
  };

  const handleUpdateProviderConfig = (newConfig: AIProviderConfig) => {
    StorageService.saveProviderConfig(newConfig);
    setProviderConfig(newConfig);
  };

  const handleLogExecution = (log: AIExecutionLog) => {
    StorageService.logExecution(log);
    setLogs(StorageService.getExecutionLogs());
  };

  const handleClearLogs = () => {
    StorageService.clearLogs();
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex flex-col selection:bg-slate-900 selection:text-white">
      {/* Top Bar adhering to strict Top Bar Contract */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeProvider={providerConfig.activeProvider}
        providerStatus={providerStatus}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {currentTab === 'overview' && (
          <OverviewView
            resumes={resumes}
            jobs={jobs}
            matchRuns={matchRuns}
            activeProvider={providerConfig.activeProvider}
            onNavigate={setCurrentTab}
            onSelectRun={setSelectedRun}
          />
        )}

        {currentTab === 'resumes' && (
          <ResumeIngestionView
            resumes={resumes}
            onSaveResume={handleSaveResume}
            onDeleteResume={handleDeleteResume}
            providerConfig={providerConfig}
            onLogExecution={handleLogExecution}
          />
        )}

        {currentTab === 'jobs' && (
          <JobLibraryView
            jobs={jobs}
            onSaveJob={handleSaveJob}
            onDeleteJob={handleDeleteJob}
            providerConfig={providerConfig}
            onLogExecution={handleLogExecution}
          />
        )}

        {currentTab === 'matches' && (
          <MatchAnalysisView
            resumes={resumes}
            jobs={jobs}
            matchRuns={matchRuns}
            selectedRun={selectedRun}
            onSaveMatchRun={handleSaveMatchRun}
            onSelectRun={setSelectedRun}
            providerConfig={providerConfig}
            onLogExecution={handleLogExecution}
          />
        )}

        {currentTab === 'ai-engine' && (
          <AIEngineView
            config={providerConfig}
            onUpdateConfig={handleUpdateProviderConfig}
            logs={logs}
            onClearLogs={handleClearLogs}
            onLogExecution={handleLogExecution}
          />
        )}

        {currentTab === 'benchmarks' && <BenchmarkView />}
      </main>

      {/* Quiet Technical Swiss Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">ResumeIQ</span>
            <span>·</span>
            <span>Deterministic Scoring & Multi-Provider AI Architecture</span>
          </div>
          <div>
            Local-First & Multi-Cloud Inference · Pydantic Validation & Normalization
          </div>
        </div>
      </footer>
    </div>
  );
}
