import { apiClient } from './api';

export interface GuardiaFeriado {
  id: number;
  fecha: string; // "YYYY-MM-DD"
  tecnico_id: number;
  tecnico_nombre?: string;
  observaciones: string | null;
  empresa_id?: number | null;
  empresa_nombre?: string | null;
}

export const guardService = {
  async getGuardias(page?: number, limit?: number): Promise<any> {
    return apiClient.get('/guardias', {
      params: { page, limit }
    });
  },

  async createGuardia(fecha: string, tecnicoId: number, observaciones?: string, empresaId?: number | null): Promise<GuardiaFeriado> {
    return apiClient.post<GuardiaFeriado>('/guardias', { 
      fecha, 
      tecnico_id: tecnicoId, 
      observaciones,
      empresa_id: empresaId
    });
  },

  async deleteGuardia(guardiaId: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/guardias/${guardiaId}`);
  }
};
