import { showAlert, showConfirm } from '../utils/alerts';
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
  const [guardType, setGuardType] = useState<'feriado' | 'fin_de_semana'>('feriado');

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
      showAlert('No hay técnicos cargados para realizar el sorteo.');
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
        
        const obs = guardType === 'fin_de_semana'
          ? 'Sorteo automático de guardia para fin de semana (Sábado y Domingo).'
          : 'Sorteo automático de guardia realizado para el feriado.';
        setNewObs(obs);
        setIsRaffling(false);
      }
    }, 100);
  };

  const handleCreateGuardia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFecha || newTechId <= 0) {
      showAlert('Por favor selecciona una fecha y un técnico.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (guardType === 'fin_de_semana') {
        const satDate = newFecha;
        const [yr, mo, dy] = satDate.split('-').map(Number);
        const satDateObj = new Date(yr, mo - 1, dy);
        
        const sunDateObj = new Date(satDateObj);
        sunDateObj.setDate(satDateObj.getDate() + 1);
        
        const sunYr = sunDateObj.getFullYear();
        const sunMo = String(sunDateObj.getMonth() + 1).padStart(2, '0');
        const sunDy = String(sunDateObj.getDate()).padStart(2, '0');
        const sunDate = `${sunYr}-${sunMo}-${sunDy}`;

        // Create Saturday
        await guardService.createGuardia(satDate, newTechId, newObs || 'Guardia de Fin de Semana (Sábado)');
        // Create Sunday
        await guardService.createGuardia(sunDate, newTechId, newObs || 'Guardia de Fin de Semana (Domingo)');
      } else {
        await guardService.createGuardia(newFecha, newTechId, newObs || 'Guardia de Feriado');
      }
      
      setShowAddModal(false);
      setNewFecha('');
      setNewTechId(0);
      setNewObs('');
      setGuardType('feriado');

      fetchGuardiasData();
    } catch (err: any) {
      showAlert('Error registrando guardia: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGuardia = async (id: number) => {
    if (!await showConfirm('¿Estás seguro de que deseas eliminar este turno de guardia?')) return;
    try {
      await guardService.deleteGuardia(id);
      fetchGuardiasData();
    } catch (err: any) {
      showAlert('Error eliminando guardia: ' + err.message);
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
            Programar Turno Guardia
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
          <span className="empty-big-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-dim)' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </span>
          <h3>No hay guardias registradas</h3>
          <p className="text-muted">Todos los días operativos siguen el horario de oficina estándar.</p>
        </div>
      ) : (
        <div className="guardias-timeline mt-4">
          {guardias.map((g) => {
            const isToday = new Date().toISOString().split('T')[0] === g.fecha.split('T')[0];
            const [yr, mo, dy] = g.fecha.split('T')[0].split('-').map(Number);
            const dateObj = new Date(yr, mo - 1, dy);
            const dateDay = dy;
            const dateMonth = dateObj.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
            const dateFull = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            
            // Check if weekend (Saturday = 6, Sunday = 0)
            const dayOfWeek = dateObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return (
              <div key={g.id} className={`guardia-card glass-panel ${isToday ? 'active-today' : ''} ${isWeekend ? 'guardia-weekend' : 'guardia-holiday'} animate-slide-up`}>
                <div className="guardia-left">
                  <div className="date-badge" style={{
                    background: isWeekend ? 'rgba(124, 58, 237, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    color: isWeekend ? 'var(--color-primary)' : '#ef4444',
                    border: isWeekend ? '1px solid rgba(124, 58, 237, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)'
                  }}>
                    <span className="date-day">{dateDay}</span>
                    <span className="date-month">{dateMonth}</span>
                  </div>
                  
                  <div className="guardia-info">
                    <span className="guardia-tech-name" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      {g.tecnico_nombre}
                    </span>
                    <span className="guardia-date-full text-muted">
                      Fecha: {dateFull}
                    </span>
                    {g.observaciones && (
                      <p className="guardia-obs" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        {g.observaciones}
                      </p>
                    )}
                  </div>
                </div>

                <div className="guardia-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isWeekend ? (
                    <span className="badge badge-weekend" style={{ background: 'rgba(124, 58, 237, 0.08)', color: '#8b5cf6', border: '1px solid rgba(124, 58, 237, 0.15)', fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600' }}>FIN DE SEMANA</span>
                  ) : (
                    <span className="badge badge-holiday" style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)', fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600' }}>FERIADO</span>
                  )}
                  {isToday && (
                    <span className="today-badge pulse-badge">ACTIVO HOY</span>
                  )}
                  {user?.rol === 'ADMIN' && (
                    <button className="btn-delete" onClick={() => handleDeleteGuardia(g.id)} title="Eliminar Turno" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>TIPO DE TURNO DE GUARDIA</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                    <input
                      type="radio"
                      name="guardType"
                      value="feriado"
                      checked={guardType === 'feriado'}
                      onChange={() => { setGuardType('feriado'); setNewFecha(''); setNewTechId(0); setNewObs(''); }}
                    />
                    Feriado (1 Día)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                    <input
                      type="radio"
                      name="guardType"
                      value="fin_de_semana"
                      checked={guardType === 'fin_de_semana'}
                      onChange={() => { setGuardType('fin_de_semana'); setNewFecha(''); setNewTechId(0); setNewObs(''); }}
                    />
                    Fin de Semana (Sáb + Dom)
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {guardType === 'fin_de_semana' ? 'SELECCIONAR SÁBADO DEL FIN DE SEMANA' : 'SELECCIONAR FECHA DEL FERIADO'}
                </label>
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
                    Sorteo
                  </button>
                </div>

                {isRaffling && (
                  <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-dim)', marginBottom: '4px' }}>Girando la ruleta de técnicos...</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#7c3aed', animation: 'pulse 0.5s infinite' }}>{currentRaffleName}</div>
                  </div>
                )}
 
                {!isRaffling && newTechId > 0 && currentRaffleName && (
                  <div style={{ marginTop: '10px', padding: '8px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', fontSize: '12px', color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Seleccionado: <strong>{currentRaffleName}</strong></span>
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
