import { apiClient } from './client';

export interface LearningTask {
  id: number;
  module_id: number;
  title: string;
  description?: string;
  task_type: string;
  order_index: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningModule {
  id: number;
  learning_plan_id: number;
  title: string;
  description?: string;
  order_index: number;
  status: string;
  tasks: LearningTask[];
  created_at: string;
  updated_at: string;
}

export interface LearningPlan {
  id: number;
  user_id: number;
  subject: string;
  topic: string;
  learning_goal: string;
  status: string;
  modules: LearningModule[];
  created_at: string;
  updated_at: string;
}

export const learningPlansApi = {
  /**
   * Get all learning plans for the current student
   */
  getAllPlans: async (): Promise<LearningPlan[]> => {
    const response = await apiClient.get<LearningPlan[]>('/api/learning-plans');
    return response.data;
  },

  /**
   * Get the active learning plan for the current student
   */
  getActivePlan: async (): Promise<LearningPlan> => {
    const response = await apiClient.get<LearningPlan>('/api/learning-plans/active');
    return response.data;
  },

  /**
   * Get a specific learning plan by ID
   */
  getPlanById: async (planId: number): Promise<LearningPlan> => {
    const response = await apiClient.get<LearningPlan>(`/api/learning-plans/${planId}`);
    return response.data;
  },

  /**
   * Mark a learning task as complete
   */
  completeTask: async (taskId: number): Promise<LearningTask> => {
    const response = await apiClient.patch<LearningTask>(`/api/learning-plans/tasks/${taskId}/complete`);
    return response.data;
  }
};
