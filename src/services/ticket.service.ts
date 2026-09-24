import { apiClient, API_BASE_URL } from './api';

export interface TicketAdjunto {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  tamano: number;
  fecha: string;
  usuario: string;
  etapa: 'creacion' | 'resolucion' | 'cierre' | 'seguimiento';
}

export interface Ticket {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  empresa_id: number | null;
  empresa_nombre?: string;
  sucursal_id?: number | null;
  sucursal_nombre?: string;
  area_solicitante: string | null;
  persona_solicitante: string | null;
  medio_solicitud: 'Plataforma' | 'WhatsApp' | 'Llamada' | 'Correo' | 'Presencial' | 'Automático (Recurrente)' | 'Automático (Inventario)';
  fecha_final_tentativa: string | null;
  avance_proceso: number;
  observaciones: string | null;
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Critica';
  estado: 'Nuevo' | 'En Proceso' | 'Resuelto' | 'Cerrado' | 'Elevado a Proveedor' | 'Elevado a Administración' | 'Finalizada';
  nivel_soporte: 'N1' | 'N2' | 'N3' | 'ADMIN';
  grupo_n2?: 'Infraestructura' | 'Desarrollo' | null;
  sla_paused_at: string | null;
  sla_acumulado_pausa_segundos: number;
  creador_id: number;
  tecnico_id: number | null;
  tecnico_nombre?: string;
  tecnico_n1_id?: number | null;
  tecnico_n1_nombre?: string;
  tecnico_n2_id?: number | null;
  tecnico_n2_nombre?: string;
  adjuntos?: TicketAdjunto[];
  bitacora_dinamica?: { accion: string; fecha: string; usuario?: string }[];
  created_at: string;
  updated_at: string;
}

export interface CreateTicketPayload {
  titulo: string;
  descripcion: string;
  categoria: string;
  empresa_id?: number | null;
  sucursal_id?: number | null;
  area_solicitante?: string | null;
  persona_solicitante?: string | null;
  medio_solicitud?: string;
  fecha_final_tentativa?: string | null;
  prioridad?: 'Baja' | 'Media' | 'Alta' | 'Critica';
  tecnico_id?: number | null;
  nivel_soporte?: 'N1' | 'N2';
  adjuntos?: TicketAdjunto[];
}

export interface UpdateTicketPayload {
  titulo?: string;
  estado?: 'Nuevo' | 'En Proceso' | 'Resuelto' | 'Cerrado' | 'Elevado a Proveedor' | 'Elevado a Administración' | 'Finalizada';
  avance_proceso?: number;
  observaciones?: string | null;
  tecnico_id?: number | null;
  adjuntos?: TicketAdjunto[];
}

export const ticketService = {
  async getTickets(): Promise<Ticket[]> {
    return apiClient.get<Ticket[]>('/tickets');
  },

  async getTicketsPaginated(
    page = 1, 
    limit = 10, 
    excludeStatus?: string, 
    estado?: string, 
    search?: string, 
    tecnicoId?: number | string,
    tipoItil?: 'SOLICITUDES' | 'INCIDENCIAS' | string
  ): Promise<{ total: number; page: number; limit: number; data: Ticket[] }> {
    const params: any = { page, limit };
    if (excludeStatus !== undefined) params.excludeStatus = excludeStatus;
    if (estado !== undefined) params.estado = estado;
    if (search !== undefined) params.search = search;
    if (tecnicoId !== undefined && tecnicoId !== '') params.tecnico_id = tecnicoId;
    if (tipoItil !== undefined && tipoItil !== '') params.tipo_itil = tipoItil;
    return apiClient.get('/tickets/paginated', { params });
  },

  async createTicket(payload: CreateTicketPayload): Promise<Ticket> {
    return apiClient.post<Ticket>('/tickets', payload);
  },

  async updateTicket(ticketId: number, payload: UpdateTicketPayload): Promise<Ticket> {
    return apiClient.put<Ticket>(`/tickets/${ticketId}`, payload);
  },

  async uploadAdjuntos(files: File[], etapa = 'creacion'): Promise<TicketAdjunto[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('archivos', file));
    formData.append('etapa', etapa);
    const res = await apiClient.post<{ adjuntos: TicketAdjunto[] }>('/tickets/upload', formData);
    return res.adjuntos;
  },

  async addAdjuntosToTicket(ticketId: number, files: File[], etapa = 'seguimiento'): Promise<Ticket> {
    const formData = new FormData();
    files.forEach(file => formData.append('archivos', file));
    formData.append('etapa', etapa);
    return apiClient.post<Ticket>(`/tickets/${ticketId}/adjuntos`, formData);
  },

  async escalarTicketAN2(ticketId: number, payload: { grupo_n2: 'Infraestructura' | 'Desarrollo'; tecnico_id: number | null }): Promise<Ticket> {
    return apiClient.post<Ticket>(`/tickets/${ticketId}/escalar-n2`, payload);
  },

  async escalarTicketAAdmin(ticketId: number, payload?: { tecnico_id?: number | null }): Promise<Ticket> {
    return apiClient.post<Ticket>(`/tickets/${ticketId}/escalar-admin`, payload || {});
  },

  async escalarTicketAProveedor(ticketId: number): Promise<Ticket> {
    return apiClient.post<Ticket>(`/tickets/${ticketId}/escalar-proveedor`);
  },

  async escalarTicketAProyecto(ticketId: number): Promise<{ ticket: Ticket; proyecto_id: number; proyecto_nombre: string }> {
    return apiClient.post<{ ticket: Ticket; proyecto_id: number; proyecto_nombre: string }>(`/tickets/${ticketId}/escalar-proyecto`);
  },

  async triggerCierreDiario(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/tickets/alertas/cierre-diario');
  },

  async getCategorias(): Promise<{ id: number; nombre: string; is_active: boolean }[]> {
    return apiClient.get<{ id: number; nombre: string; is_active: boolean }[]>('/tickets/categorias');
  },

  async getPreviewReporteDiario(fecha?: string): Promise<any> {
    return apiClient.get('/tickets/reporte-diario/preview', { params: fecha ? { fecha } : {} });
  },

  async enviarReporteDiarioEmail(fecha?: string): Promise<{ message: string; destinatarios: string[] }> {
    return apiClient.post('/tickets/reporte-diario/enviar-correo', { fecha });
  },

  async descargarReporteDiarioExcel(fecha?: string): Promise<void> {
    const token = localStorage.getItem('smo_token');
    const cleanBaseUrl = API_BASE_URL.replace(/\/+$/, '');
    const url = `${cleanBaseUrl}/tickets/reporte-diario/excel${fecha ? `?fecha=${fecha}` : ''}`;
    const res = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      throw new Error('Error al descargar el archivo Excel del reporte diario');
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `Reporte_Diario_Soporte_${fecha || new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  getReporteUrl(): string {
    const token = localStorage.getItem('smo_token');
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/tickets/reporte/semanal?token=${token}`;
  }
};

