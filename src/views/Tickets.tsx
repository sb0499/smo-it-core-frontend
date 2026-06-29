import { showAlert, showConfirm } from '../utils/alerts';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketService, Ticket, CreateTicketPayload } from '../services/ticket.service';
import { projectService, User } from '../services/project.service';
import { apiClient } from '../services/api';
import './Tickets.css';

export const Tickets: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // New ticket state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState('Sistemas');
  const [newPrioridad, setNewPrioridad] = useState<'Baja' | 'Media' | 'Alta' | 'Critica'>('Media');
  const [newEmpresaId, setNewEmpresaId] = useState<number>(0);
  const [newPersonaSol, setNewPersonaSol] = useState('');
  const [newAreaSol, setNewAreaSol] = useState('');

  // Ticket edit state
  const [editEstado, setEditEstado] = useState<string>('');
  const [editObs, setEditObs] = useState<string>('');
  const [editTechId, setEditTechId] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCierrePanel, setShowCierrePanel] = useState(false);
  const [cierreObs, setCierreObs] = useState('');

  const [empresas, setEmpresas] = useState<{ id: number; nombre: string }[]>([]);
  const [categoriesList, setCategoriesList] = useState<{ id: number; nombre: string }[]>([]);

  const fetchTicketsData = async () => {
    try {
      setLoading(true);
      const list = await ticketService.getTickets();
      setTickets(list);

      // Load companies
      const companiesList = await apiClient.get<{ id: number; nombre: string }[]>('/empresas');
      setEmpresas(companiesList);
      if (companiesList.length > 0 && newEmpresaId === 0) {
        setNewEmpresaId(companiesList[0].id);
      }

      // Load categories
      const cats = await ticketService.getCategorias().catch(() => []);
      setCategoriesList(cats);
      if (cats.length > 0) {
        setNewCat(cats[0].nombre);
      }

      // Load techs for assignment
      const usersList = await projectService.getUsuarios();
      const techs = usersList.filter(u => u.rol === 'TECNICO' || u.rol === 'ADMIN');
      setTechnicians(techs);
    } catch (e) {
      console.error('Error fetching support tickets', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketsData();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) {
      showAlert('Por favor completa el título y descripción.');
      return;
    }

    try {
      const payload: CreateTicketPayload = {
        titulo: newTitle,
        descripcion: newDesc,
        categoria: newCat,
        prioridad: newPrioridad,
        empresa_id: newEmpresaId,
        persona_solicitante: newPersonaSol || undefined,
        area_solicitante: newAreaSol || undefined,
        medio_solicitud: 'Plataforma',
      };

      await ticketService.createTicket(payload);
      setShowCreateModal(false);
      
      // Reset
      setNewTitle('');
      setNewDesc('');
      setNewPersonaSol('');
      setNewAreaSol('');
      
      fetchTicketsData();
    } catch (err: any) {
      showAlert('Error al crear el ticket: ' + err.message);
    }
  };

  const handleOpenEditModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setEditEstado(ticket.estado);
    setEditObs(ticket.observaciones || '');
    setEditTechId(ticket.tecnico_id || 0);
    setShowCierrePanel(false);
    setCierreObs('');
  };

  const handleCerrarTicketConfirmado = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (!cierreObs.trim()) {
      showAlert('Por favor ingresa las observaciones finales de la solución.');
      return;
    }

    try {
      setIsUpdating(true);
      await ticketService.updateTicket(selectedTicket.id, {
        estado: 'Finalizada',
        observaciones: cierreObs,
        tecnico_id: editTechId > 0 ? editTechId : user?.id,
      });

      setSelectedTicket(null);
      fetchTicketsData();
      showAlert('Ticket cerrado y finalizado exitosamente.');
    } catch (err: any) {
      showAlert('Error al finalizar el ticket: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setIsUpdating(true);
      await ticketService.updateTicket(selectedTicket.id, {
        estado: editEstado as any,
        observaciones: editObs || null,
        tecnico_id: editTechId > 0 ? editTechId : null,
      });

      setSelectedTicket(null);
      fetchTicketsData();
    } catch (err: any) {
      showAlert('Error al actualizar el ticket: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadReport = () => {
    const url = ticketService.getReporteUrl();
    window.open(url, '_blank');
  };

  const handleTriggerCierreDiario = async () => {
    if (!await showConfirm('¿Deseas enviar alertas de cierre diario a todos los técnicos con tickets pendientes?')) return;
    try {
      const res = await ticketService.triggerCierreDiario() as any;
      showAlert(`Éxito: ${res.message || 'Recordatorios enviados'}\n\nTécnicos alertados: ${res.totalTecnicosAlertados}\nTickets pendientes reportados: ${res.totalTicketsRemitidos}`);
    } catch (err: any) {
      showAlert('Error enviando recordatorios: ' + err.message);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchEstado = filterEstado === 'todos' || t.estado === filterEstado;
    const matchSearch = t.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.categoria.toLowerCase().includes(searchQuery.toLowerCase());
    return matchEstado && matchSearch;
  });

  return (
    <div className="tickets-container animate-fade">
      {/* Upper controls bar */}
      <div className="tickets-controls glass-panel">
        <div className="controls-left">
          <input
            type="text"
            className="form-control search-input"
            placeholder="Buscar por título, categoría, descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select 
            className="form-control filter-select"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            <option value="todos">Todos los Estados</option>
            <option value="Nuevo">Nuevo</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Pruebas">Pruebas</option>
            <option value="Finalizada">Finalizada</option>
            <option value="Escalado a Proyecto">Escalado a Proyecto</option>
          </select>
        </div>
 
        <div className="controls-right-buttons">
          {user?.rol === 'ADMIN' && (
            <>
              <button 
                className="btn btn-secondary" 
                style={{ border: '1px solid var(--color-critical)', color: 'var(--color-critical)' }} 
                onClick={handleTriggerCierreDiario}
              >
                Alertas Cierre Diario
              </button>
              <button className="btn btn-secondary excel-btn" onClick={handleDownloadReport}>
                Reporte Semanal Excel
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Reportar Soporte / Ticket
          </button>
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="dashboard-loading">
          <div className="loader"></div>
          <p className="text-muted">Leyendo base de datos de soporte...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="empty-panel glass-panel text-center py-5">
          <span className="empty-big-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-dim)' }}><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"></path><line x1="13" y1="5" x2="13" y2="19"></line></svg>
          </span>
          <h3>No se encontraron tickets</h3>
          <p className="text-muted">Ajusta tus filtros o crea un nuevo reporte para empezar.</p>
        </div>
      ) : (
        <div className="tickets-grid">
          {filteredTickets.map((ticket) => (
            <div 
              key={ticket.id} 
              className="ticket-card glass-panel glass-panel-interactive animate-slide-up"
              onClick={() => handleOpenEditModal(ticket)}
            >
              <div className="ticket-card-header">
                <span className={`badge badge-priority-${ticket.prioridad.toLowerCase()}`}>
                  {ticket.prioridad}
                </span>
                <span className={`badge badge-${ticket.estado.toLowerCase().replace(' ', '')}`}>
                  {ticket.estado}
                </span>
              </div>

              <div className="ticket-card-body">
                <h3 className="ticket-title">{ticket.titulo}</h3>
                <p className="ticket-desc text-muted">{ticket.descripcion.substring(0, 110)}{ticket.descripcion.length > 110 ? '...' : ''}</p>
                
                <div className="ticket-meta mt-3">
                  <div className="meta-tag">{ticket.categoria}</div>
                  <div className="meta-tag">{ticket.empresa_nombre || 'CONDADO'}</div>
                </div>
              </div>

              <div className="ticket-card-footer">
                <div className="assignee-info">
                  <span className="assignee-avatar" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '50%', width: '32px', height: '32px' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </span>
                  <div className="assignee-text">
                    <span className="assignee-label">Técnico Asignado:</span>
                    <span className="assignee-name">{ticket.tecnico_nombre || 'Asignación automática...'}</span>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="modal-overlay animate-fade">
          <div className="modal-container glass-panel animate-slide-up">
            <div className="modal-header">
              <h2>Reportar Nuevo Soporte Técnico</h2>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="modal-form">
              <div className="form-group">
                <label className="form-label">TÍTULO DEL SOPORTE / DAÑO</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Impresora no enciende o correo bloqueado"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">CATEGORÍA</label>
                  <select className="form-control" value={newCat} onChange={(e) => setNewCat(e.target.value)}>
                    {categoriesList.map(c => (
                      <option key={c.id} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group half">
                  <label className="form-label">PRIORIDAD</label>
                  <select 
                    className="form-control" 
                    value={newPrioridad} 
                    onChange={(e) => setNewPrioridad(e.target.value as any)}
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                    <option value="Critica">Crítica</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">SEDE / EMPRESA</label>
                  <select 
                    className="form-control" 
                    value={newEmpresaId} 
                    onChange={(e) => setNewEmpresaId(Number(e.target.value))}
                  >
                    {empresas.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group half">
                  <label className="form-label">ÁREA SOLICITANTE</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Contabilidad, Caja 3, etc."
                    value={newAreaSol}
                    onChange={(e) => setNewAreaSol(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">NOMBRE DEL EMPLEADO AFECTADO (SOLICITANTE)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: María Augusta Zambrano"
                  value={newPersonaSol}
                  onChange={(e) => setNewPersonaSol(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">DESCRIPCIÓN DE LA FALLA O SOLICITUD</label>
                <textarea
                  className="form-control textarea-field"
                  placeholder="Describe con el mayor detalle posible el inconveniente..."
                  rows={4}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Soporte</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL & EDIT MODAL */}
      {selectedTicket && (
        <div className="modal-overlay animate-fade">
          <div className="modal-container glass-panel animate-slide-up">
            <div className="modal-header">
              <h2>Detalle del Soporte #{selectedTicket.id}</h2>
              <button className="modal-close-btn" onClick={() => setSelectedTicket(null)}>×</button>
            </div>

            <form onSubmit={handleUpdateTicket} className="modal-form">
              <div className="ticket-detail-summary">
                <h3>{selectedTicket.titulo}</h3>
                <p className="ticket-detail-desc">{selectedTicket.descripcion}</p>
                <div className="ticket-detail-meta text-muted">
                  <span>Sede: <strong>{selectedTicket.empresa_nombre || 'CONDADO'}</strong></span>
                  <span>Categoría: <strong>{selectedTicket.categoria}</strong></span>
                  <span>Prioridad: <strong>{selectedTicket.prioridad}</strong></span>
                  <span>Fecha: {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Editable Fields for Admin / Technical Staff */}
              {user?.rol === 'ADMIN' || user?.rol === 'TECNICO' ? (
                <div className="admin-editable-section">
                  <h4 className="section-title gradient-text mt-3 mb-2">Administrar Operación TI</h4>

                  {selectedTicket.estado !== 'Finalizada' && (
                    <div className="cierre-rapido-container mb-3" style={{ border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.04)', padding: '16px', borderRadius: '12px' }}>
                      {!showCierrePanel ? (
                        <button
                          type="button"
                          className="btn btn-success"
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#10b981', border: 'none', color: 'white', fontWeight: '600', padding: '10px' }}
                          onClick={() => setShowCierrePanel(true)}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          Finalizar / Cerrar Ticket con Solución
                        </button>
                      ) : (
                        <div className="cierre-rapido-panel animate-fade">
                          <label className="form-label" style={{ color: '#047857', fontWeight: '600', marginBottom: '8px', display: 'block' }}>OBSERVACIONES DE LA SOLUCIÓN (OBLIGATORIO)</label>
                          <textarea
                            className="form-control textarea-field"
                            placeholder="Escribe la solución detallada aplicada para poder cerrar el ticket..."
                            rows={3}
                            value={cierreObs}
                            onChange={(e) => setCierreObs(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginBottom: '12px' }}
                          />
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              type="button"
                              className="btn btn-success"
                              onClick={handleCerrarTicketConfirmado}
                              disabled={isUpdating}
                              style={{ flex: 1, background: '#10b981', border: 'none', color: 'white', fontWeight: '600', padding: '8px' }}
                            >
                              {isUpdating ? 'Cerrando...' : 'Confirmar Cierre (Finalizado)'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => { setShowCierrePanel(false); setCierreObs(''); }}
                              style={{ flex: 0.5, padding: '8px' }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">ESTADO DEL SOPORTE</label>
                      <select 
                        className="form-control" 
                        value={editEstado} 
                        onChange={(e) => setEditEstado(e.target.value)}
                      >
                        <option value="Nuevo">Nuevo</option>
                        <option value="En Proceso">En Proceso</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Pruebas">Pruebas</option>
                        <option value="Finalizada">Finalizada</option>
                        <option value="Escalado a Proyecto">Escalado a Proyecto</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group half">
                      <label className="form-label">TÉCNICO TI ASIGNADO</label>
                      {user.rol === 'ADMIN' ? (
                        <select 
                          className="form-control" 
                          value={editTechId} 
                          onChange={(e) => setEditTechId(Number(e.target.value))}
                        >
                          <option value="0">Seleccionar Técnico...</option>
                          {technicians.map(t => (
                            <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="static-field-value" style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                          {technicians.find(t => t.id === editTechId)?.nombre_completo || 'Sin técnico asignado'}
                        </div>
                      )}
                    </div>

                    <div className="form-group half">
                      <label className="form-label">ÁREA / SOLICITANTE</label>
                      <div className="static-field-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        {selectedTicket.persona_solicitante || 'Sin especificar'} ({selectedTicket.area_solicitante || 'General'})
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">OBSERVACIONES / BITÁCORA TÉCNICA</label>
                    <textarea
                      className="form-control textarea-field"
                      placeholder="Agrega notas sobre la solución aplicada o la bitácora de soporte..."
                      rows={3}
                      value={editObs}
                      onChange={(e) => setEditObs(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="user-view-only-section">
                  <h4 className="section-title mt-3">Estado de la Solución</h4>
                  <div className="static-progress-details mt-2">
                    <span>Técnico Responsable: <strong>{selectedTicket.tecnico_nombre || 'Asignación automática programada'}</strong></span>
                  </div>
                  {selectedTicket.observaciones && (
                    <div className="observations-box mt-3">
                      <strong>Bitácora de Solución:</strong>
                      <p>{selectedTicket.observaciones}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedTicket(null)}>Cerrar</button>
                {(user?.rol === 'ADMIN' || user?.rol === 'TECNICO') && (
                  <button type="submit" className="btn btn-primary" disabled={isUpdating}>
                    {isUpdating ? 'Guardando...' : 'Actualizar Estado'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
