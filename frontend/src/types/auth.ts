export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'student' | 'teacher';
  is_active: boolean;
  // Extended profile fields
  phone?: string | null;
  department?: string | null;
  year_of_study?: string | null;
  bio?: string | null;
  college?: string | null;
  regulation?: string | null;
  semester?: string | null;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  phone?: string;
  department?: string;
  year_of_study?: string;
  bio?: string;
  college?: string;
  regulation?: string;
  semester?: string;
}
