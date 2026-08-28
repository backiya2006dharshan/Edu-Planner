import { apiClient } from './client';
import { User } from '../types/auth';

export interface StudentProgress {
  user: User;
  skills_assessed: number;
  topics_completed: number;
  average_score: number;
  last_active: string;
}

export const teacherApi = {
  getStudents: async (): Promise<StudentProgress[]> => {
    // Note: Mocking endpoint for now since there's no specific Phase 1-5 teacher endpoints
    // Returning dummy data
    return [
      {
        user: { id: 2, email: 'alice@kongu.edu', full_name: 'Alice Johnson', role: 'student', is_active: true },
        skills_assessed: 4,
        topics_completed: 2,
        average_score: 85,
        last_active: '2026-08-27T10:00:00Z'
      },
      {
        user: { id: 3, email: 'bob@kongu.edu', full_name: 'Bob Smith', role: 'student', is_active: true },
        skills_assessed: 2,
        topics_completed: 1,
        average_score: 60,
        last_active: '2026-08-26T15:30:00Z'
      }
    ];
  }
};
