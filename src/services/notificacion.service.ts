import { apiClient } from './api';

export interface Notificacion {
  id: number;
  usuario_id: number;
  titulo: string;
  mensaje: string;
  leido: boolean;
  created_at: string;
}

export const notificacionService = {
  async getNotificaciones(): Promise<Notificacion[]> {
    return apiClient.get<Notificacion[]>('/notificaciones');
  },

  async marcarLeida(id: number): Promise<{ success: boolean }> {
    return apiClient.put<{ success: boolean }>(`/notificaciones/${id}/leer`);
  },

  async marcarTodasLeidas(): Promise<{ success: boolean }> {
    return apiClient.put<{ success: boolean }>('/notificaciones/leer-todas');
  }
};
