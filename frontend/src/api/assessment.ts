import { apiClient } from './client';

export interface Question {
  id: number;
  skill_category: string;
  difficulty: string;
  text: string;
  options: string[];
}

export interface AssessmentResponse {
  assessment_id: number;
}

export interface AnswerSubmission {
  question_id: number;
  selected_answer: string;
}

export interface SubmitAssessmentRequest {
  answers: AnswerSubmission[];
}

export interface SubmitAssessmentResponse {
  message: string;
}

export interface Skill {
  id: number;
  skill_category: string;
  score: number;
  last_updated: string;
}

export const assessmentApi = {
  start: async (): Promise<AssessmentResponse> => {
    const response = await apiClient.post<AssessmentResponse>('/assessment/start');
    return response.data;
  },

  getQuestions: async (assessmentId: number): Promise<Question[]> => {
    const response = await apiClient.get<Question[]>(`/assessment/${assessmentId}/questions`);
    return response.data;
  },

  submit: async (assessmentId: number, payload: SubmitAssessmentRequest): Promise<SubmitAssessmentResponse> => {
    const response = await apiClient.post<SubmitAssessmentResponse>(
      `/assessment/${assessmentId}/submit`,
      payload
    );
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
};
