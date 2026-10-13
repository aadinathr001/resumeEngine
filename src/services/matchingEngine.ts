import {
  CandidateProfile,
  JobDescription,
  JobRequirement,
  RequirementEvaluation,
  CategoryScores,
  ScoringWeights,
  MatchRun,
  RecommendationReport,
  AIExecutionLog
} from '../types';
import { cleanTerm, findCanonicalSkill, areSkillsRelated } from './taxonomy';

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  technicalSkills: 35,
  relevantExperience: 25,
  projects: 20,
  education: 10,
  keywords: 10
};

// Check if candidate demonstrated skill in projects
function findProjectEvidence(
  reqName: string,
  canonicalName: string,
  profile: CandidateProfile
): { text: string; sectionTitle: string; confidence: number } | null {
  const targetTerms = [reqName, canonicalName];
  const canonicalEntry = findCanonicalSkill(canonicalName);
  if (canonicalEntry) {
    targetTerms.push(...canonicalEntry.aliases);
  }

  for (const project of profile.projects) {
    const combinedText = `${project.title} ${project.description} ${project.technologies.join(' ')} ${project.evidenceText}`.toLowerCase();
    for (const term of targetTerms) {
      if (term && combinedText.includes(term.toLowerCase())) {
        return {
          text: `Project "${project.title}": ${project.description || project.evidenceText || project.technologies.join(', ')}`,
          sectionTitle: 'Projects',
          confidence: 0.95
        };
      }
    }
  }
  return null;
}

// Check if candidate demonstrated skill in experience
function findExperienceEvidence(
  reqName: string,
  canonicalName: string,
  profile: CandidateProfile
): { text: string; sectionTitle: string; confidence: number } | null {
  const targetTerms = [reqName, canonicalName];
  const canonicalEntry = findCanonicalSkill(canonicalName);
  if (canonicalEntry) {
    targetTerms.push(...canonicalEntry.aliases);
  }

  for (const exp of profile.experience) {
    const highlights = exp.highlights.join(' ');
    const combinedText = `${exp.role} at ${exp.company}: ${highlights}`.toLowerCase();
    for (const term of targetTerms) {
      if (term && combinedText.includes(term.toLowerCase())) {
        return {
          text: `${exp.role} at ${exp.company} — ${highlights.slice(0, 160)}...`,
          sectionTitle: 'Experience',
          confidence: 0.95
        };
      }
    }
  }
  return null;
}

