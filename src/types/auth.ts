export interface User {
  email: string;
  credits: number;
}

export interface AuthResponse {
  message?: string;
  token?: string; // Token is optional because Signup might not return it immediately in some flows
  user: User;
}