import { apiClient } from './client';

export interface Question {
  id: number;
  question_text: string;
  options: string[];
  skill_category?: string;
}

export interface MaterialOption {
  id: number;
  file_name: string;
  subject: string;
  chunk_count: number;
  college: string;
  semester: string;
}

export interface GenerateQuestionsRequest {
  material_id: number;
  num_questions?: number;
}

export interface GeneratedQuestionsResponse {
  session_id: string;
  material_name: string;
  subject: string;
  topic: string;
  questions: Question[];
}

export interface DynamicAssessmentSubmitAnswer {
  question_id: number;
  selected_option: string;
}

export interface DynamicAssessmentSubmitRequest {
  session_id: string;
  answers: DynamicAssessmentSubmitAnswer[];
}

export interface DynamicAssessmentSubmitResponse {
  score_percent: number;
  correct_count: number;
  total_count: number;
  skill_performance: Record<string, number>;
  weak_areas: string[];
  strong_areas: string[];
  learning_plan_id?: number;
  learning_plan_summary?: string;
  message: string;
}

export interface Skill {
  id: number;
  skill_category: string;
  score: number;
  last_updated: string;
}

export const assessmentApi = {
  getMaterials: async (): Promise<MaterialOption[]> => {
    const response = await apiClient.get<MaterialOption[]>('/assessment/materials');
    return response.data;
  },

  generateQuestions: async (payload: GenerateQuestionsRequest): Promise<GeneratedQuestionsResponse> => {
    const response = await apiClient.post<GeneratedQuestionsResponse>('/assessment/generate-questions', payload);
    return response.data;
  },

  submit: async (payload: DynamicAssessmentSubmitRequest): Promise<DynamicAssessmentSubmitResponse> => {
    const response = await apiClient.post<DynamicAssessmentSubmitResponse>('/assessment/submit', payload);
    return response.data;
  },

  getSkills: async (): Promise<Skill[]> => {
    const response = await apiClient.get<Skill[]>('/assessment/skills');
    return response.data;
  },

  addCustomSkill: async (skill_category: string): Promise<Skill> => {
    const response = await apiClient.post<Skill>('/assessment/custom-skill', { skill_category });
    return response.data;
  },

  updateSkillScore: async (skillId: number, score: number): Promise<Skill> => {
    const response = await apiClient.patch<Skill>(`/assessment/skills/${skillId}`, { score });
    return response.data;
  },

  start: async (): Promise<{ assessment_id: number }> => {
    // Mock implementation for start
    return { assessment_id: Date.now() };
  },

  getQuestions: async (assessmentId: number): Promise<Question[]> => {
    // Mock implementation for getQuestions to prevent blank screen
    return [
      {
        id: 1,
        question_text: "What is the most effective way to start analyzing a new problem?",
        skill_category: "Logical Reasoning",
        options: [
          "Break it down into smaller, manageable parts",
          "Guess the answer immediately",
          "Ask someone else to do it",
          "Skip it entirely"
        ]
      },
      {
        id: 2,
        question_text: "If A is greater than B, and B is greater than C, which is true?",
        skill_category: "Abstract Thinking",
        options: [
          "C is greater than A",
          "A is greater than C",
          "A and C are equal",
          "Cannot be determined"
        ]
      },
      {
        id: 3,
        question_text: "Which pattern comes next: 2, 4, 8, 16, ...?",
        skill_category: "Numerical Calculation",
        options: [
          "24",
          "32",
          "64",
          "20"
        ]
      }
    ];
  }
};

