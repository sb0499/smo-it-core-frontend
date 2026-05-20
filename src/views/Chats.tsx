import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatService, ChatCanal, ChatMensaje, ChatCanalMiembro } from '../services/chat.service';
import { projectService, User } from '../services/project.service';
import './Chats.css';

export const Chats: React.FC = () => {
  const { user } = useAuth();
  const [canales, setCanales] = useState<ChatCanal[]>([]);
  const [activeCanal, setActiveCanal] = useState<ChatCanal | null>(null);
  const [mensajes, setMensajes] = useState<ChatMensaje[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New message / New channel forms
  const [newMsg, setNewMsg] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChanName, setNewChanName] = useState('');
  const [newChanPrivate, setNewChanPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const list = await chatService.getCanales();
      setCanales(list);

      const allUsers = await projectService.getUsuarios();
      setUsers(allUsers);

      // Select first channel by default if none selected
      if (list.length > 0 && !activeCanal) {
        handleSelectCanal(list[0]);
      }
    } catch (e) {
      console.error('Error fetching chats', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCanal = async (canal: ChatCanal) => {
    setActiveCanal(canal);
    try {
      const chatHistory = await chatService.getCanalMensajes(canal.id);
      setMensajes(chatHistory);
    } catch (e) {
      setMensajes([]);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // Dynamic message fetch loop
  useEffect(() => {
    if (!activeCanal) return;
    
    // Set up rapid message fetch timer
    const interval = setInterval(async () => {
      try {
        const chatHistory = await chatService.getCanalMensajes(activeCanal.id);
        // Only update state if message lengths or latest timestamps changed to reduce UI repaint
        if (chatHistory.length !== mensajes.length) {
          setMensajes(chatHistory);
        }
      } catch (e) {
        // ignore
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeCanal, mensajes]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg || !activeCanal) return;

    try {
      const sent = await chatService.addMensaje(activeCanal.id, newMsg);
      setMensajes(prev => [...prev, {
        ...sent,
        usuario_nombre: user?.nombre || 'Tú',
        usuario_rol: user?.rol
      }]);
      setNewMsg('');
    } catch (err: any) {
      alert('Error enviando mensaje: ' + err.message);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName) return;

    try {
      setIsSubmitting(true);
      const created = await chatService.createCanal(newChanName, newChanPrivate);
      
      setShowCreateModal(false);
      setNewChanName('');
      setNewChanPrivate(false);

      // Re-fetch and select new
      const list = await chatService.getCanales();
      setCanales(list);
      handleSelectCanal(created);
    } catch (err: any) {
      alert('Error creando canal: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return '';
    if (role === 'ADMIN') return '👑 Admin';
    if (role === 'TECNICO') return '🔧 Técnico';
    return '👤 Sede';
  };

  return (
    <div className="chats-container animate-fade">
      {loading ? (
        <div className="dashboard-loading">
          <div className="loader"></div>
          <p className="text-muted">Conectando con servidor de chat...</p>
        </div>
      ) : (
        <div className="chat-layout glass-panel">
          {/* Left Panel: Channel list */}
          <div className="channels-sidebar">
            <div className="sidebar-chat-header">
              <h4>💬 CANALES TI</h4>
              {(user?.rol === 'ADMIN' || user?.rol === 'TECNICO') && (
                <button className="add-channel-btn" onClick={() => setShowCreateModal(true)} title="Crear Canal">
                  ＋
                </button>
              )}
            </div>

            <div className="channels-list">
              {canales.length === 0 ? (
                <p className="text-muted font-xs text-center py-3">No hay canales.</p>
              ) : (
                canales.map((c) => (
                  <button 
                    key={c.id} 
                    className={`channel-item-btn ${activeCanal?.id === c.id ? 'active' : ''}`}
                    onClick={() => handleSelectCanal(c)}
                  >
                    <span className="hash-symbol">{c.is_private ? '🔒' : '#'}</span>
                    <span className="channel-name-txt">{c.nombre}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Conversation Stream */}
          <div className="conversation-stream">
            {activeCanal ? (
              <>
                <div className="stream-header">
                  <span className="active-channel-name">💬 #{activeCanal.nombre}</span>
                  <button className="refresh-chat-btn" onClick={() => handleSelectCanal(activeCanal)} title="Recargar Chat">
                    🔄
                  </button>
                </div>

                <div className="messages-timeline-box">
                  {mensajes.length === 0 ? (
                    <div className="empty-chat text-center py-5">
                      <span className="chat-welcome-icon">💬</span>
                      <h4>¡Te damos la bienvenida a #{activeCanal.nombre}!</h4>
                      <p className="text-muted font-xs mt-1">Este es el inicio de la conversación de este canal.</p>
                    </div>
                  ) : (
                    mensajes.map((m) => (
                      <div key={m.id} className="message-bubble-row animate-slide-up">
                        <div className="msg-avatar">
                          {(m.usuario_nombre || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="msg-content-wrapper">
                          <div className="msg-meta">
                            <span className="msg-author-name">{m.usuario_nombre}</span>
                            <span className={`msg-role-lbl role-${(m.usuario_rol || 'usuario').toLowerCase()}`}>
                              {getRoleLabel(m.usuario_rol)}
                            </span>
                            <span className="msg-time text-dim">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="msg-content-text">{m.mensaje}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Send message text box */}
                <form onSubmit={handleSendMessage} className="message-composer-form">
                  <input
                    type="text"
                    className="form-control composer-input"
                    placeholder={`Enviar mensaje a #${activeCanal.nombre}...`}
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary btn-send-msg">
                    Enviar ➔
                  </button>
                </form>
              </>
            ) : (
              <div className="select-channel-placeholder">
                <span className="placeholder-big-icon">💬</span>
                <h3>Mesa de Canales SMO IT CORE</h3>
                <p className="text-muted">Selecciona un canal de la barra lateral para empezar a mensajear.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE CHANNEL MODAL */}
      {showCreateModal && (
        <div className="modal-overlay animate-fade">
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Crear Nuevo Canal de Comunicación</h2>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateChannel} className="modal-form">
              <div className="form-group">
                <label className="form-label">NOMBRE DEL CANAL</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: soporte-servidores"
                  value={newChanName}
                  onChange={(e) => setNewChanName(e.target.value.toLowerCase().replace(/ /g, '-'))}
                  required
                />
              </div>

              <div className="form-group row-align mt-2">
                <label className="checkbox-wrap-label">
                  <input
                    type="checkbox"
                    className="subtask-checkbox"
                    checked={newChanPrivate}
                    onChange={(e) => setNewChanPrivate(e.target.checked)}
                  />
                  <span className="checkbox-wrap-text font-sm ml-2">Canal Privado (Solo invitados)</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creando...' : 'Crear Canal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
