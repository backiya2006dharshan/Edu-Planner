export interface LearningPlanRequest {
  subject: string;
  topic: string;
  learning_goal: string;
  semester: string;
  regulation: string;
  year: string;
  college: string;
}

export interface GeneratedPlan {
  learning_objectives: string[];
  prerequisite_review: string;
  lesson_sequence: string[];
  practice_activities: string[];
  difficulty_progression: string;
  assessment_strategy: string;
  personalization_notes: string;
  rag_materials_used?: string[];
  expected_skills?: string[];
}

export interface SkillGaps {
  required_skills?: string[];
  known_skills?: string[];
  weak_skills?: string[];
  missing_skills?: string[];
  prerequisites?: string[];
}

export interface LearningPlanResponse {
  status: string;
  score: number;
  plan: GeneratedPlan;
  evaluator_feedback: string;
  issues: string[];
  iteration_count: number;
  skill_gaps?: SkillGaps;
  rag_retrieval_status?: string;
  rag_chunks_retrieved?: number;
}
