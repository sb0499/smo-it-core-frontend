import { apiClient } from './api';

export interface Activo {
  id: number;
  codigo: string;
  serial: string;
  marca: string;
  modelo: string;
  especificaciones: string | null;
  estado: 'Stock' | 'Asignado' | 'Mantenimiento' | 'Baja' | 'Reciclaje';
  persona_id: number | null;
  persona_nombre?: string;
  proveedor_id: number | null;
  proveedor_nombre?: string;
  tipo_equipo_id?: number | null;
  tipo_equipo_nombre?: string;
  empresa_id?: number | null;
  empresa_nombre?: string;
  bodega_id?: number | null;
  bodega_nombre?: string;
  fecha_compra: string | null;
  created_at: string;
}

export interface Bodega {
  id: number;
  nombre: string;
  empresa_id: number;
  empresa_nombre?: string;
  descripcion: string | null;
  created_at?: string;
}

export interface Consumible {
  id: number;
  nombre: string;
  descripcion: string | null;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo: number;
}

export interface Persona {
  id: number;
  cedula: string;
  nombre: string;
  telefono: string | null;
  departamento: string | null;
  cargo: string | null;
  empresa_id: number;
  empresa_nombre?: string;
}

export interface Proveedor {
  id: number;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
}

export interface MovimientoInventario {
  id: number;
  activo_id: number;
  desde_persona_nombre?: string | null;
  hacia_persona_nombre?: string | null;
  usuario_nombre: string;
  tipo: string;
  fecha: string;
  observaciones: string | null;
}

export interface HistorialCambio {
  id: number;
  activo_id: number;
  usuario_id: number;
  usuario_nombre: string;
  fecha: string;
  cambios: string;
}

export const inventoryService = {
  // Activos (Hardware)
  async getActivos(page = 1, limit = 10, search = '', estado = ''): Promise<{ total: number; page: number; limit: number; data: Activo[] }> {
    return apiClient.get('/inventarios', {
      params: { page, limit, search, estado }
    });
  },

  async createActivo(payload: Partial<Activo>): Promise<Activo> {
    return apiClient.post<Activo>('/inventarios', payload);
  },

  async asignarActivo(activoId: number, personaId: number, observaciones: string): Promise<Activo> {
    return apiClient.post<Activo>(`/inventarios/${activoId}/asignar/${personaId}`, { observaciones });
  },

  async devolverActivo(activoId: number, observaciones: string): Promise<Activo> {
    return apiClient.post<Activo>(`/inventarios/${activoId}/devolver?observaciones=${encodeURIComponent(observaciones)}`);
  },

  async cambiarEstado(activoId: number, nuevoEstado: 'Stock' | 'Asignado' | 'Mantenimiento' | 'Baja'): Promise<Activo> {
    return apiClient.patch<Activo>(`/inventarios/${activoId}/estado`, { nuevo_estado: nuevoEstado });
  },

  async updateActivo(activoId: number, payload: Partial<Activo>): Promise<Activo> {
    return apiClient.put<Activo>(`/inventarios/${activoId}`, payload);
  },

  async getHistorial(activoId: number): Promise<MovimientoInventario[]> {
    return apiClient.get<MovimientoInventario[]>(`/inventarios/${activoId}/historial`);
  },

  async getHistorialCambios(activoId: number): Promise<HistorialCambio[]> {
    return apiClient.get<HistorialCambio[]>(`/inventarios/${activoId}/historial-cambios`);
  },

  // Consumibles
  async getConsumibles(page = 1, limit = 10, search = ''): Promise<{ total: number; page: number; limit: number; data: Consumible[] }> {
    return apiClient.get('/consumibles', {
      params: { page, limit, search }
    });
  },

  async createConsumible(payload: Partial<Consumible>): Promise<Consumible> {
    return apiClient.post<Consumible>('/consumibles', payload);
  },

  async updateConsumibleStock(consumibleId: number, cantidad: number): Promise<Consumible> {
    return apiClient.patch<Consumible>(`/consumibles/${consumibleId}/stock?cantidad=${cantidad}`);
  },

  // Personas
  async getPersonas(): Promise<Persona[]> {
    return apiClient.get<Persona[]>('/personas');
  },

  async createPersona(payload: Partial<Persona>): Promise<Persona> {
    return apiClient.post<Persona>('/personas', payload);
  },

  // Proveedores
  async getProveedores(): Promise<Proveedor[]> {
    return apiClient.get<Proveedor[]>('/proveedores');
  },

  // Actas PDF
  getActaUrl(movimientoId: number): string {
    const token = localStorage.getItem('smo_token');
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/inventarios/movimientos/${movimientoId}/acta?token=${token}`;
  },

  // Tipo Equipos CRUD
  async getTipoEquipos(): Promise<{ id: number; nombre: string; created_at: string }[]> {
    return apiClient.get('/tipo-equipos');
  },
  async createTipoEquipo(payload: { nombre: string }): Promise<{ id: number; nombre: string }> {
    return apiClient.post('/tipo-equipos', payload);
  },
  async updateTipoEquipo(id: number, payload: { nombre: string }): Promise<{ id: number; nombre: string }> {
    return apiClient.put(`/tipo-equipos/${id}`, payload);
  },
  async deleteTipoEquipo(id: number): Promise<any> {
    return apiClient.delete(`/tipo-equipos/${id}`);
  },

  // Auto-generate code preview
  async getAutogeneratedCode(empresaId: number, tipoEquipoId: number): Promise<{ codigo: string }> {
    return apiClient.get(`/inventarios/autogenerar-codigo?empresa_id=${empresaId}&tipo_equipo_id=${tipoEquipoId}`);
  },

  // Importar y Exportar Excel
  async getTipoInventarios(): Promise<{ id: number; nombre: string; descripcion: string | null }[]> {
    return apiClient.get('/inventarios/tipos-excel');
  },

  async importarInventario(file: File, tipoInventarioId: number, bodegaNombre?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo_inventario_id', String(tipoInventarioId));
    if (bodegaNombre) {
      formData.append('bodega_nombre', bodegaNombre);
    }
    return apiClient.post('/inventarios/importar', formData);
  },

  exportarInventarioUrl(): string {
    const token = localStorage.getItem('smo_token');
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/inventarios/exportar?token=${token}`;
  },

  // Bodegas CRUD
  async getBodegas(): Promise<Bodega[]> {
    return apiClient.get<Bodega[]>('/bodegas');
  },
  async createBodega(payload: Partial<Bodega>): Promise<Bodega> {
    return apiClient.post<Bodega>('/bodegas', payload);
  },
  async updateBodega(id: number, payload: Partial<Bodega>): Promise<Bodega> {
    return apiClient.put<Bodega>(`/bodegas/${id}`, payload);
  },
  async deleteBodega(id: number): Promise<any> {
    return apiClient.delete(`/bodegas/${id}`);
  }
};
