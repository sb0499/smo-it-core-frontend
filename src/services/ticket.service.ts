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
  estado: 'Nuevo' | 'Pendiente' | 'Pruebas' | 'Finalizada' | 'En Proceso' | 'Escalado a Proyecto';
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
  estado?: 'Nuevo' | 'Pendiente' | 'Pruebas' | 'Finalizada' | 'En Proceso' | 'Escalado a Proyecto';
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

  async createDesdePlantilla(plantillaId: number): Promise<Ticket> {
    return apiClient.post<Ticket>(`/tickets/crear-desde-plantilla/${plantillaId}`);
  },

  async triggerCierreDiario(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/tickets/alertas/cierre-diario');
  },

  getReporteUrl(): string {
    const token = localStorage.getItem('smo_token');
    return `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/tickets/reporte/semanal?token=${token}`;
  }
};
