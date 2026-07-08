import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectService, User } from '../services/project.service';
import { ticketService } from '../services/ticket.service';
import { inventoryService } from '../services/inventory.service';

export const Reportes: React.FC = () => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tipoReporte, setTipoReporte] = useState('tickets');
  const [tecnicoId, setTecnicoId] = useState('');
  const [tecnicos, setTecnicos] = useState<User[]>([]);

  // Analytics states
  const [ticketsCount, setTicketsCount] = useState(0);
  const [completedTickets, setCompletedTickets] = useState(0);
  const [pendingTickets, setPendingTickets] = useState(0);
  const [assetsInStock, setAssetsInStock] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);
  const [ticketsByPriority, setTicketsByPriority] = useState({ Baja: 0, Media: 0, Alta: 0, Critica: 0 });
  const [ticketsByEstado, setTicketsByEstado] = useState({ Nuevo: 0, EnProceso: 0, Pendiente: 0, Pruebas: 0, Finalizada: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user?.rol === 'ADMIN') {
      projectService.getUsuarios().then((users) => {
        setTecnicos(users.filter(u => u.rol === 'TECNICO' || u.rol === 'ADMIN'));
      }).catch(console.error);
    }

    // Load statistics
    setLoadingStats(true);
    Promise.all([
      ticketService.getTickets().catch(() => []),
      inventoryService.getActivos().catch(() => []),
      projectService.getProyectos().catch(() => []),
    ]).then(([ticketsList, activosList, proyectosList]) => {
      setTicketsCount(ticketsList.length);
      const done = ticketsList.filter((t: any) => t.estado === 'Finalizada').length;
      setCompletedTickets(done);
      setPendingTickets(ticketsList.length - done);
      setAssetsInStock(activosList.filter((a: any) => a.estado === 'Stock').length);
      setActiveProjects(proyectosList.filter((p: any) => p.estado !== 'Finalizado').length);

      // Compute distributions
      const prio = { Baja: 0, Media: 0, Alta: 0, Critica: 0 };
      const est = { Nuevo: 0, EnProceso: 0, Pendiente: 0, Pruebas: 0, Finalizada: 0 };
      ticketsList.forEach((t: any) => {
        if (prio[t.prioridad as keyof typeof prio] !== undefined) {
          prio[t.prioridad as keyof typeof prio]++;
        }
        const stateKey = t.estado.replace(/\s+/g, '') as keyof typeof est;
        if (est[stateKey] !== undefined) {
          est[stateKey]++;
        }
      });
      setTicketsByPriority(prio);
      setTicketsByEstado(est);
    }).catch(console.error).finally(() => setLoadingStats(false));
  }, [user]);

  const handleDownloadReport = () => {
    let url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/reportes/${tipoReporte}`;
    const token = localStorage.getItem('smo_token');
    const params = new URLSearchParams();
    
    if (token) params.append('token', token);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (user?.rol === 'ADMIN' && tecnicoId) params.append('tecnico_id', tecnicoId);
    
    if (Array.from(params).length > 0) {
      url += `?${params.toString()}`;
    }

    window.open(url, '_blank');
  };

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <div className="reportes-container animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Header Banner */}
      <div className="view-header glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', padding: '24px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            Centro de Analítica & Reportería IT
          </h2>
          <p className="text-muted font-xs mt-1">Monitorea el rendimiento del equipo de soporte y descarga reportes detallados para auditorías.</p>
        </div>
      </div>

      {loadingStats ? (
        <div className="dashboard-loading" style={{ margin: '40px 0' }}>
          <div className="loader"></div>
          <p className="text-muted">Generando métricas en tiempo real...</p>
        </div>
      ) : (
        /* Split Layout */
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* LEFT COLUMN: Analytics metrics & visual charts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 2x2 Grid stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="text-muted" style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Tickets Registrados</span>
                <h2 style={{ fontSize: '28px', color: '#1e293b' }}>{ticketsCount}</h2>
                <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                  <span>✓ {completedTickets} Solucionados</span>
                  <span style={{ color: '#94a3b8' }}>•</span>
                  <span style={{ color: '#475569' }}>{getPercentage(completedTickets, ticketsCount)}% Efectividad</span>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '4px solid #f59e0b' }}>
                <span className="text-muted" style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Tickets Pendientes de Cierre</span>
                <h2 style={{ fontSize: '28px', color: '#d97706' }}>{pendingTickets}</h2>
                <span className="text-dim" style={{ fontSize: '11.5px', marginTop: '6px' }}>Requieren atención y seguimiento del equipo.</span>
              </div>

              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '4px solid #3b82f6' }}>
                <span className="text-muted" style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Equipos en Bodega (Stock)</span>
                <h2 style={{ fontSize: '28px', color: '#2563eb' }}>{assetsInStock}</h2>
                <span className="text-dim" style={{ fontSize: '11.5px', marginTop: '6px' }}>Activos de hardware disponibles para entregar.</span>
              </div>

              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '4px solid #8b5cf6' }}>
                <span className="text-muted" style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Proyectos de TI Activos</span>
                <h2 style={{ fontSize: '28px', color: '#7c3aed' }}>{activeProjects}</h2>
                <span className="text-dim" style={{ fontSize: '11.5px', marginTop: '6px' }}>Cronogramas y tareas en proceso de ejecución.</span>
              </div>
            </div>

            {/* Distribution charts panel */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 className="mb-4" style={{ fontSize: '16px' }}>Métricas de Distribución de Soporte</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                {/* 1. Bar Chart: Priority Distribution */}
                <div>
                  <h4 className="text-muted mb-3" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Tickets Activos por Prioridad</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {Object.entries(ticketsByPriority).map(([prio, val]) => {
                      const pct = getPercentage(val, ticketsCount);
                      const barColor = prio === 'Critica' ? '#ef4444' : prio === 'Alta' ? '#f43f5e' : prio === 'Media' ? '#f59e0b' : '#10b981';
                      return (
                        <div key={prio} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600' }}>
                            <span>{prio === 'Critica' ? 'Crítica' : prio}</span>
                            <span className="text-dim">{val} ({pct}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '4px' }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Bar Chart: Status Distribution */}
                <div>
                  <h4 className="text-muted mb-3" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Tickets Activos por Estado</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {[
                      { key: 'Nuevo', label: 'Nuevos', val: ticketsByEstado.Nuevo, color: '#3b82f6' },
                      { key: 'EnProceso', label: 'En Proceso', val: ticketsByEstado.EnProceso, color: '#f59e0b' },
                      { key: 'Pendiente', label: 'Pendientes', val: ticketsByEstado.Pendiente, color: '#8b5cf6' },
                      { key: 'Pruebas', label: 'En Pruebas', val: ticketsByEstado.Pruebas, color: '#06b6d4' },
                      { key: 'Finalizada', label: 'Finalizados', val: ticketsByEstado.Finalizada, color: '#10b981' }
                    ].map(st => {
                      const pct = getPercentage(st.val, ticketsCount);
                      return (
                        <div key={st.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600' }}>
                            <span>{st.label}</span>
                            <span className="text-dim">{st.val} ({pct}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: st.color, borderRadius: '4px' }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Excel Downloader Module */}
          <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Descarga de Reportes</h3>
            <p className="text-muted font-xs mb-4">Exporta la información en archivos Excel (.xlsx) estructurados por filtros de fecha y técnico.</p>

            <div className="form-group mb-3">
              <label className="form-label">Tipo de Reporte</label>
              <select 
                className="form-control" 
                value={tipoReporte} 
                onChange={(e) => setTipoReporte(e.target.value)}
              >
                <option value="tickets">Reporte de Tickets (Soporte)</option>
                <option value="proyectos">Reporte de Proyectos y Tareas</option>
              </select>
            </div>

            {user?.rol === 'ADMIN' && (
              <div className="form-group mb-3">
                <label className="form-label">Filtrar por Técnico</label>
                <select 
                  className="form-control" 
                  value={tecnicoId} 
                  onChange={(e) => setTecnicoId(e.target.value)}
                >
                  <option value="">Todos los Técnicos (Global)</option>
                  {tecnicos.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group mb-3">
              <label className="form-label">Fecha Desde</label>
              <input 
                type="date" 
                className="form-control" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Fecha Hasta</label>
              <input 
                type="date" 
                className="form-control" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <button 
              className="btn btn-primary w-100" 
              style={{ padding: '12px', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={handleDownloadReport}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Descargar Reporte Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
