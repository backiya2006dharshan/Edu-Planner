export type UserRole = 'student' | 'teacher'

export interface RegisterRequest {
  email: string
  full_name: string
  password: string
  role: UserRole
}

export interface LoginRequest {
  email: string
  password: string
}

export interface UserPublic {
  id: number
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
}

export interface AuthResponse {
  access_token: string
  token_type: 'bearer'
  user: UserPublic
}
