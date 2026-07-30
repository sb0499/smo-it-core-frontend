import { apiClient } from './api';

export interface CredencialEntrega {
  id: number;
  secuencial: string;
  empresa_id: number;
  empresa_nombre: string;
  fecha_entrega: string;
  tipo: string;
  sitio: string;
  usuario: string;
  clave: string;
  entregado_por_id: number;
  entregado_por_nombre: string;
  recibido_por_nombre: string;
  recibido_por_area: string;
  correo_receptor?: string;
  created_at: string;
}

export const credencialService = {
  async getEntregas(page = 1, limit = 10, search = ''): Promise<{ total: number; page: number; limit: number; data: CredencialEntrega[] }> {
    return apiClient.get('/credenciales', {
      params: { page, limit, search }
    });
  },

  async getNextSecuencial(empresaId: number, fechaEntrega: string): Promise<{ secuencial: string }> {
    return apiClient.get<{ secuencial: string }>(
      `/credenciales/next-secuencial?empresa_id=${empresaId}&fecha_entrega=${fechaEntrega}`
    );
  },

  async createEntrega(payload: {
    empresa_id: number;
    fecha_entrega: string;
    tipo: string;
    sitio: string;
    usuario: string;
    clave: string;
    recibido_por_nombre: string;
    recibido_por_area: string;
    correo_receptor?: string;
  }): Promise<CredencialEntrega> {
    return apiClient.post<CredencialEntrega>('/credenciales', payload);
  },

  async deleteEntrega(id: number): Promise<any> {
    return apiClient.delete(`/credenciales/${id}`);
  },

  getPDFUrl(id: number, version: 'usuario' | 'ti'): string {
    const token = localStorage.getItem('smo_token');
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/credenciales/${id}/pdf?version=${version}&token=${token}`;
  }
};
