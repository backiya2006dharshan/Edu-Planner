import { apiClient } from './client';
import { LearningPlanRequest, LearningPlanResponse } from '../types/learningPlan';

export const aiApi = {
  generateLearningPlan: async (request: LearningPlanRequest): Promise<LearningPlanResponse> => {
    const response = await apiClient.post<LearningPlanResponse>('/ai/learning-plan', request);
    return response.data;
  }
};
