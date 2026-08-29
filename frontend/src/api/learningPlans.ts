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

export interface VerificationQuestion {
  id: number;
  question_text: string;
  options: string[];
}

export interface VerificationSubmitResult {
  passed: boolean;
  score_percent: number;

  correct_count: number;
  total_count: number;
  message: string;
}

export const learningPlansApi = {
  /**
   * Get all learning plans for the current student.
   * Endpoint: GET /api/learning-plans  (baseURL already includes /api)
   */
  getAllPlans: async (): Promise<LearningPlan[]> => {
    const response = await apiClient.get<LearningPlan[]>('/learning-plans');
    return response.data;
  },

  /**
   * Get the active learning plan for the current student.
   * Endpoint: GET /api/learning-plans/active
   */
  getActivePlan: async (): Promise<LearningPlan | null> => {
    try {
      const response = await apiClient.get<LearningPlan | null>('/learning-plans/active');
      return response.data;
    } catch (err: any) {
      if (err.response && err.response.status === 404) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Get a specific learning plan by ID.
   * Endpoint: GET /api/learning-plans/:planId
   */
  getPlanById: async (planId: number): Promise<LearningPlan> => {
    const response = await apiClient.get<LearningPlan>(`/learning-plans/${planId}`);
    return response.data;
  },

  /**
   * Mark a learning task as complete.
   * Endpoint: PATCH /api/learning-plans/tasks/:taskId/complete
   */
  completeTask: async (taskId: number): Promise<LearningTask> => {
    const response = await apiClient.patch<LearningTask>(`/learning-plans/tasks/${taskId}/complete`);
    return response.data;
  },

  /**
   * Fetch 5-MCQ verification questions for a learning plan.
   * Endpoint: GET /api/learning-plans/:planId/verification-questions
   */
  getVerificationQuestions: async (planId: number): Promise<VerificationQuestion[]> => {
    const response = await apiClient.get<VerificationQuestion[]>(`/learning-plans/${planId}/verification-questions`);
    return response.data;
  },

  /**
   * Submit answers for the 5-MCQ verification test.
   * Endpoint: POST /api/learning-plans/:planId/verify-submit
   */
  submitVerificationTest: async (
    planId: number,
    answers: { question_id: number; selected_option: string }[]
  ): Promise<VerificationSubmitResult> => {
    const response = await apiClient.post<VerificationSubmitResult>(`/learning-plans/${planId}/verify-submit`, { answers });
    return response.data;
  }
};

