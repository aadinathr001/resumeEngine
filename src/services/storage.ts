import {
  CandidateProfile,
  JobDescription,
  MatchRun,
  AIExecutionLog,
  AIProviderConfig
} from '../types';

const STORAGE_KEYS = {
  RESUMES: 'resumeiq_resumes_v1',
  JOBS: 'resumeiq_jobs_v1',
  MATCH_RUNS: 'resumeiq_match_runs_v1',
  EXECUTION_LOGS: 'resumeiq_execution_logs_v1',
  PROVIDER_CONFIG: 'resumeiq_provider_config_v1'
};

const DEFAULT_CONFIG: AIProviderConfig = {
  activeProvider: 'gemini',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'qwen3:8b',
  groqModel: 'openai/gpt-oss-20b',
  openaiModel: 'gpt-4o-mini',
  geminiModel: 'gemini-3.8-flash'
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading key ${key} from storage:`, err);
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving key ${key} to storage:`, err);
  }
}

export const StorageService = {
  // Profiles / Resumes
  getResumes(): CandidateProfile[] {
    return safeGet<CandidateProfile[]>(STORAGE_KEYS.RESUMES, []);
  },
  saveResume(profile: CandidateProfile): void {
    const resumes = this.getResumes();
    const idx = resumes.findIndex(r => r.id === profile.id);
    if (idx >= 0) {
      resumes[idx] = profile;
    } else {
      resumes.unshift(profile);
    }
    safeSet(STORAGE_KEYS.RESUMES, resumes);
  },
  deleteResume(id: string): void {
    const resumes = this.getResumes().filter(r => r.id !== id);
    safeSet(STORAGE_KEYS.RESUMES, resumes);
  },
  getResumeById(id: string): CandidateProfile | undefined {
    return this.getResumes().find(r => r.id === id);
  },

  // Job Descriptions
  getJobs(): JobDescription[] {
    return safeGet<JobDescription[]>(STORAGE_KEYS.JOBS, []);
  },
  saveJob(job: JobDescription): void {
    const jobs = this.getJobs();
    const idx = jobs.findIndex(j => j.id === job.id);
    if (idx >= 0) {
      jobs[idx] = job;
    } else {
      jobs.unshift(job);
    }
    safeSet(STORAGE_KEYS.JOBS, jobs);
  },
  deleteJob(id: string): void {
    const jobs = this.getJobs().filter(j => j.id !== id);
    safeSet(STORAGE_KEYS.JOBS, jobs);
  },
  getJobById(id: string): JobDescription | undefined {
    return this.getJobs().find(j => j.id === id);
  },

  // Match Runs
  getMatchRuns(): MatchRun[] {
    return safeGet<MatchRun[]>(STORAGE_KEYS.MATCH_RUNS, []);
  },
  saveMatchRun(run: MatchRun): void {
    const runs = this.getMatchRuns();
    runs.unshift(run);
    safeSet(STORAGE_KEYS.MATCH_RUNS, runs);
  },
  deleteMatchRun(id: string): void {
    const runs = this.getMatchRuns().filter(r => r.id !== id);
    safeSet(STORAGE_KEYS.MATCH_RUNS, runs);
  },
  getMatchRunById(id: string): MatchRun | undefined {
    return this.getMatchRuns().find(r => r.id === id);
  },

  // Execution Logs
  getExecutionLogs(): AIExecutionLog[] {
    return safeGet<AIExecutionLog[]>(STORAGE_KEYS.EXECUTION_LOGS, []);
  },
  logExecution(log: AIExecutionLog): void {
    const logs = this.getExecutionLogs();
    logs.unshift(log);
    // Keep max 100 logs in local storage
    safeSet(STORAGE_KEYS.EXECUTION_LOGS, logs.slice(0, 100));
  },
  clearLogs(): void {
    safeSet(STORAGE_KEYS.EXECUTION_LOGS, []);
  },

  // Provider Config
  getProviderConfig(): AIProviderConfig {
    return safeGet<AIProviderConfig>(STORAGE_KEYS.PROVIDER_CONFIG, DEFAULT_CONFIG);
  },
  saveProviderConfig(config: AIProviderConfig): void {
    safeSet(STORAGE_KEYS.PROVIDER_CONFIG, config);
  },

  // Clear all data
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEYS.RESUMES);
    localStorage.removeItem(STORAGE_KEYS.JOBS);
    localStorage.removeItem(STORAGE_KEYS.MATCH_RUNS);
    localStorage.removeItem(STORAGE_KEYS.EXECUTION_LOGS);
  }
};
