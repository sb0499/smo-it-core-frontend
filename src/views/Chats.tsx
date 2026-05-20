import { showAlert, showConfirm } from '../utils/alerts';
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
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manage members modal
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [channelMembers, setChannelMembers] = useState<ChatCanalMiembro[]>([]);

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
    setActiveCanal(canal);
    try {
      const chatHistory = await chatService.getCanalMensajes(canal.id);
      setMensajes(chatHistory);
      if (canal.is_private) {
        const members = await chatService.getCanalMiembros(canal.id);
        setChannelMembers(members);
      }
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
      showAlert('Error enviando mensaje: ' + err.message);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName) return;

    try {
      setIsSubmitting(true);
      const created = await chatService.createCanal(newChanName, newChanPrivate);
      
      if (newChanPrivate && selectedUsers.length > 0) {
        for (const uid of selectedUsers) {
          await chatService.unirMiembro(created.id, uid);
        }
      }
      
      setShowCreateModal(false);
      setNewChanName('');
      setNewChanPrivate(false);
      setSelectedUsers([]);

      // Re-fetch and select new
      const list = await chatService.getCanales();
      setCanales(list);
      handleSelectCanal(created);
    } catch (err: any) {
      showAlert('Error creando canal: ' + err.message);
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

  const handleToggleMember = async (userId: number, isMember: boolean) => {
    if (!activeCanal) return;
    try {
      if (isMember) {
        await chatService.removerMiembro(activeCanal.id, userId);
      } else {
        await chatService.unirMiembro(activeCanal.id, userId);
      }
      const updated = await chatService.getCanalMiembros(activeCanal.id);
      setChannelMembers(updated);
    } catch (e: any) {
      showAlert('Error modificando miembro: ' + e.message);
    }
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
                  <span className="active-channel-name">
                    💬 {activeCanal.is_private ? '🔒' : '#'} {activeCanal.nombre}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {activeCanal.is_private && (user?.rol === 'ADMIN' || activeCanal.creador_id === user?.id) && (
                      <button className="refresh-chat-btn" onClick={() => setShowMembersModal(true)} title="Gestionar Miembros">
                        👥
                      </button>
                    )}
                    <button className="refresh-chat-btn" onClick={() => handleSelectCanal(activeCanal)} title="Recargar Chat">
                      🔄
                    </button>
                  </div>
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
                    onChange={(e) => {
                      setNewChanPrivate(e.target.checked);
                      if (!e.target.checked) setSelectedUsers([]);
                    }}
                  />
                  <span className="checkbox-wrap-text font-sm ml-2">Canal Privado (Solo invitados)</span>
                </label>
              </div>

              {newChanPrivate && (
                <div className="form-group mt-3">
                  <label className="form-label">SELECCIONAR MIEMBROS (Además de ti)</label>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e5e7eb', padding: '10px', borderRadius: '8px' }}>
                    {users.filter(u => u.id !== user?.id).map(u => (
                      <label key={u.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', fontSize: '13px' }}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedUsers([...selectedUsers, u.id]);
                            else setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                          }}
                          style={{ marginRight: '8px' }}
                        />
                        {u.nombre_completo} ({u.rol})
                      </label>
                    ))}
                  </div>
                </div>
              )}

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
      {/* MANAGE MEMBERS MODAL */}
      {showMembersModal && activeCanal && (
        <div className="modal-overlay animate-fade">
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Miembros de {activeCanal.nombre}</h2>
              <button className="modal-close-btn" onClick={() => setShowMembersModal(false)}>×</button>
            </div>
            
            <div className="form-group mt-3">
              <label className="form-label">MIEMBROS DEL CANAL</label>
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', padding: '10px', borderRadius: '8px' }}>
                {users.map(u => {
                  const isMember = channelMembers.some(m => m.usuario_id === u.id);
                  const isCreator = activeCanal.creador_id === u.id;
                  
                  return (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', padding: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                        {u.nombre_completo} ({u.rol}) {isCreator && '👑'}
                      </div>
                      {!isCreator && (
                        <button 
                          className={`btn ${isMember ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ padding: '2px 8px', fontSize: '11px' }}
                          onClick={() => handleToggleMember(u.id, isMember)}
                        >
                          {isMember ? 'Quitar' : 'Agregar'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-actions mt-3">
              <button type="button" className="btn btn-primary" onClick={() => setShowMembersModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
