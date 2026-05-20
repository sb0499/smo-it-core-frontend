import { apiClient } from './api';

export interface Activo {
  id: number;
  codigo: string;
  serial: string;
  marca: string;
  modelo: string;
  especificaciones: string | null;
  estado: 'Stock' | 'Asignado' | 'Mantenimiento' | 'Baja';
  persona_id: number | null;
  persona_nombre?: string;
  proveedor_id: number | null;
  proveedor_nombre?: string;
  fecha_compra: string | null;
  created_at: string;
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

export const inventoryService = {
  // Activos (Hardware)
  async getActivos(): Promise<Activo[]> {
    return apiClient.get<Activo[]>('/inventarios');
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

  async getHistorial(activoId: number): Promise<MovimientoInventario[]> {
    return apiClient.get<MovimientoInventario[]>(`/inventarios/${activoId}/historial`);
  },

  // Consumibles
  async getConsumibles(): Promise<Consumible[]> {
    return apiClient.get<Consumible[]>('/consumibles');
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
    return `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/inventarios/movimientos/${movimientoId}/acta?token=${token}`;
  },

  // Devolver activo
  async devolverActivo(activoId: number, observaciones?: string): Promise<Activo> {
    return apiClient.post<Activo>(`/inventarios/${activoId}/devolver`, { observaciones });
  }
};
