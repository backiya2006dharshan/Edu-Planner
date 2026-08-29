import { apiClient } from './client';
import { User, UpdateProfileRequest } from '../types/auth';

export const authApi = {
  login: async (email: string, password: string): Promise<{ access_token: string; user: User }> => {
    const response = await apiClient.post<{ access_token: string; user: User }>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  register: async (
    email: string,
    password: string,
    fullName: string,
    role: string
  ): Promise<{ access_token: string; user: User }> => {
    const response = await apiClient.post<{ access_token: string; user: User }>('/auth/register', {
      email,
      password,
      full_name: fullName,
      role,
    });
    return response.data;
  },

  me: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  /** Update the authenticated user's profile fields. */
  updateProfile: async (payload: UpdateProfileRequest): Promise<User> => {
    const response = await apiClient.patch<User>('/auth/profile', payload);
    return response.data;
  },
};
