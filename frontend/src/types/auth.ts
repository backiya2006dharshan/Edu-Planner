export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'student' | 'teacher';
  is_active: boolean;
}

export interface Token {
  access_token: string;
  token_type: string;
}
