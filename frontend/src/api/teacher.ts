import { apiClient } from './client';
import { User } from '../types/auth';

export interface StudentProgress {
  user: User;
  skills_assessed: number;
  topics_completed: number;
  average_score: number;
  last_active: string;
}

export interface TeacherStats {
  total_students: number;
  active_plans: number;
  avg_completion_rate: number;
  students_needing_attention: number;
}

export interface TeacherActivity {
  name: string;
  action: string;
  time: string;
}

export const teacherApi = {
  getStats: async (): Promise<TeacherStats> => {
    const response = await apiClient.get<TeacherStats>('/teacher/stats');
    return response.data;
  },
  getStudents: async (): Promise<StudentProgress[]> => {
    const response = await apiClient.get<StudentProgress[]>('/teacher/students');
    return response.data;
  },
  getActivity: async (): Promise<TeacherActivity[]> => {
    const response = await apiClient.get<TeacherActivity[]>('/teacher/activity');
    return response.data;
  },
};
