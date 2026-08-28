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
}

export interface LearningPlanResponse {
  status: string;
  score: number;
  plan: GeneratedPlan;
  evaluator_feedback: string;
  issues: string[];
  iteration_count: number;
}
