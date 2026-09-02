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

export interface IngresoBodegaItem {
  tipo_equipo_id: number;
  marca: string;
  modelo: string;
  serial?: string;
  especificaciones?: string;
  bodega_id?: number;
}

export interface IngresoBodega {
  id: number;
  codigo_ingreso: string;
  empresa_id: number;
  empresa_nombre?: string;
  proveedor_id?: number | null;
  proveedor_nombre?: string;
  nro_orden_compra: string;
  nro_factura?: string | null;
  nro_solicitud_pago?: string | null;
  fecha_compra: string;
  fecha_ingreso: string;
  descripcion: string;
  realizado_por_id?: number | null;
  realizado_por_nombre?: string;
  revisado_por?: string;
  revisado_por_cargo?: string;
  cantidad_activos?: number;
  activos?: Activo[];
  created_at: string;
}

export interface EgresoBodega {
  id: number;
  codigo_egreso: string;
  empresa_id: number;
  empresa_nombre?: string;
  custodio_id: number;
  custodio_nombre?: string;
  custodio_cargo?: string;
  area?: string | null;
  observaciones?: string | null;
  fecha_egreso: string;
  realizado_por_id?: number | null;
  realizado_por_nombre?: string;
  revisado_por?: string;
  revisado_por_cargo?: string;
  cantidad_activos?: number;
  activos?: Activo[];
  created_at: string;
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
  async getConsumibles(page = 1, limit = 10, search = '', criticalOnly = false): Promise<{ total: number; page: number; limit: number; data: Consumible[] }> {
    return apiClient.get('/consumibles', {
      params: { page, limit, search, criticalOnly }
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

  async getEmpresas(): Promise<any[]> {
    return apiClient.get<any[]>('/empresas');
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

  // Ingresos de Bodega (Actas de Ingreso)
  async getIngresosBodega(page = 1, limit = 10, search = '', fechaDesde = '', fechaHasta = '', empresaId = 0): Promise<{ total: number; page: number; limit: number; data: IngresoBodega[] }> {
    const params: any = { page, limit, search };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    if (empresaId > 0) params.empresa_id = empresaId;
    return apiClient.get('/inventarios/ingresos', { params });
  },

  async getIngresoBodegaById(id: number): Promise<IngresoBodega> {
    return apiClient.get<IngresoBodega>(`/inventarios/ingresos/${id}`);
  },

  async createIngresoBodega(payload: {
    empresa_id: number;
    proveedor_id?: number;
    nro_orden_compra: string;
    nro_factura?: string;
    nro_solicitud_pago?: string;
    fecha_compra: string;
    fecha_ingreso: string;
    descripcion: string;
    revisado_por?: string;
    revisado_por_cargo?: string;
    activos: IngresoBodegaItem[];
  }): Promise<IngresoBodega> {
    return apiClient.post<IngresoBodega>('/inventarios/ingresos', payload);
  },

  getActaIngresoUrl(ingresoId: number): string {
    const token = localStorage.getItem('smo_token');
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/inventarios/ingresos/${ingresoId}/acta?token=${token}`;
  },

  // Egresos de Bodega (Actas de Egreso / Asignación Multi-Activo)
  async getEgresosBodega(page = 1, limit = 10, search = '', fechaDesde = '', fechaHasta = '', empresaId = 0): Promise<{ total: number; page: number; limit: number; data: EgresoBodega[] }> {
    const params: any = { page, limit, search };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    if (empresaId > 0) params.empresa_id = empresaId;
    return apiClient.get('/inventarios/egresos', { params });
  },

  async getEgresoBodegaById(id: number): Promise<EgresoBodega> {
    return apiClient.get<EgresoBodega>(`/inventarios/egresos/${id}`);
  },

  async createEgresoBodega(payload: {
    empresa_id: number;
    custodio_id: number;
    area?: string;
    observaciones?: string;
    revisado_por?: string;
    revisado_por_cargo?: string;
    activo_ids: number[];
  }): Promise<EgresoBodega> {
    return apiClient.post<EgresoBodega>('/inventarios/egresos', payload);
  },

  getActaEgresoUrl(egresoId: number): string {
    const token = localStorage.getItem('smo_token');
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/inventarios/egresos/${egresoId}/acta?token=${token}`;
  },

  getActaEntregaEgresoUrl(egresoId: number): string {
    const token = localStorage.getItem('smo_token');
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/inventarios/egresos/${egresoId}/acta-entrega?token=${token}`;
  },

  // Recepciones de Bodega (Actas de Recepción)
  async getRecepcionesBodega(page = 1, limit = 10, search = '', fechaDesde = '', fechaHasta = '', empresaId = 0): Promise<{ total: number; page: number; limit: number; data: any[] }> {
    const params: any = { page, limit, search };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    if (empresaId > 0) params.empresa_id = empresaId;
    return apiClient.get('/inventarios/recepciones', { params });
  },

  async getRecepcionBodegaById(id: number): Promise<any> {
    return apiClient.get<any>(`/inventarios/recepciones/${id}`);
  },

  async createRecepcionBodega(payload: {
    empresa_id: number;
    persona_entrega_id: number;
    area?: string;
    bodega_id?: number;
    observaciones?: string;
    revisado_por?: string;
    revisado_por_cargo?: string;
    activo_ids: number[];
  }): Promise<any> {
    return apiClient.post<any>('/inventarios/recepciones', payload);
  },

  getActaRecepcionUrl(recepcionId: number): string {
    const token = localStorage.getItem('smo_token');
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/inventarios/recepciones/${recepcionId}/acta?token=${token}`;
  },

  getActaIngresoDevolucionUrl(recepcionId: number): string {
    const token = localStorage.getItem('smo_token');
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/inventarios/recepciones/${recepcionId}/acta-ingreso?token=${token}`;
  },

  // Tipo Equipos CRUD
  async getTipoEquipos(page?: number, limit?: number, search = ''): Promise<any> {
    const params: any = {};
    if (page) params.page = page;
    if (limit) params.limit = limit;
    if (search) params.search = search;
    return apiClient.get('/tipo-equipos', { params });
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
  async getBodegas(page?: number, limit?: number, search = '', empresaId?: number): Promise<any> {
    const params: any = {};
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;
    if (search !== undefined) params.search = search;
    if (empresaId !== undefined) params.empresa_id = empresaId;
    return apiClient.get('/bodegas', { params });
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
