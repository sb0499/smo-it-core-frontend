import { apiClient } from './api';

export interface SoporteRecurrente {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  empresa_id: number | null;
  empresa_nombre?: string;
  area_solicitante: string | null;
  persona_solicitante: string | null;
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Critica';
  frecuencia: 'Diario' | 'Semanal' | 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual';
  fecha_inicio: string;
  siguiente_ejecucion: string;
  ultima_ejecucion: string | null;
  is_active: number | boolean;
}

export const recurrenciaService = {
  async getSoportesRecurrentes(page = 1, limit = 10, search = ''): Promise<{ total: number; page: number; limit: number; data: SoporteRecurrente[] }> {
    return apiClient.get('/soportes-recurrentes', {
      params: { page, limit, search }
    });
  },

  async createSoporteRecurrente(payload: Partial<SoporteRecurrente>): Promise<SoporteRecurrente> {
    return apiClient.post<SoporteRecurrente>('/soportes-recurrentes', payload);
  },

  async updateSoporteRecurrente(id: number, payload: Partial<SoporteRecurrente>): Promise<SoporteRecurrente> {
    return apiClient.put<SoporteRecurrente>(`/soportes-recurrentes/${id}`, payload);
  },

  async deleteSoporteRecurrente(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/soportes-recurrentes/${id}`);
  }
};
