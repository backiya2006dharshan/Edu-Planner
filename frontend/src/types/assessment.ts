export interface DiagnosticQuestionPublic {
  id: number;
  text: string;
  options: string[];
  skill_category: string;
  difficulty: string;
}

export interface AssessmentStartResponse {
  assessment_id: number;
}

export interface AssessmentSubmitAnswer {
  question_id: number;
  selected_answer: string;
}

export interface AssessmentSubmitRequest {
  answers: AssessmentSubmitAnswer[];
}

export interface SkillScore {
  skill_category: string;
  score: number;
  last_updated: string;
}
