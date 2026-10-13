export type AIProviderType = 'ollama' | 'groq' | 'openai' | 'gemini';

export interface AIProviderConfig {
  activeProvider: AIProviderType;
  ollamaUrl: string;
  ollamaModel: string;
  groqModel: string;
  openaiModel: string;
  geminiModel: string;
  groqApiKey?: string;
  openaiApiKey?: string;
}

export interface AIExecutionLog {
  id: string;
  timestamp: string;
  provider: AIProviderType;
  model: string;
  task: 'resume_extraction' | 'job_extraction' | 'recommendations' | 'connectivity_test';
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  schemaValid: boolean;
  retryCount: number;
  status: 'completed' | 'failed';
  error?: string;
}

export interface CandidateSkill {
  name: string;
  canonicalName: string;
  category: 'Programming' | 'AI & ML' | 'Cloud & DevOps' | 'Web & Backend' | 'Databases' | 'Tools & Other';
  evidence: string;
  sourceSection: 'projects' | 'experience' | 'skills' | 'education' | 'certifications';
  confidence: number;
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
  location?: string;
  highlights: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field: string;
  graduationYear: string;
  gpa?: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  evidenceText: string;
  url?: string;
}

export interface CandidateProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  fileName?: string;
  rawText: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  targetRole?: string;
  summary: string;
  skills: CandidateSkill[];
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: string[];
  extractionProvider?: AIProviderType;
  extractionModel?: string;
  isReviewed: boolean;
}

export interface JobRequirement {
  id: string;
  name: string;
  canonicalName: string;
  category: 'Programming' | 'AI & ML' | 'Cloud & DevOps' | 'Web & Backend' | 'Databases' | 'Education' | 'Experience' | 'Other';
  isMandatory: boolean;
  minYearsExperience?: number;
  contextSnippet?: string;
  weight: number; // 1 to 5
}

export interface JobDescription {
  id: string;
  createdAt: string;
  title: string;
  company: string;
  location?: string;
  employmentType?: string;
  domain: string;
  rawText: string;
  requirements: JobRequirement[];
  responsibilities: string[];
  minYearsExperienceTotal: number;
  preferredEducation: string;
  extractionProvider?: AIProviderType;
  extractionModel?: string;
}

export type MatchStatus = 'matched' | 'partial' | 'not_evidenced';

export interface RequirementEvaluation {
  requirementId: string;
  requirementName: string;
  canonicalName: string;
  category: string;
  isMandatory: boolean;
  status: MatchStatus;
  matchStrength: number; // 0.0 to 1.0
  reason: string;
  evidence?: {
    source: 'projects' | 'experience' | 'skills' | 'education';
    text: string;
    sectionTitle: string;
    confidence: number;
  };
}

export interface CategoryScoreDetail {
  earned: number;
  max: number;
  percentage: number;
}

export interface CategoryScores {
  technicalSkills: CategoryScoreDetail;
  relevantExperience: CategoryScoreDetail;
  projects: CategoryScoreDetail;
  education: CategoryScoreDetail;
  keywords: CategoryScoreDetail;
}

export interface ScoringWeights {
  technicalSkills: number; // default 35
  relevantExperience: number; // default 25
  projects: number; // default 20
  education: number; // default 10
  keywords: number; // default 10
}

export interface RecommendationReport {
  topStrengths: Array<{
    title: string;
    evidence: string;
    relevance: string;
  }>;
  missingMandatory: Array<{
    skill: string;
    impact: string;
    remedy: string;
  }>;
  preferredSkillsToDevelop: Array<{
    skill: string;
    rationale: string;
  }>;
  suggestedProjectImprovements: Array<{
    action: string;
    projectReference?: string;
    expectedGain: string;
  }>;
  resumePhrasingSuggestions: Array<{
    originalExcerpt: string;
    recommendedEnhancement: string;
    justification: string;
  }>;
  scoreExplanation: string;
}

export interface MatchRun {
  id: string;
  timestamp: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  overallScore: number; // 0 to 100
  matchLevel: 'Strong Match' | 'Moderate Match' | 'Low Match' | 'Deficient Match';
  categoryScores: CategoryScores;
  evaluations: RequirementEvaluation[];
  missingMandatoryCount: number;
  recommendations: RecommendationReport;
  scoringWeights: ScoringWeights;
  executionLog: AIExecutionLog;
}

export interface SkillTaxonomyEntry {
  canonicalName: string;
  category: 'Programming' | 'AI & ML' | 'Cloud & DevOps' | 'Web & Backend' | 'Databases' | 'Tools & Other';
  aliases: string[];
  relatedSkills: string[];
}
