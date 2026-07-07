import { apiClient } from './api';

export interface Ticket {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  empresa_id: number | null;
  empresa_nombre?: string;
  area_solicitante: string | null;
  persona_solicitante: string | null;
  medio_solicitud: 'Plataforma' | 'WhatsApp' | 'Llamada' | 'Correo' | 'Presencial' | 'Automático (Recurrente)' | 'Automático (Inventario)';
  fecha_final_tentativa: string | null;
  avance_proceso: number;
  observaciones: string | null;
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Critica';
  estado: 'Nuevo' | 'Pendiente' | 'Pruebas' | 'Finalizada' | 'En Proceso' | 'Escalado a Proyecto' | 'Escalado a Proveedor';
  nivel_soporte: 'N1' | 'N2' | 'N3';
  grupo_n2?: 'Infraestructura' | 'Desarrollo' | null;
  sla_paused_at: string | null;
  sla_acumulado_pausa_segundos: number;
  creador_id: number;
  tecnico_id: number | null;
  tecnico_nombre?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketPayload {
  titulo: string;
  descripcion: string;
  categoria: string;
  empresa_id?: number | null;
  area_solicitante?: string | null;
  persona_solicitante?: string | null;
  medio_solicitud?: string;
  fecha_final_tentativa?: string | null;
  prioridad?: 'Baja' | 'Media' | 'Alta' | 'Critica';
  tecnico_id?: number | null;
}

export interface UpdateTicketPayload {
  titulo?: string;
  estado?: 'Nuevo' | 'Pendiente' | 'Pruebas' | 'Finalizada' | 'En Proceso' | 'Escalado a Proyecto' | 'Escalado a Proveedor';
  avance_proceso?: number;
  observaciones?: string | null;
  tecnico_id?: number | null;
}

export const ticketService = {
  async getTickets(): Promise<Ticket[]> {
    return apiClient.get<Ticket[]>('/tickets');
  },

  async createTicket(payload: CreateTicketPayload): Promise<Ticket> {
    return apiClient.post<Ticket>('/tickets', payload);
  },

  async updateTicket(ticketId: number, payload: UpdateTicketPayload): Promise<Ticket> {
    return apiClient.put<Ticket>(`/tickets/${ticketId}`, payload);
  },

  async escalarTicketAN2(ticketId: number, payload: { grupo_n2: 'Infraestructura' | 'Desarrollo'; tecnico_id: number | null }): Promise<Ticket> {
    return apiClient.post<Ticket>(`/tickets/${ticketId}/escalar-n2`, payload);
  },

  async triggerCierreDiario(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/tickets/alertas/cierre-diario');
  },

  async getCategorias(): Promise<{ id: number; nombre: string; is_active: boolean }[]> {
    return apiClient.get<{ id: number; nombre: string; is_active: boolean }[]>('/tickets/categorias');
  },

  getReporteUrl(): string {
    const token = localStorage.getItem('smo_token');
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/tickets/reporte/semanal?token=${token}`;
  }
};
