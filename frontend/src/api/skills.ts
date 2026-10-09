import { apiClient } from './client';

export interface SkillScores {
  numerical_calculation: number;
  abstract_thinking: number;
  logical_reasoning: number;
  association_analogy: number;
  spatial_imagination: number;
}

export const skillsApi = {
  getSkills: async (): Promise<SkillScores> => {
    const response = await apiClient.get('/assessment/skills');
    return response.data;
  },
};
