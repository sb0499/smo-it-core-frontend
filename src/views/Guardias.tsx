import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { guardService, GuardiaFeriado } from '../services/guard.service';
import { projectService, User } from '../services/project.service';
import './Guardias.css';

export const Guardias: React.FC = () => {
  const { user } = useAuth();
  const [guardias, setGuardias] = useState<GuardiaFeriado[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New guard form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFecha, setNewFecha] = useState('');
  const [newTechId, setNewTechId] = useState<number>(0);
  const [newObs, setNewObs] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Raffle State
  const [isRaffling, setIsRaffling] = useState(false);
  const [currentRaffleName, setCurrentRaffleName] = useState('');

  const fetchGuardiasData = async () => {
    try {
      setLoading(true);
      const [list, usersList] = await Promise.all([
        guardService.getGuardias().catch(() => []),
        projectService.getUsuarios().catch(() => [])
      ]);
      setGuardias(list);

      // Load technicians robustly
      setTechnicians(usersList.filter((u: any) => 
        u.rol === 'TECNICO' || u.rol === 'ADMIN' || 
        u.rol_nombre === 'TECNICO' || u.rol_nombre === 'ADMIN'
      ));
    } catch (e) {
      console.error('Error fetching guards schedule', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuardiasData();
  }, []);

  const handleRaffle = () => {
    if (technicians.length === 0) {
      alert('No hay técnicos cargados para realizar el sorteo.');
      return;
    }
    
    setIsRaffling(true);
    let counter = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * technicians.length);
      setCurrentRaffleName(technicians[randomIndex].nombre_completo);
      counter++;
      
      if (counter > 15) {
        clearInterval(interval);
        const finalIndex = Math.floor(Math.random() * technicians.length);
        const winner = technicians[finalIndex];
        setNewTechId(winner.id);
        setCurrentRaffleName(winner.nombre_completo);
        setNewObs('Sorteo automático de guardia realizado entre todos los técnicos de turno.');
        setIsRaffling(false);
      }
    }, 100);
  };

  const handleCreateGuardia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFecha || newTechId <= 0) {
      alert('Por favor selecciona una fecha y un técnico.');
      return;
    }

    try {
      setIsSubmitting(true);
      await guardService.createGuardia(newFecha, newTechId, newObs || undefined);
      
      setShowAddModal(false);
      setNewFecha('');
      setNewTechId(0);
      setNewObs('');

      fetchGuardiasData();
    } catch (err: any) {
      alert('Error registrando guardia: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGuardia = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este turno de guardia?')) return;
    try {
      await guardService.deleteGuardia(id);
      fetchGuardiasData();
    } catch (err: any) {
      alert('Error eliminando guardia: ' + err.message);
    }
  };

  return (
    <div className="guardias-container animate-fade">
      {/* Calendar Header Control Panel */}
      <div className="guardias-header glass-panel">
        <div className="header-left">
          <h3>Cronograma Anual de Guardias y Feriados TI</h3>
          <p className="text-muted">Lista cronológica de técnicos asignados a soporte de emergencias en días festivos.</p>
        </div>
        {user?.rol === 'ADMIN' && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            📅 Programar Turno Guardia
          </button>
        )}
      </div>

      {loading ? (
        <div className="dashboard-loading">
          <div className="loader"></div>
          <p className="text-muted">Cargando turnos de guardia...</p>
        </div>
      ) : guardias.length === 0 ? (
        <div className="empty-panel glass-panel text-center py-5">
          <span className="empty-big-icon">📅</span>
          <h3>No hay guardias registradas</h3>
          <p className="text-muted">Todos los días operativos siguen el horario de oficina estándar.</p>
        </div>
      ) : (
        <div className="guardias-timeline mt-4">
          {guardias.map((g) => {
            const isToday = new Date().toISOString().split('T')[0] === g.fecha.split('T')[0];
            return (
              <div key={g.id} className={`guardia-card glass-panel ${isToday ? 'active-today' : ''} animate-slide-up`}>
                <div className="guardia-left">
                  <div className="date-badge">
                    <span className="date-day">{new Date(g.fecha).getDate() + 1}</span>
                    <span className="date-month">
                      {new Date(g.fecha).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="guardia-info">
                    <span className="guardia-tech-name">👤 {g.tecnico_nombre}</span>
                    <span className="guardia-date-full text-muted">
                      Fecha: {new Date(g.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    {g.observaciones && <p className="guardia-obs">📝 {g.observaciones}</p>}
                  </div>
                </div>

                <div className="guardia-right">
                  {isToday && (
                    <span className="today-badge pulse-badge">🚨 ACTIVO HOY</span>
                  )}
                  {user?.rol === 'ADMIN' && (
                    <button className="btn-delete" onClick={() => handleDeleteGuardia(g.id)} title="Eliminar Turno">
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SCHEDULE GUARD MODAL */}
      {showAddModal && (
        <div className="modal-overlay animate-fade">
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2>Programar Turno de Guardia</h2>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateGuardia} className="modal-form">
              <div className="form-group">
                <label className="form-label">SELECCIONAR FECHA DEL FERIADO</label>
                <input
                  type="date"
                  className="form-control"
                  value={newFecha}
                  onChange={(e) => setNewFecha(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">TÉCNICO DE TURNO</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    className="form-control" 
                    value={newTechId} 
                    onChange={(e) => setNewTechId(Number(e.target.value))}
                    required
                    style={{ flex: 1 }}
                  >
                    <option value="0">Seleccionar técnico responsable...</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleRaffle}
                    disabled={isRaffling}
                    style={{ fontSize: '12px', whiteSpace: 'nowrap' }}
                  >
                    🎰 Sorteo
                  </button>
                </div>

                {isRaffling && (
                  <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-dim)', marginBottom: '4px' }}>🎰 Girando la ruleta de técnicos...</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#a855f7', animation: 'pulse 0.5s infinite' }}>{currentRaffleName}</div>
                  </div>
                )}

                {!isRaffling && newTechId > 0 && currentRaffleName && (
                  <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🎯 Seleccionado: <strong>{currentRaffleName}</strong></span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">MOTIVO DEL FERIADO / NOTAS</label>
                <textarea
                  className="form-control textarea-field"
                  placeholder="Ej: Feriado de Fin de Año - Soporte Telefónico 24/7..."
                  rows={3}
                  value={newObs}
                  onChange={(e) => setNewObs(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || isRaffling}>
                  {isSubmitting ? 'Registrando...' : 'Programar Turno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
