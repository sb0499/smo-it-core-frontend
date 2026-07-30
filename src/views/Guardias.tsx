import { showAlert, showConfirm } from '../utils/alerts';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { guardService, GuardiaFeriado } from '../services/guard.service';
import { projectService, User } from '../services/project.service';
import { apiClient } from '../services/api';
import './Guardias.css';

export const Guardias: React.FC = () => {
  const { user } = useAuth();
  const [guardias, setGuardias] = useState<GuardiaFeriado[]>([]);
  const [allGuardias, setAllGuardias] = useState<GuardiaFeriado[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [empresas, setEmpresas] = useState<{ id: number; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // New guard form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFecha, setNewFecha] = useState('');
  const [newTechId, setNewTechId] = useState<number>(0);
  const [newEmpresaId, setNewEmpresaId] = useState<number>(0);
  const [newObs, setNewObs] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guardType, setGuardType] = useState<'feriado' | 'fin_de_semana'>('feriado');

  // Raffle State
  const [isRaffling, setIsRaffling] = useState(false);
  const [currentRaffleName, setCurrentRaffleName] = useState('');

  const getActiveTechForSede = (empresaId: number, empresaNombre: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // 1. Check if there's a registered weekend/holiday guard today for this Sede or globally
    const activeGuard = allGuardias.find(g => 
      g.fecha.split('T')[0] === todayStr && 
      (g.empresa_id === empresaId || g.empresa_id === null || g.empresa_id === undefined)
    );
    if (activeGuard) {
      return {
        nombre: activeGuard.tecnico_nombre || 'Sin Nombre',
        tipo: `Guardia (${activeGuard.empresa_nombre || 'Global'})`,
        isWeekendGuard: true
      };
    }

    // 2. Regular Workday logic
    const isSpecialSede = ['GAMETOWN', 'TEATRO', 'APPARCA'].some(name => empresaNombre.toUpperCase().includes(name));
    
    // Gametown, El Teatro, Apparca work Tuesday (2) to Saturday (6).
    // Other companies work Monday (1) to Friday (5).
    const isWorkingDay = isSpecialSede
      ? (dayOfWeek >= 2 && dayOfWeek <= 6)
      : (dayOfWeek >= 1 && dayOfWeek <= 5);

    if (!isWorkingDay) {
      return {
        nombre: 'Sin Guardia Asignada',
        tipo: 'Día Libre (Soporte Pasivo)',
        isWeekendGuard: false,
        noActive: true
      };
    }

    // Working day. Find technicians assigned to this Sede.
    const assignedTechs = technicians.filter(tech => {
      const belongs = tech.empresa_ids?.includes(empresaId);
      if (!belongs) return false;
      if (isSpecialSede) return true; // N1 vs N2 doesn't matter
      return tech.nivel_soporte === 'N1'; // Prefer N1 for normal sites
    });

    if (assignedTechs.length === 0) {
      const anySedeTechs = technicians.filter(tech => tech.empresa_ids?.includes(empresaId));
      if (anySedeTechs.length > 0) {
        return {
          nombre: anySedeTechs.map(t => t.nombre_completo).join(', '),
          tipo: 'Soporte Técnico de Planta',
          isWeekendGuard: false
        };
      }
      return {
        nombre: 'Equipo TI General',
        tipo: 'Soporte Remoto',
        isWeekendGuard: false
      };
    }

    return {
      nombre: assignedTechs.map(t => t.nombre_completo).join(', '),
      tipo: isSpecialSede ? 'Especialista de Turno (M-S)' : 'Técnico de Turno (L-V)',
      isWeekendGuard: false
    };
  };

  // Load initial companies and technicians once on mount
  useEffect(() => {
    Promise.all([
      projectService.getUsuarios().catch(() => []),
      apiClient.get<any[]>('/empresas').catch(() => [])
    ]).then(([usersList, companyList]) => {
      setEmpresas(companyList);
      setTechnicians(usersList.filter((u: any) => 
        (u.rol === 'TECNICO' || u.rol_nombre === 'TECNICO') && u.is_active
      ));
    }).catch(err => console.error('Error loading initial options:', err));
  }, []);

  const fetchGuardiasData = async () => {
    try {
      setLoading(true);
      const [paginatedRes, fullList] = await Promise.all([
        guardService.getGuardias(page, limit).catch(() => ({ total: 0, page: 1, limit: 10, data: [] })),
        guardService.getGuardias().catch(() => [])
      ]);
      setGuardias(paginatedRes.data || []);
      setTotal(paginatedRes.total || 0);
      setAllGuardias(fullList || []);
    } catch (e) {
      console.error('Error fetching guards schedule', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuardiasData();
  }, [page, limit]);

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
      const empIdVal = newEmpresaId > 0 ? newEmpresaId : null;
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
        await guardService.createGuardia(satDate, newTechId, newObs || 'Guardia de Fin de Semana (Sábado)', empIdVal);
        // Create Sunday
        await guardService.createGuardia(sunDate, newTechId, newObs || 'Guardia de Fin de Semana (Domingo)', empIdVal);
      } else {
        await guardService.createGuardia(newFecha, newTechId, newObs || 'Guardia de Feriado', empIdVal);
      }
      
      setShowAddModal(false);
      setNewFecha('');
      setNewTechId(0);
      setNewEmpresaId(0);
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
          <p className="text-muted">Lista cronológica de técnicos asignados a soporte de emergencias en días festivos y fines de semana.</p>
        </div>
        {user?.rol === 'ADMIN' && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            Programar Turno Guardia
          </button>
        )}
      </div>

      {/* active planta shifts grid banner */}
      <div className="glass-panel animate-slide-up" style={{ padding: '14px 18px', background: '#ffffff', border: '1px solid #f1f5f9', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '10.5px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
          Soporte Técnico de Planta (L-V)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
          {empresas.map(emp => {
            const shift = getActiveTechForSede(emp.id, emp.nombre);
            // Show only first name to keep it compact and fine
            const shiftName = shift?.nombre || 'Equipo TI General';
            const shortName = (shiftName.startsWith('Equipo') || shiftName.startsWith('Sin')) ? shiftName : shiftName.split(' ')[0];
            return (
              <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '6px 10px', borderRadius: '4px', border: '1px solid #f1f5f9', fontSize: '11.5px' }}>
                <span style={{ fontWeight: '700', color: '#2563eb', fontSize: '11px' }}>{emp.nombre}</span>
                <span style={{ color: '#475569', fontWeight: '500' }}>{shortName}</span>
              </div>
            );
          })}
        </div>
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
        <>
          <div className="assets-table-container glass-panel mt-2">
            <table className="assets-table">
              <thead>
                <tr>
                  <th>FECHA DE GUARDIA</th>
                  <th>TIPO</th>
                  <th>SEDE</th>
                  <th>TÉCNICO DE TURNO</th>
                  <th>OBSERVACIONES / MOTIVO</th>
                  {user?.rol === 'ADMIN' && <th style={{ width: '80px', textAlign: 'center' }}>ACCIONES</th>}
                </tr>
              </thead>
              <tbody>
                {guardias.map((g) => {
                  const dateObj = new Date(g.fecha);
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isToday = g.fecha.split('T')[0] === todayStr;
                  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                  const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
                  const fullDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
                  
                  return (
                    <tr key={g.id} className={isToday ? 'active-today' : ''} style={isToday ? { background: '#fdf4ff' } : undefined}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ textTransform: 'capitalize' }}>{dayName}</strong>
                          <span className="text-muted">{fullDate}</span>
                          {isToday && <span className="today-badge" style={{ background: '#fdf4ff', color: '#a21caf', border: '1px solid #f0abfc' }}>Hoy</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`badge`} style={isWeekend ? { background: '#eff6ff', color: '#1e40af' } : { background: '#fef2f2', color: '#b91c1c' }}>
                          {isWeekend ? 'Fin de Semana' : 'Feriado'}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '9px' }}>
                          {g.empresa_nombre || 'Todas'}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', color: '#1e293b' }}>
                        {g.tecnico_nombre}
                      </td>
                      <td className="text-muted" style={{ fontStyle: 'italic', fontSize: '11.5px' }}>
                        {g.observaciones || 'Guardia de soporte pasivo programada'}
                      </td>
                      {user?.rol === 'ADMIN' && (
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="btn-delete" 
                            onClick={() => handleDeleteGuardia(g.id)}
                            title="Eliminar guardia"
                          >
                            ×
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {guardias.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 4px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                style={{ cursor: page === 1 ? 'not-allowed' : 'pointer', padding: '6px 12px', fontSize: '12px' }}
              >
                Anterior
              </button>
              <span style={{ fontSize: '13px', color: 'var(--color-text-main)', fontWeight: '500' }}>
                Página {page} de {Math.ceil(total / limit) || 1} ({total} registros)
              </span>
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= (Math.ceil(total / limit) || 1)}
                onClick={() => setPage(page + 1)}
                style={{ cursor: page >= (Math.ceil(total / limit) || 1) ? 'not-allowed' : 'pointer', padding: '6px 12px', fontSize: '12px' }}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
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
                <label className="form-label">SEDE (DONDE ESTARÁ DE TURNO)</label>
                <select
                  className="form-control"
                  value={newEmpresaId}
                  onChange={(e) => setNewEmpresaId(Number(e.target.value))}
                >
                  <option value="0">Todas las sedes (Global)</option>
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                  ))}
                </select>
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
