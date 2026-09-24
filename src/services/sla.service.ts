import { apiClient } from './api';

export interface SlaConfig {
  id: number;
  tipo_itil: 'SOLICITUD' | 'INCIDENCIA';
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Critica';
  tiempo_horas: number;
  descripcion?: string | null;
  updated_at?: string;
}

export const slaService = {
  async getSlaConfigs(): Promise<SlaConfig[]> {
    return apiClient.get<SlaConfig[]>('/sla-config');
  },

  async updateSlaConfig(
    id: number,
    data: { tiempo_horas: number; descripcion?: string }
  ): Promise<SlaConfig> {
    return apiClient.put<SlaConfig>(`/sla-config/${id}`, data);
  },

  async bulkUpdateSlaConfigs(
    configs: Array<{ id: number; tiempo_horas: number; descripcion?: string }>
  ): Promise<{ message: string; configs: SlaConfig[] }> {
    return apiClient.post<{ message: string; configs: SlaConfig[] }>(
      '/sla-config/bulk-update',
      { configs }
    );
  }
};
