import axios from 'axios'

import type {
  CurriculumTreeResponse,
  DepartmentCreate,
  LearningObjectiveCreate,
  SemesterCreate,
  SubjectCreate,
  TopicCreate,
  TopicUpdate,
  UnitCreate,
} from '../types/curriculum'
import type { AuthResponse, LoginRequest, RegisterRequest, UserPublic } from '../types/auth'
import type { HealthResponse } from '../types/health'
import type { MaterialDocument, MaterialSearchRequest, MaterialSearchResponse } from '../types/materials'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10000,
  headers: {
    Accept: 'application/json',
  },
})

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/health')
  return response.data
}

export async function registerUser(payload: RegisterRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/register', payload)
  return response.data
}

export async function loginUser(payload: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', payload)
  return response.data
}

export async function fetchCurrentUser(token: string): Promise<UserPublic> {
  const response = await apiClient.get<UserPublic>('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

async function withAuth<T>(token: string, request: Promise<{ data: T }>): Promise<T> {
  const response = await request
  return response.data
}

export async function fetchCurriculumTree(token: string): Promise<CurriculumTreeResponse> {
  return withAuth(token, apiClient.get<CurriculumTreeResponse>('/curriculum/tree', { headers: { Authorization: `Bearer ${token}` } }))
}

export async function createDepartment(token: string, payload: DepartmentCreate): Promise<void> {
  await withAuth(token, apiClient.post('/curriculum/departments', payload, { headers: { Authorization: `Bearer ${token}` } }))
}

export async function createSemester(token: string, payload: SemesterCreate): Promise<void> {
  await withAuth(token, apiClient.post('/curriculum/semesters', payload, { headers: { Authorization: `Bearer ${token}` } }))
}

export async function createSubject(token: string, payload: SubjectCreate): Promise<void> {
  await withAuth(token, apiClient.post('/curriculum/subjects', payload, { headers: { Authorization: `Bearer ${token}` } }))
}

export async function createUnit(token: string, payload: UnitCreate): Promise<void> {
  await withAuth(token, apiClient.post('/curriculum/units', payload, { headers: { Authorization: `Bearer ${token}` } }))
}

export async function createTopic(token: string, payload: TopicCreate): Promise<void> {
  await withAuth(token, apiClient.post('/curriculum/topics', payload, { headers: { Authorization: `Bearer ${token}` } }))
}

export async function updateTopic(token: string, topicId: number, payload: TopicUpdate): Promise<void> {
  await withAuth(token, apiClient.patch(`/curriculum/topics/${topicId}`, payload, { headers: { Authorization: `Bearer ${token}` } }))
}

export async function deleteTopic(token: string, topicId: number): Promise<void> {
  await withAuth(token, apiClient.delete(`/curriculum/topics/${topicId}`, { headers: { Authorization: `Bearer ${token}` } }))
}

export async function createLearningObjective(token: string, payload: LearningObjectiveCreate): Promise<void> {
  await withAuth(token, apiClient.post('/curriculum/learning-objectives', payload, { headers: { Authorization: `Bearer ${token}` } }))
}

export async function deleteLearningObjective(token: string, learningObjectiveId: number): Promise<void> {
  await withAuth(token, apiClient.delete(`/curriculum/learning-objectives/${learningObjectiveId}`, { headers: { Authorization: `Bearer ${token}` } }))
}


export async function fetchMaterialDocuments(
  token: string,
  filters?: { college?: string; semester?: string; regulation?: string },
): Promise<MaterialDocument[]> {
  return withAuth(
    token,
    apiClient.get<MaterialDocument[]>('/materials', {
      params: filters,
      headers: { Authorization: `Bearer ${token}` },
    }),
  )
}

export async function uploadMaterial(token: string, formData: FormData): Promise<MaterialDocument> {
  return withAuth(
    token,
    apiClient.post<MaterialDocument>('/materials', formData, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    }),
  )
}

export async function searchMaterials(token: string, payload: MaterialSearchRequest): Promise<MaterialSearchResponse> {
  return withAuth(
    token,
    apiClient.post<MaterialSearchResponse>('/materials/search', payload, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  )
}
