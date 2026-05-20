import { apiClient } from './api';

export interface GuardiaFeriado {
  id: number;
  fecha: string; // "YYYY-MM-DD"
  tecnico_id: number;
  tecnico_nombre?: string;
  observaciones: string | null;
}

export const guardService = {
  async getGuardias(): Promise<GuardiaFeriado[]> {
    return apiClient.get<GuardiaFeriado[]>('/guardias');
  },

  async createGuardia(fecha: string, tecnicoId: number, observaciones?: string): Promise<GuardiaFeriado> {
    return apiClient.post<GuardiaFeriado>('/guardias', { fecha, tecnico_id: tecnicoId, observaciones });
  },

  async deleteGuardia(guardiaId: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/guardias/${guardiaId}`);
  }
};
