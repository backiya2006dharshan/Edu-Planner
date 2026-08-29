import { apiClient } from './client';

export interface ClassCreatePayload {
  name: string;
  college?: string;
  year?: string;
  semester?: string;
  regulation?: string;
  section?: string;
}

export interface ClassJoinPayload {
  code: string;
}

export interface ClassMember {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  joined_at: string;
}

export interface Classroom {
  id: number;
  teacher_id: number;
  teacher_name?: string;
  name: string;
  code: string;
  college?: string;
  year?: string;
  semester?: string;
  regulation?: string;
  section?: string;
  is_active: boolean;
  member_count: number;
  created_at: string;
}

export const classroomApi = {
  createClass: async (payload: ClassCreatePayload): Promise<Classroom> => {
    const response = await apiClient.post<Classroom>('/classes', payload);
    return response.data;
  },

  getTeacherClasses: async (): Promise<Classroom[]> => {
    const response = await apiClient.get<Classroom[]>('/classes/teacher');
    return response.data;
  },

  joinClass: async (payload: ClassJoinPayload): Promise<Classroom> => {
    const response = await apiClient.post<Classroom>('/classes/join', payload);
    return response.data;
  },

  getStudentClasses: async (): Promise<Classroom[]> => {
    const response = await apiClient.get<Classroom[]>('/classes/student');
    return response.data;
  },

  getClassDetails: async (classId: number): Promise<Classroom> => {
    const response = await apiClient.get<Classroom>(`/classes/${classId}`);
    return response.data;
  },

  getClassMembers: async (classId: number): Promise<ClassMember[]> => {
    const response = await apiClient.get<ClassMember[]>(`/classes/${classId}/members`);
    return response.data;
  },

  leaveClass: async (classId: number): Promise<void> => {
    await apiClient.delete(`/classes/${classId}/leave`);
  },
};