// Evaluate single requirement against candidate profile
export function evaluateRequirement(
  req: JobRequirement,
  profile: CandidateProfile
): RequirementEvaluation {
  const reqClean = cleanTerm(req.name);
  const canonicalEntry = findCanonicalSkill(req.name);
  const canonicalName = canonicalEntry ? canonicalEntry.canonicalName : req.name;

  // 1. Check Projects for strong practical evidence
  const projectEvidence = findProjectEvidence(req.name, canonicalName, profile);
  if (projectEvidence) {
    return {
      requirementId: req.id,
      requirementName: req.name,
      canonicalName,
      category: req.category,
      isMandatory: req.isMandatory,
      status: 'matched',
      matchStrength: 1.0,
      reason: `Direct project evidence: verified in project "${projectEvidence.sectionTitle}".`,
      evidence: {
        source: 'projects',
        text: projectEvidence.text,
        sectionTitle: projectEvidence.sectionTitle,
        confidence: projectEvidence.confidence
      }
    };
  }

  // 2. Check Work Experience for practical employment evidence
  const expEvidence = findExperienceEvidence(req.name, canonicalName, profile);
  if (expEvidence) {
    return {
      requirementId: req.id,
      requirementName: req.name,
      canonicalName,
      category: req.category,
      isMandatory: req.isMandatory,
      status: 'matched',
      matchStrength: 1.0,
      reason: `Demonstrated professional experience: verified in work history.`,
      evidence: {
        source: 'experience',
        text: expEvidence.text,
        sectionTitle: expEvidence.sectionTitle,
        confidence: expEvidence.confidence
      }
    };
  }

  // 3. Check Explicit Skills list in candidate profile
  const matchedSkill = profile.skills.find(s => {
    const sCanonical = findCanonicalSkill(s.name)?.canonicalName || s.name;
    return (
      cleanTerm(s.name) === reqClean ||
      cleanTerm(sCanonical) === cleanTerm(canonicalName) ||
      cleanTerm(s.canonicalName) === cleanTerm(canonicalName)
    );
  });

  if (matchedSkill) {
    const hasEvidence = matchedSkill.evidence && matchedSkill.evidence.trim().length > 10;
    return {
      requirementId: req.id,
      requirementName: req.name,
      canonicalName,
      category: req.category,
      isMandatory: req.isMandatory,
      status: 'matched',
      matchStrength: hasEvidence ? 0.9 : 0.75,
      reason: hasEvidence
        ? `Skill listed with supporting statement: "${matchedSkill.evidence}"`
        : `Skill declared in candidate skills inventory without detailed narrative context.`,
      evidence: {
        source: 'skills',
        text: matchedSkill.evidence || `Skill profile entry: ${matchedSkill.name}`,
        sectionTitle: 'Skills',
        confidence: matchedSkill.confidence || 0.8
      }
    };
  }

  // 4. Check Related Skill in candidate skills or projects (Partial Match)
  for (const s of profile.skills) {
    if (areSkillsRelated(s.name, canonicalName)) {
      return {
        requirementId: req.id,
        requirementName: req.name,
        canonicalName,
        category: req.category,
        isMandatory: req.isMandatory,
        status: 'partial',
        matchStrength: 0.5,
        reason: `Related technology evidenced: candidate has "${s.name}", which is conceptually related to "${req.name}".`,
        evidence: {
          source: 'skills',
          text: `Related skill found: ${s.name} (${s.evidence || 'in candidate skills'})`,
          sectionTitle: 'Skills',
          confidence: 0.65
        }
      };
    }
  }

  // 5. Fallback: Check raw resume text for literal mention
  const rawLower = profile.rawText.toLowerCase();
  if (rawLower.includes(req.name.toLowerCase()) || rawLower.includes(canonicalName.toLowerCase())) {
    return {
      requirementId: req.id,
      requirementName: req.name,
      canonicalName,
      category: req.category,
      isMandatory: req.isMandatory,
      status: 'partial',
      matchStrength: 0.4,
      reason: `Term mentioned in raw resume text, but not structured into an active role or verified project.`,
      evidence: {
        source: 'skills',
        text: `Text match for keyword "${req.name}" in resume body.`,
        sectionTitle: 'Resume Body',
        confidence: 0.5
      }
    };
  }

  // Not evidenced
  return {
    requirementId: req.id,
    requirementName: req.name,
    canonicalName,
    category: req.category,
    isMandatory: req.isMandatory,
    status: 'not_evidenced',
    matchStrength: 0.0,
    reason: `No direct, alias, or related evidence found in candidate profile.`
  };
}

