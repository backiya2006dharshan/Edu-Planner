import { apiClient } from './client';

export interface MilestoneItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'assessment' | 'plan_created' | 'plan_completed' | 'skill_mastered';
}

export interface StudentProgressSummary {
  streak_days: number;
  plans_completed: number;
  skills_mastered: number;
  total_tasks: number;
  completed_tasks: number;
  materials_count: number;
  average_skill_score: number;
  recent_milestones: MilestoneItem[];
}

export const progressApi = {
  getSummary: async (): Promise<StudentProgressSummary> => {
    const response = await apiClient.get<StudentProgressSummary>('/student/progress');
    return response.data;
  },
};
