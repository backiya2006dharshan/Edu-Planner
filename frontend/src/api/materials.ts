import { apiClient } from './client';

export interface Material {
  id: number;
  filename: string;
  college: string;
  semester: string;
  regulation: string;
  subject: string;
  upload_date: string;
}

export interface SearchMaterialsRequest {
  query: string;
  college: string;
  semester: string;
  regulation: string;
  limit?: number;
}

export const materialsApi = {
  list: async (college?: string, subject?: string): Promise<Material[]> => {
    const params = new URLSearchParams();
    if (college) params.append('college', college);
    if (subject) params.append('subject', subject);
    
    const response = await apiClient.get<Material[]>('/materials', { params });
    return response.data;
  },

  search: async (request: SearchMaterialsRequest): Promise<any> => {
    const response = await apiClient.post('/materials/search', request);
    return response.data;
  }
};
