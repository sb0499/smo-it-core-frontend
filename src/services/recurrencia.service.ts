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
  creador_id?: number | null;
  creador_nombre?: string | null;
  tecnico_id?: number | null;
  tecnico_nombre?: string | null;
}

export const recurrenciaService = {
  async getSoportesRecurrentes(page = 1, limit = 10, search = '', tecnicoId?: number | string): Promise<{ total: number; page: number; limit: number; data: SoporteRecurrente[] }> {
    const params: any = { page, limit, search };
    if (tecnicoId !== undefined && tecnicoId !== '') params.tecnico_id = tecnicoId;
    return apiClient.get('/soportes-recurrentes', { params });
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
