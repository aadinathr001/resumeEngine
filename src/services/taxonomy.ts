import { SkillTaxonomyEntry } from '../types';

export const SKILL_TAXONOMY: SkillTaxonomyEntry[] = [
  // Programming Languages
  {
    canonicalName: 'Python',
    category: 'Programming',
    aliases: ['python3', 'python 3', 'py', 'cpython'],
    relatedSkills: ['FastAPI', 'Django', 'Flask', 'PyTorch']
  },
  {
    canonicalName: 'TypeScript',
    category: 'Programming',
    aliases: ['ts', 'typescript language'],
    relatedSkills: ['JavaScript', 'Node.js', 'React']
  },
  {
    canonicalName: 'JavaScript',
    category: 'Programming',
    aliases: ['js', 'ecmascript', 'es6', 'esnext'],
    relatedSkills: ['TypeScript', 'Node.js', 'React']
  },
  {
    canonicalName: 'SQL',
    category: 'Programming',
    aliases: ['structured query language', 'ansi sql'],
    relatedSkills: ['PostgreSQL', 'MySQL', 'SQLite']
  },
  {
    canonicalName: 'Go',
    category: 'Programming',
    aliases: ['golang', 'go language'],
    relatedSkills: ['Docker', 'Kubernetes']
  },
  {
    canonicalName: 'C++',
    category: 'Programming',
    aliases: ['cpp', 'c plus plus', 'c/c++'],
    relatedSkills: ['CUDA', 'C']
  },

  // AI & ML
  {
    canonicalName: 'RAG',
    category: 'AI & ML',
    aliases: [
      'retrieval-augmented generation',
      'retrieval augmented generation',
      'rag pipelines',
      'retrieval generation'
    ],
    relatedSkills: ['Vector Databases', 'LLMs', 'Embeddings', 'LangChain']
  },
  {
    canonicalName: 'LLMs',
    category: 'AI & ML',
    aliases: [
      'large language models',
      'llm',
      'generative ai',
      'foundation models',
      'genai'
    ],
    relatedSkills: ['RAG', 'Prompt Engineering', 'Fine-Tuning', 'Ollama']
  },
  {
    canonicalName: 'PyTorch',
    category: 'AI & ML',
    aliases: ['torch', 'pytorch 2.0'],
    relatedSkills: ['TensorFlow', 'CUDA', 'Deep Learning']
  },
  {
    canonicalName: 'TensorFlow',
    category: 'AI & ML',
    aliases: ['tf', 'keras', 'tensorflow 2'],
    relatedSkills: ['PyTorch', 'Deep Learning']
  },
  {
    canonicalName: 'NLP',
    category: 'AI & ML',
    aliases: ['natural language processing', 'computational linguistics'],
    relatedSkills: ['spaCy', 'Transformers', 'Hugging Face']
  },
  {
    canonicalName: 'Vector Databases',
    category: 'AI & ML',
    aliases: ['vector db', 'vector search', 'embeddings db', 'vectorstore', 'vector indexing'],
    relatedSkills: ['ChromaDB', 'Pinecone', 'pgvector', 'FAISS', 'Qdrant']
  },
  {
    canonicalName: 'Ollama',
    category: 'AI & ML',
    aliases: ['ollama local', 'local llm inference', 'ollama api'],
    relatedSkills: ['LLMs', 'Qwen', 'Llama']
  },
  {
    canonicalName: 'FastAPI',
    category: 'Web & Backend',
    aliases: ['fast api', 'fastapi framework'],
    relatedSkills: ['Python', 'REST API', 'Pydantic', 'Uvicorn']
  },
  {
    canonicalName: 'Docker',
    category: 'Cloud & DevOps',
    aliases: ['containerization', 'docker compose', 'dockerfiles'],
    relatedSkills: ['Kubernetes', 'CI/CD']
  },
  {
    canonicalName: 'Kubernetes',
    category: 'Cloud & DevOps',
    aliases: ['k8s', 'kube', 'kubernetes cluster'],
    relatedSkills: ['Docker', 'Cloud Infrastructure', 'Helm']
  },
  {
    canonicalName: 'AWS',
    category: 'Cloud & DevOps',
    aliases: ['amazon web services', 'amazon aws', 'aws cloud'],
    relatedSkills: ['EC2', 'S3', 'Lambda', 'ECS', 'CloudFormation']
  },
  {
    canonicalName: 'GCP',
    category: 'Cloud & DevOps',
    aliases: ['google cloud platform', 'google cloud', 'gcloud'],
    relatedSkills: ['Cloud Run', 'GCS', 'BigQuery']
  },
  {
    canonicalName: 'PostgreSQL',
    category: 'Databases',
    aliases: ['postgres', 'psql', 'postgres db'],
    relatedSkills: ['SQL', 'pgvector', 'Relational Databases']
  },
  {
    canonicalName: 'REST API',
    category: 'Web & Backend',
    aliases: ['restful api', 'rest apis', 'restful apis', 'rest services', 'restful web services'],
    relatedSkills: ['FastAPI', 'Express', 'HTTP', 'JSON']
  },
  {
    canonicalName: 'React',
    category: 'Web & Backend',
    aliases: ['react.js', 'reactjs', 'react 18', 'react 19'],
    relatedSkills: ['JavaScript', 'TypeScript', 'Frontend', 'Next.js']
  },
  {
    canonicalName: 'Node.js',
    category: 'Web & Backend',
    aliases: ['node', 'nodejs', 'node runtime'],
    relatedSkills: ['Express', 'JavaScript', 'TypeScript']
  },
  {
    canonicalName: 'Pydantic',
    category: 'Web & Backend',
    aliases: ['pydantic v2', 'pydantic models'],
    relatedSkills: ['Python', 'FastAPI', 'Data Validation']
  },
  {
    canonicalName: 'CI/CD',
    category: 'Cloud & DevOps',
    aliases: ['continuous integration', 'continuous delivery', 'github actions', 'gitlab ci'],
    relatedSkills: ['Docker', 'DevOps']
  },
  {
    canonicalName: 'Git',
    category: 'Tools & Other',
    aliases: ['version control', 'github', 'gitlab'],
    relatedSkills: ['CI/CD']
  }
];

// Helper: Normalize string for comparison (strip punctuation, lower-case, trim)
export function cleanTerm(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s\+\#\.\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Canonical lookup
export function findCanonicalSkill(rawName: string): SkillTaxonomyEntry | null {
  const cleaned = cleanTerm(rawName);
  if (!cleaned) return null;

  for (const entry of SKILL_TAXONOMY) {
    if (cleanTerm(entry.canonicalName) === cleaned) {
      return entry;
    }
    for (const alias of entry.aliases) {
      if (cleanTerm(alias) === cleaned) {
        return entry;
      }
    }
  }

  return null;
}

// Check relationship between two skills
export function areSkillsRelated(skillA: string, skillB: string): boolean {
  const entryA = findCanonicalSkill(skillA);
  const entryB = findCanonicalSkill(skillB);

  if (!entryA || !entryB) {
    // If not in taxonomy, test substring match or identical clean text
    const cleanA = cleanTerm(skillA);
    const cleanB = cleanTerm(skillB);
    return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
  }

  if (entryA.canonicalName === entryB.canonicalName) return true;

  const isRelatedForward = entryA.relatedSkills.some(
    rel => cleanTerm(rel) === cleanTerm(entryB.canonicalName)
  );
  const isRelatedBackward = entryB.relatedSkills.some(
    rel => cleanTerm(rel) === cleanTerm(entryA.canonicalName)
  );

  return isRelatedForward || isRelatedBackward;
}