// Calculate deterministic category & overall scores
export function calculateDeterministicScores(
  evaluations: RequirementEvaluation[],
  profile: CandidateProfile,
  job: JobDescription,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): { overallScore: number; categoryScores: CategoryScores; missingMandatoryCount: number } {
  // 1. Technical Skills (35 pts)
  // Separate mandatory (1.5x multiplier) vs preferred (1.0x multiplier)
  let totalTechMaxWeighted = 0;
  let totalTechEarnedWeighted = 0;

  for (const ev of evaluations) {
    const multiplier = ev.isMandatory ? 1.5 : 1.0;
    totalTechMaxWeighted += multiplier;
    totalTechEarnedWeighted += ev.matchStrength * multiplier;
  }

  const techNorm = totalTechMaxWeighted > 0 ? totalTechEarnedWeighted / totalTechMaxWeighted : 0;
  const techScore = Math.round(techNorm * weights.technicalSkills * 10) / 10;

  // 2. Relevant Experience (25 pts)
  // Calculate candidate estimated years of experience from experience items
  let totalExpMonths = 0;
  for (const exp of profile.experience) {
    const startYear = parseInt(exp.startDate.match(/\d{4}/)?.[0] || '2023', 10);
    const endYear = exp.isCurrent
      ? 2026
      : parseInt(exp.endDate.match(/\d{4}/)?.[0] || '2024', 10);
    const durationYears = Math.max(0.5, endYear - startYear);
    totalExpMonths += durationYears * 12;
  }
  const candidateYears = Math.max(1, Math.round(totalExpMonths / 12));
  const targetYears = Math.max(1, job.minYearsExperienceTotal || 2);
  const expRatio = Math.min(1.0, candidateYears / targetYears);
  const expScore = Math.round(expRatio * weights.relevantExperience * 10) / 10;

  // 3. Projects (20 pts)
  // Project count and demonstrated technical outcomes
  const projectCount = profile.projects.length;
  const projectsWithTech = profile.projects.filter(p => p.technologies.length > 0 || p.evidenceText).length;
  let projectRatio = 0;
  if (projectCount >= 2 && projectsWithTech >= 2) {
    projectRatio = 1.0;
  } else if (projectCount >= 1) {
    projectRatio = 0.65;
  } else {
    projectRatio = 0.2;
  }
  const projectScore = Math.round(projectRatio * weights.projects * 10) / 10;

  // 4. Education (10 pts)
  let eduRatio = 0.7; // default standard degree
  const eduDegrees = profile.education.map(e => e.degree.toLowerCase()).join(' ');
  const targetEdu = job.preferredEducation.toLowerCase();

  if (targetEdu.includes('master') || targetEdu.includes('phd')) {
    if (eduDegrees.includes('master') || eduDegrees.includes('m.s') || eduDegrees.includes('phd')) {
      eduRatio = 1.0;
    } else if (eduDegrees.includes('bachelor') || eduDegrees.includes('b.tech') || eduDegrees.includes('b.s')) {
      eduRatio = 0.75;
    }
  } else {
    // Bachelor or general CS degree preferred
    if (eduDegrees.includes('bachelor') || eduDegrees.includes('b.tech') || eduDegrees.includes('b.s') || eduDegrees.includes('master')) {
      eduRatio = 1.0;
    }
  }
  const eduScore = Math.round(eduRatio * weights.education * 10) / 10;

  // 5. Keywords / Terminology (10 pts)
  // Matches evaluated ratio
  const matchedCount = evaluations.filter(e => e.status === 'matched').length;
  const partialCount = evaluations.filter(e => e.status === 'partial').length;
  const keywordRatio = evaluations.length > 0
    ? (matchedCount + partialCount * 0.5) / evaluations.length
    : 0.5;
  const keywordScore = Math.round(keywordRatio * weights.keywords * 10) / 10;

  // Missing mandatory count
  const missingMandatoryCount = evaluations.filter(e => e.isMandatory && e.status === 'not_evidenced').length;

  const totalScore = Math.min(100, Math.round((techScore + expScore + projectScore + eduScore + keywordScore) * 10) / 10);

  const categoryScores: CategoryScores = {
    technicalSkills: {
      earned: techScore,
      max: weights.technicalSkills,
      percentage: Math.round((techScore / weights.technicalSkills) * 100)
    },
    relevantExperience: {
      earned: expScore,
      max: weights.relevantExperience,
      percentage: Math.round((expScore / weights.relevantExperience) * 100)
    },
    projects: {
      earned: projectScore,
      max: weights.projects,
      percentage: Math.round((projectScore / weights.projects) * 100)
    },
    education: {
      earned: eduScore,
      max: weights.education,
      percentage: Math.round((eduScore / weights.education) * 100)
    },
    keywords: {
      earned: keywordScore,
      max: weights.keywords,
      percentage: Math.round((keywordScore / weights.keywords) * 100)
    }
  };

  return {
    overallScore: totalScore,
    categoryScores,
    missingMandatoryCount
  };
}

