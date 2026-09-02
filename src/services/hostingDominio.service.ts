import { apiClient } from './api';

export interface HostingDominio {
  id: number;
  tipo: 'HOSTING' | 'DOMINIO';
  nombre: string;
  detalle?: string;
  pagado_hasta: string;
  empresa_id?: number | null;
  proveedor_id?: number | null;
  creador_id?: number | null;
  precio_renovacion?: number | null;
  is_active: boolean;
  ultima_notificacion?: string | null;
  created_at?: string;
  updated_at?: string;
  empresa_nombre?: string;
  proveedor_nombre?: string;
  creador_nombre?: string;
  dias_restantes?: number;
  estado_vencimiento?: 'VIGENTE' | 'POR_VENCER' | 'VENCIDO';
}

export const hostingDominioService = {
  async getHostingsDominios(
    tipo?: 'HOSTING' | 'DOMINIO',
    empresaId?: number,
    search?: string
  ): Promise<HostingDominio[]> {
    const params: Record<string, any> = {};
    if (tipo) params.tipo = tipo;
    if (empresaId) params.empresa_id = empresaId;
    if (search) params.search = search;
    return apiClient.get<HostingDominio[]>('/hostings-dominios', { params });
  },

  async getById(id: number): Promise<HostingDominio> {
    return apiClient.get<HostingDominio>(`/hostings-dominios/${id}`);
  },

  async create(data: {
    tipo: 'HOSTING' | 'DOMINIO';
    nombre: string;
    detalle?: string;
    pagado_hasta: string;
    empresa_id?: number | null;
    proveedor_id?: number | null;
    precio_renovacion?: number | null;
  }): Promise<HostingDominio> {
    return apiClient.post<HostingDominio>('/hostings-dominios', data);
  },

  async update(
    id: number,
    data: {
      tipo: 'HOSTING' | 'DOMINIO';
      nombre: string;
      detalle?: string;
      pagado_hasta: string;
      empresa_id?: number | null;
      proveedor_id?: number | null;
      precio_renovacion?: number | null;
    }
  ): Promise<HostingDominio> {
    return apiClient.put<HostingDominio>(`/hostings-dominios/${id}`, data);
  },

  async renovarPagadoHasta(id: number, pagado_hasta: string): Promise<HostingDominio> {
    return apiClient.patch<HostingDominio>(`/hostings-dominios/${id}/renovar`, { pagado_hasta });
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete(`/hostings-dominios/${id}`);
  }
};
