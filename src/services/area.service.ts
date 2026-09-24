import { apiClient } from './api';

export interface Area {
  id: number;
  nombre: string;
  descripcion?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedAreas {
  data: Area[];
  total: number;
  page: number;
  totalPages: number;
}

export const areaService = {
  async getAreas(params?: {
    search?: string;
    page?: number;
    limit?: number;
    onlyActive?: boolean;
  }): Promise<PaginatedAreas> {
    return apiClient.get<PaginatedAreas>('/areas', { params: params as any });
  },

  async getAllActiveAreas(): Promise<Area[]> {
    const res = await apiClient.get<PaginatedAreas>('/areas', {
      params: { onlyActive: true, limit: 1000 }
    });
    return res.data || [];
  },

  async getAreaById(id: number): Promise<Area> {
    return apiClient.get<Area>(`/areas/${id}`);
  },

  async createArea(data: {
    nombre: string;
    descripcion?: string;
    is_active?: boolean;
  }): Promise<Area> {
    return apiClient.post<Area>('/areas', data);
  },

  async updateArea(
    id: number,
    data: {
      nombre?: string;
      descripcion?: string;
      is_active?: boolean;
    }
  ): Promise<Area> {
    return apiClient.put<Area>(`/areas/${id}`, data);
  },

  async deleteArea(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/areas/${id}`);
  }
};
