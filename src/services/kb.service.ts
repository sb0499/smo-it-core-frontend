import { apiClient } from './api';

export interface ArticuloKB {
  id: number;
  titulo: string;
  pasos_solucion: string;
  categoria: string;
  ticket_origen_id?: number | null;
  ticket_origen_titulo?: string | null;
  creador_id?: number | null;
  creador_nombre?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const kbService = {
  async getArticulos(search = '', categoria = '', page = 1, limit = 10): Promise<{ total: number; page: number; limit: number; data: ArticuloKB[] }> {
    return apiClient.get('/base-conocimiento', {
      params: { search, categoria, page, limit }
    });
  },

  async getArticuloById(id: number): Promise<ArticuloKB> {
    return apiClient.get<ArticuloKB>(`/base-conocimiento/${id}`);
  },

  async createArticulo(payload: Partial<ArticuloKB>): Promise<ArticuloKB> {
    return apiClient.post<ArticuloKB>('/base-conocimiento', payload);
  },

  async updateArticulo(id: number, payload: Partial<ArticuloKB>): Promise<ArticuloKB> {
    return apiClient.put<ArticuloKB>(`/base-conocimiento/${id}`, payload);
  },

  async deleteArticulo(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/base-conocimiento/${id}`);
  }
};
