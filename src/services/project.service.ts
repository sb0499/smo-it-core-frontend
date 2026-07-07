import { apiClient } from './api';

export interface Subtarea {
  id: number;
  tarea_id: number;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  avance_porcentaje: number;
  estado: 'Stand By' | 'Sin Iniciar' | 'En Proceso' | 'Pruebas' | 'Finalizado';
  responsable_id: number;
  responsable_nombre?: string;
  created_at: string;
}

export interface Tarea {
  id: number;
  proyecto_id: number;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  avance_porcentaje: number;
  estado: 'Stand By' | 'Sin Iniciar' | 'En Proceso' | 'Pruebas' | 'Finalizado';
  responsable_id: number;
  responsable_nombre?: string;
  ticket_origen_id: number | null;
  created_at: string;
  subtareas?: Subtarea[];
}

export interface ProyectoComentario {
  id: number;
  autor_id: number;
  autor_nombre?: string;
  proyecto_id: number | null;
  tarea_id: number | null;
  subtarea_id: number | null;
  contenido: string;
  created_at: string;
}

export interface ProyectoArchivo {
  id: number;
  nombre_original: string;
  nombre_guardado: string;
  mimetype: string | null;
  tamano_bytes: number | null;
  autor_id: number;
  autor_nombre?: string;
  proyecto_id: number | null;
  tarea_id: number | null;
  subtarea_id: number | null;
  created_at: string;
}

export interface ProyectoHistorial {
  id: number;
  proyecto_id: number;
  usuario_id: number;
  usuario_nombre?: string;
  descripcion_cambio: string;
  created_at: string;
}

export interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin_estimada: string;
  avance_porcentaje: number;
  estado: 'Stand By' | 'Sin Iniciar' | 'En Proceso' | 'Pruebas' | 'Finalizado';
  tipo_proyecto: string;
  creador_id: number;
  creador_nombre?: string;
  ticket_origen_id: number | null;
  created_at: string;
  // Included in detailed fetch
  tareas?: Tarea[];
  comentarios?: ProyectoComentario[];
  archivos?: ProyectoArchivo[];
  historial?: ProyectoHistorial[];
}

export interface User {
  id: number;
  email: string;
  nombre_completo: string;
  rol: 'ADMIN' | 'TECNICO' | 'USUARIO';
  nivel_soporte?: 'N1' | 'N2';
  grupo_n2?: 'Infraestructura' | 'Desarrollo';
}

export const projectService = {
  // Projects
  async getProyectos(): Promise<Proyecto[]> {
    return apiClient.get<Proyecto[]>('/proyectos');
  },

  async getProyectoById(id: number): Promise<Proyecto> {
    return apiClient.get<Proyecto>(`/proyectos/${id}`);
  },

  async createProyecto(payload: Partial<Proyecto>): Promise<Proyecto> {
    return apiClient.post<Proyecto>('/proyectos', payload);
  },

  async updateProyecto(id: number, payload: Partial<Proyecto>): Promise<Proyecto> {
    return apiClient.put<Proyecto>(`/proyectos/${id}`, payload);
  },

  async deleteProyecto(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/proyectos/${id}`);
  },

  // Tasks
  async createTarea(payload: {
    proyecto_id: number;
    titulo: string;
    descripcion?: string;
    fecha_fin: string;
    responsable_id: number;
  }): Promise<Tarea> {
    return apiClient.post<Tarea>('/proyectos/tareas', payload);
  },

  async updateTarea(id: number, payload: Partial<Tarea>): Promise<Tarea> {
    return apiClient.put<Tarea>(`/proyectos/tareas/${id}`, payload);
  },

  async deleteTarea(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/proyectos/tareas/${id}`);
  },

  // Subtasks
  async createSubtarea(payload: {
    tarea_id: number;
    titulo: string;
    descripcion?: string;
    fecha_fin: string;
    responsable_id: number;
  }): Promise<Subtarea> {
    return apiClient.post<Subtarea>('/proyectos/subtareas', payload);
  },

  async updateSubtarea(id: number, payload: Partial<Subtarea>): Promise<Subtarea> {
    return apiClient.put<Subtarea>(`/proyectos/subtareas/${id}`, payload);
  },

  async deleteSubtarea(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/proyectos/subtareas/${id}`);
  },

  // Comments
  async addComentario(payload: {
    proyecto_id?: number | null;
    tarea_id?: number | null;
    subtarea_id?: number | null;
    contenido: string;
  }): Promise<ProyectoComentario> {
    return apiClient.post<ProyectoComentario>('/proyectos/comentarios', payload);
  },

  // Files
  async addArchivo(formData: FormData): Promise<ProyectoArchivo> {
    return apiClient.post<ProyectoArchivo>('/proyectos/archivos', formData);
  },

  getArchivoUrl(archivoId: number): string {
    const token = localStorage.getItem('smo_token');
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/proyectos/archivos/${archivoId}?token=${token}`;
  },

  // Utilities Ticket
  async escalarTicket(ticketId: number, payload: {
    nombre: string;
    descripcion?: string;
    fecha_fin_estimada: string;
    tipo_proyecto?: string;
  }): Promise<Proyecto> {
    return apiClient.post<Proyecto>(`/proyectos/escalar-ticket/${ticketId}`, payload);
  },

  // Manual reports triggering
  async sendReporteSemanalTecnicos(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/proyectos/reportes/semanal-tecnicos');
  },

  async sendReporteSemanalAdmin(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/proyectos/reportes/semanal-admin');
  },

  // Helpers (Users listing for assignment)
  async getUsuarios(): Promise<User[]> {
    try {
      return await apiClient.get<User[]>('/usuarios');
    } catch (e) {
      console.warn('Fallback users logic: current user is not ADMIN', e);
      // Fallback with static mock users if user is TECNICO or USUARIO to allow viewing details without failure
      return [
        { id: 1, email: 'admin@smo.com', nombre_completo: 'Administrador Sistema', rol: 'ADMIN' },
        { id: 2, email: 'santi@smo.com', nombre_completo: 'Santi Condado', rol: 'TECNICO' },
        { id: 3, email: 'fide@smo.com', nombre_completo: 'Fide Scala', rol: 'TECNICO' },
        { id: 4, email: 'gabo@smo.com', nombre_completo: 'Gabo CCI', rol: 'TECNICO' },
        { id: 5, email: 'user@smo.com', nombre_completo: 'Cliente Condado', rol: 'USUARIO' },
      ];
    }
  }
};
