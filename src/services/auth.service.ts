import { apiClient } from './api';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  rol: 'ADMIN' | 'TECNICO' | 'USUARIO';
  nombre: string;
  must_change_password: boolean;
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/login', { username, password });
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<{ detail: string }> {
    return apiClient.post<{ detail: string }>('/auth/change-password', { currentPassword, newPassword });
  }
};
