import { apiClient } from './client';

export interface AssessmentResponse {
  assessment_id: string;
  status: string;
}

export interface Question {
  id: string;
  topic: string;
  difficulty: number;
  text: string;
  options: string[];
}

export interface QuestionListResponse {
  questions: Question[];
}

export interface SubmitAssessmentRequest {
  answers: Record<string, string>;
}

export interface SubmitAssessmentResponse {
  status: string;
  results: {
    skill_category: string;
    score: number;
  }[];
}

export interface Skill {
  id: number;
  skill_category: string;
  score: number;
  last_assessed: string;
}

export const assessmentApi = {
  start: async (): Promise<AssessmentResponse> => {
    const response = await apiClient.post<AssessmentResponse>('/assessment/start');
    return response.data;
  },

  getQuestions: async (assessmentId: string): Promise<QuestionListResponse> => {
    const response = await apiClient.get<QuestionListResponse>(`/assessment/${assessmentId}/questions`);
    return response.data;
  },

  submit: async (assessmentId: string, payload: SubmitAssessmentRequest): Promise<SubmitAssessmentResponse> => {
    const response = await apiClient.post<SubmitAssessmentResponse>(`/assessment/${assessmentId}/submit`, payload);
    return response.data;
  },

  getSkills: async (): Promise<Skill[]> => {
    const response = await apiClient.get<Skill[]>('/assessment/skills');
    return response.data;
  }
};