// Generate grounded recommendations without LLM hallucinations
export function generateDeterministicRecommendations(
  evaluations: RequirementEvaluation[],
  profile: CandidateProfile,
  job: JobDescription,
  overallScore: number
): RecommendationReport {
  // Top 3 verified strengths
  const matchedEvaluations = evaluations.filter(e => e.status === 'matched' && e.evidence);
  const topStrengths = matchedEvaluations.slice(0, 3).map(e => ({
    title: `${e.requirementName} Implementation`,
    evidence: e.evidence?.text || `Demonstrated across verified ${e.evidence?.source || 'profile'}.`,
    relevance: `Directly satisfies ${e.isMandatory ? 'mandatory' : 'preferred'} qualification for ${job.title}.`
  }));

  // Missing mandatory
  const missingMandatory = evaluations
    .filter(e => e.isMandatory && e.status === 'not_evidenced')
    .map(e => ({
      skill: e.requirementName,
      impact: `Core mandatory qualification for ${job.title} is unevidenced in candidate profile.`,
      remedy: `Develop or document concrete project demonstrating hands-on implementation of ${e.canonicalName}.`
    }));

  // Preferred skills to develop
  const preferredSkillsToDevelop = evaluations
    .filter(e => !e.isMandatory && (e.status === 'not_evidenced' || e.status === 'partial'))
    .slice(0, 3)
    .map(e => ({
      skill: e.requirementName,
      rationale: e.status === 'partial'
        ? `Candidate demonstrates related familiarity, but lacks explicit ${e.canonicalName} deployment evidence.`
        : `Preferred competency that would elevate profile score by +${Math.round(100 / Math.max(1, evaluations.length))} points.`
    }));

  // Suggested project improvements
  const suggestedProjectImprovements: RecommendationReport['suggestedProjectImprovements'] = [];
  if (missingMandatory.length > 0) {
    suggestedProjectImprovements.push({
      action: `Build a standalone pipeline or microservice showcasing ${missingMandatory[0].skill}`,
      expectedGain: '+4 to +7 compatibility points'
    });
  }
  if (profile.projects.length > 0 && (!profile.projects[0].evidenceText || profile.projects[0].evidenceText.length < 30)) {
    suggestedProjectImprovements.push({
      action: `Add measurable metrics (e.g. latency, throughput, accuracy improvements) to "${profile.projects[0].title}"`,
      projectReference: profile.projects[0].title,
      expectedGain: '+3 points in Project Evidence depth'
    });
  }
  if (evaluations.some(e => e.canonicalName === 'Docker' && e.status !== 'matched')) {
    suggestedProjectImprovements.push({
      action: 'Containerize an existing backend project with Dockerfile and Docker Compose',
      expectedGain: '+4 points for DevOps & Deployment maturity'
    });
  }

  // Resume phrasing suggestions
  const resumePhrasingSuggestions: RecommendationReport['resumePhrasingSuggestions'] = [];
  if (profile.experience.length > 0 && profile.experience[0].highlights.length > 0) {
    const original = profile.experience[0].highlights[0];
    resumePhrasingSuggestions.push({
      originalExcerpt: original,
      recommendedEnhancement: `Engineered and deployed ${job.domain || 'software'} solutions using ${evaluations.find(e => e.status === 'matched')?.requirementName || 'production tech'}, achieving verifiable reliability and performance.`,
      justification: 'Quantifies impact and aligns technical verbs directly with role responsibilities.'
    });
  }

  const scoreExplanation = `Overall Compatibility Score: ${overallScore}/100. Evaluated against ${evaluations.length} requirements (${evaluations.filter(e => e.isMandatory).length} mandatory, ${evaluations.filter(e => !e.isMandatory).length} preferred). Found ${matchedEvaluations.length} verified matches, ${evaluations.filter(e => e.status === 'partial').length} partial matches, and ${missingMandatory.length} missing mandatory requirements. Note: This score is an evidence compatibility estimate, not an ATS pass/fail probability.`;

  return {
    topStrengths,
    missingMandatory,
    preferredSkillsToDevelop,
    suggestedProjectImprovements,
    resumePhrasingSuggestions,
    scoreExplanation
  };
}

// Build complete MatchRun
export function runMatchAnalysis(
  profile: CandidateProfile,
  job: JobDescription,
  providerLog: AIExecutionLog,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): MatchRun {
  const evaluations = job.requirements.map(req => evaluateRequirement(req, profile));
  const { overallScore, categoryScores, missingMandatoryCount } = calculateDeterministicScores(
    evaluations,
    profile,
    job,
    weights
  );

  let matchLevel: MatchRun['matchLevel'] = 'Deficient Match';
  if (overallScore >= 80 && missingMandatoryCount === 0) {
    matchLevel = 'Strong Match';
  } else if (overallScore >= 65) {
    matchLevel = 'Moderate Match';
  } else if (overallScore >= 45) {
    matchLevel = 'Low Match';
  }

  const recommendations = generateDeterministicRecommendations(
    evaluations,
    profile,
    job,
    overallScore
  );

  return {
    id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    candidateId: profile.id,
    candidateName: profile.name || 'Candidate',
    jobId: job.id,
    jobTitle: job.title || 'Target Role',
    jobCompany: job.company || 'Company',
    overallScore,
    matchLevel,
    categoryScores,
    evaluations,
    missingMandatoryCount,
    recommendations,
    scoringWeights: weights,
    executionLog: providerLog
  };
}
