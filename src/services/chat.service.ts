import { apiClient } from './api';

export interface ChatCanal {
  id: number;
  nombre: string;
  is_private: boolean;
  creador_id: number;
  created_at: string;
}

export interface ChatMensaje {
  id: number;
  canal_id: number;
  usuario_id: number;
  mensaje: string;
  created_at: string;
  usuario_nombre?: string;
  usuario_rol?: string;
}

export interface ChatCanalMiembro {
  canal_id: number;
  usuario_id: number;
  nombre_completo: string;
  email: string;
  rol: string;
}

export const chatService = {
  async getCanales(): Promise<ChatCanal[]> {
    return apiClient.get<ChatCanal[]>('/chats/canales');
  },

  async createCanal(nombre: string, isPrivate: boolean): Promise<ChatCanal> {
    return apiClient.post<ChatCanal>('/chats/canales', { nombre, is_private: isPrivate });
  },

  async getCanalMensajes(canalId: number): Promise<ChatMensaje[]> {
    return apiClient.get<ChatMensaje[]>(`/chats/canales/${canalId}/mensajes`);
  },

  async addMensaje(canalId: number, mensaje: string): Promise<ChatMensaje> {
    return apiClient.post<ChatMensaje>(`/chats/canales/${canalId}/mensajes`, { mensaje });
  },

  async getCanalMiembros(canalId: number): Promise<ChatCanalMiembro[]> {
    return apiClient.get<ChatCanalMiembro[]>(`/chats/canales/${canalId}/miembros`);
  },

  async unirMiembro(canalId: number, usuarioId: number): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/chats/canales/${canalId}/miembros/${usuarioId}`);
  },

  async removerMiembro(canalId: number, usuarioId: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/chats/canales/${canalId}/miembros/${usuarioId}`);
  }
};
