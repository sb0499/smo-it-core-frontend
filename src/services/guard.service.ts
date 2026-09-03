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
    const params: any = {};
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;
    return apiClient.get('/guardias', { params });
  },

  async createGuardia(fecha: string, tecnicoId: number, observaciones?: string, empresaId?: number | null): Promise<GuardiaFeriado> {
    return apiClient.post<GuardiaFeriado>('/guardias', { 
      fecha, 
      tecnico_id: tecnicoId, 
      observaciones,
      empresa_id: empresaId
    });
  },

  async programarTurno(fechas: string[], tecnicoId: number, observaciones?: string, empresaIds?: (number | null)[]): Promise<any> {
    return apiClient.post('/guardias/programar-turno', {
      fechas,
      tecnico_id: tecnicoId,
      observaciones,
      empresa_ids: empresaIds
    });
  },

  async deleteGuardia(guardiaId: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/guardias/${guardiaId}`);
  }
};
