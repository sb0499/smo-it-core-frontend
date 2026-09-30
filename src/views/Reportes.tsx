import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectService, User } from '../services/project.service';
import { ticketService } from '../services/ticket.service';

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
  const [efectividadPct, setEfectividadPct] = useState(0);
  const [assetsInStock, setAssetsInStock] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);

  // SLA State
  const [slaStats, setSlaStats] = useState({
    totalEvaluados: 0,
    cumplidos: 0,
    vencidos: 0,
    enRiesgo: 0,
    enTiempo: 0,
    cumplimientoPct: 100
  });

  const [ticketsByPriority, setTicketsByPriority] = useState({ Baja: 0, Media: 0, Alta: 0, Critica: 0 });
  const [ticketsByEstado, setTicketsByEstado] = useState({
    Nuevo: 0,
    EnProceso: 0,
    Resuelto: 0,
    Cerrado: 0,
    ElevadoAProveedor: 0,
    ElevadoAAdministracion: 0
  });
  const [desgloseTecnicos, setDesgloseTecnicos] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Load Technicians on mount
  useEffect(() => {
    if (user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR') {
      projectService.getUsuarios().then((users) => {
        setTecnicos(users.filter(u => u.rol === 'TECNICO' || u.rol === 'SUPERVISOR' || u.rol === 'ADMIN'));
      }).catch(console.error);
    }
  }, [user]);

  // Fetch filtered analytics & SLA metrics
  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await ticketService.getReporteStats({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        tecnico_id: tecnicoId || undefined
      });

      setTicketsCount(res.totalTickets || 0);
      setCompletedTickets(res.solucionados || 0);
      setPendingTickets(res.pendientes || 0);
      setEfectividadPct(res.efectividadPct || 0);
      setAssetsInStock(res.assetsInStock || 0);
      setActiveProjects(res.activeProjects || 0);

      if (res.sla) {
        setSlaStats(res.sla);
      }
      if (res.ticketsPorPriority || res.ticketsPorPrioridad) {
        setTicketsByPriority(res.ticketsPorPrioridad || res.ticketsPorPriority);
      }
      if (res.ticketsPorEstado) {
        setTicketsByEstado(res.ticketsPorEstado);
      }
      if (Array.isArray(res.desgloseTecnicos)) {
        setDesgloseTecnicos(res.desgloseTecnicos);
      }
    } catch (err) {
      console.error('Error al cargar analítica de reportes:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [startDate, endDate, tecnicoId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleDownloadReport = () => {
    let url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/reportes/${tipoReporte}`;
    const token = localStorage.getItem('smo_token');
    const params = new URLSearchParams();
    
    if (token) params.append('token', token);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if ((user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR') && tecnicoId) params.append('tecnico_id', tecnicoId);
    
    if (Array.from(params).length > 0) {
      url += `?${params.toString()}`;
    }

    window.open(url, '_blank');
  };

  const handleLimpiarFiltros = () => {
    setStartDate('');
    setEndDate('');
    setTecnicoId('');
    setTipoReporte('tickets');
  };

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const slaColor = slaStats.cumplimientoPct >= 90 ? '#10b981' : slaStats.cumplimientoPct >= 75 ? '#f59e0b' : '#ef4444';

  return (
    <div className="reportes-container animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* 1. Header Banner */}
      <div className="view-header glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '22px', fontWeight: '800', margin: 0 }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            Centro de Analítica, SLA & Reportería IT
          </h2>
          <p className="text-muted font-xs mt-1" style={{ margin: '6px 0 0 0', fontSize: '13px' }}>
            Monitorea el cumplimiento de SLA, tiempos de atención y descarga reportes ejecutivos en formato Excel (.xlsx).
          </p>
        </div>

        {/* Global SLA Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '16px',
          background: 'var(--bg-panel-hover)',
          padding: '12px 22px',
          borderRadius: '12px',
          border: `1.5px solid ${slaColor}40`,
          boxShadow: `0 4px 16px ${slaColor}15`
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              SLA del Período
            </div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: slaColor, lineHeight: 1.1, marginTop: '2px' }}>
              {slaStats.cumplimientoPct}%
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-dim)', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ color: '#10b981', fontWeight: '600' }}>✓ {slaStats.cumplidos} cumplidos</div>
            <div style={{ color: slaStats.vencidos > 0 ? '#ef4444' : undefined, fontWeight: slaStats.vencidos > 0 ? '700' : 'normal' }}>
              ✕ {slaStats.vencidos} vencidos
            </div>
          </div>
        </div>
      </div>

      {/* 2. Spacious Unified Filter & Action Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '18px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
          
          {/* Tipo de Reporte */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Tipo de Reporte:
            </label>
            <select 
              className="form-control" 
              style={{ width: '210px', padding: '8px 12px', fontSize: '13px' }}
              value={tipoReporte} 
              onChange={(e) => setTipoReporte(e.target.value)}
            >
              <option value="tickets">Reporte de Tickets & SLA</option>
              <option value="proyectos">Reporte de Proyectos & Tareas</option>
            </select>
          </div>

          {/* Filtro por Especialista */}
          {(user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Especialista:
              </label>
              <select 
                className="form-control" 
                style={{ width: '240px', padding: '8px 12px', fontSize: '13px' }}
                value={tecnicoId} 
                onChange={(e) => setTecnicoId(e.target.value)}
              >
                <option value="">Todos los Especialistas (Global)</option>
                {tecnicos.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                ))}
              </select>
            </div>
          )}

          {/* Fecha Desde */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Fecha Desde:
            </label>
            <input 
              type="date" 
              className="form-control" 
              style={{ width: '160px', padding: '7.5px 12px', fontSize: '13px' }}
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Fecha Hasta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Fecha Hasta:
            </label>
            <input 
              type="date" 
              className="form-control" 
              style={{ width: '160px', padding: '7.5px 12px', fontSize: '13px' }}
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {(startDate || endDate || tecnicoId) && (
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingTop: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleLimpiarFiltros}
                style={{ padding: '8px 14px', fontSize: '12px' }}
              >
                Limpiar Filtros ✕
              </button>
            </div>
          )}
        </div>

        {/* Botón de Exportar Excel */}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownloadReport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '11px 22px',
              fontSize: '13.5px',
              fontWeight: '700',
              borderRadius: '8px',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Exportar Excel con SLA (.xlsx)
          </button>
        </div>
      </div>

      {loadingStats ? (
        <div className="dashboard-loading" style={{ margin: '60px 0', textAlign: 'center' }}>
          <div className="loader"></div>
          <p className="text-muted" style={{ marginTop: '16px', fontSize: '14px' }}>
            Calculando métricas y SLA del período seleccionado...
          </p>
        </div>
      ) : (
        /* Full-Width Dashboard Content */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 3. Top 4 KPI Metrics Grid (Spacious Full Width) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            
            {/* Card 1: Total Tickets */}
            <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #3b82f6' }}>
              <span className="text-muted" style={{ fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Tickets Filtrados
              </span>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--color-text-main)', margin: 0 }}>
                {ticketsCount}
              </h2>
              <div style={{ fontSize: '12.5px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span>✓ {completedTickets} Solucionados</span>
                <span style={{ color: '#94a3b8' }}>•</span>
                <span style={{ color: '#475569' }}>{efectividadPct}% Efectividad</span>
              </div>
            </div>

            {/* Card 2: SLA Cumplimiento */}
            <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: `4px solid ${slaColor}` }}>
              <span className="text-muted" style={{ fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Cumplimiento General de SLA
              </span>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: slaColor, margin: 0 }}>
                {slaStats.cumplimientoPct}%
              </h2>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <span style={{ color: '#10b981', fontWeight: '600' }}>{slaStats.cumplidos} a tiempo</span>
                <span style={{ color: slaStats.vencidos > 0 ? '#ef4444' : '#94a3b8', fontWeight: slaStats.vencidos > 0 ? '700' : 'normal' }}>
                  {slaStats.vencidos} vencidos
                </span>
              </div>
            </div>

            {/* Card 3: Pendientes */}
            <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #f59e0b' }}>
              <span className="text-muted" style={{ fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pendientes de Cierre
              </span>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#d97706', margin: 0 }}>
                {pendingTickets}
              </h2>
              <span className="text-dim" style={{ fontSize: '12.5px', marginTop: '4px' }}>
                Requieren atención o seguimiento activo.
              </span>
            </div>

            {/* Card 4: Activos & Proyectos */}
            <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #8b5cf6' }}>
              <span className="text-muted" style={{ fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Activos & Proyectos TI
              </span>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#7c3aed', margin: 0 }}>
                {assetsInStock} <span style={{ fontSize: '18px', color: 'var(--color-text-muted)', fontWeight: '400' }}>stock</span> / {activeProjects} <span style={{ fontSize: '18px', color: 'var(--color-text-muted)', fontWeight: '400' }}>proy</span>
              </h2>
              <span className="text-dim" style={{ fontSize: '12.5px', marginTop: '4px' }}>
                Hardware disponible / Proyectos en ejecución.
              </span>
            </div>
          </div>

          {/* 4. SLA Indicator & Breakdown Card */}
          <div className="glass-panel" style={{ padding: '24px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--color-text-main)' }}>
                  Indicador de Nivel de Servicio (SLA General)
                </h3>
                <p className="text-muted font-xs" style={{ margin: '4px 0 0 0' }}>
                  Desglose de atenciones evaluadas contra los tiempos de respuesta y resolución configurados en BD (Tickets N3 quedan exentos).
                </p>
              </div>
              <span style={{ fontSize: '14px', fontWeight: '800', color: slaColor }}>
                {slaStats.cumplimientoPct}% de Cumplimiento Global
              </span>
            </div>

            {/* Multi-segment Progress Bar */}
            <div style={{ width: '100%', height: '16px', background: 'var(--bg-panel-hover)', borderRadius: '8px', overflow: 'hidden', display: 'flex', marginBottom: '20px' }}>
              <div
                title={`En Tiempo: ${slaStats.enTiempo}`}
                style={{
                  width: `${getPercentage(slaStats.enTiempo, slaStats.totalEvaluados)}%`,
                  height: '100%',
                  background: '#10b981',
                  transition: 'width 0.4s ease'
                }}
              />
              <div
                title={`En Riesgo (SLA > 75%): ${slaStats.enRiesgo}`}
                style={{
                  width: `${getPercentage(slaStats.enRiesgo, slaStats.totalEvaluados)}%`,
                  height: '100%',
                  background: '#f59e0b',
                  transition: 'width 0.4s ease'
                }}
              />
              <div
                title={`SLA Vencido: ${slaStats.vencidos}`}
                style={{
                  width: `${getPercentage(slaStats.vencidos, slaStats.totalEvaluados)}%`,
                  height: '100%',
                  background: '#ef4444',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>

            {/* Legends */}
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></span>
                <span>En Tiempo: <strong>{slaStats.enTiempo}</strong> ({getPercentage(slaStats.enTiempo, slaStats.totalEvaluados)}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></span>
                <span>En Riesgo: <strong>{slaStats.enRiesgo}</strong> ({getPercentage(slaStats.enRiesgo, slaStats.totalEvaluados)}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></span>
                <span>SLA Vencido: <strong>{slaStats.vencidos}</strong> ({getPercentage(slaStats.vencidos, slaStats.totalEvaluados)}%)</span>
              </div>
            </div>
          </div>

          {/* 5. Distribution Metrics (2 Equal Columns, Breathable Layout) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
            
            {/* Priority Distribution */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tickets por Prioridad
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(ticketsByPriority).map(([prio, val]) => {
                  const pct = getPercentage(val, ticketsCount);
                  const barColor = prio === 'Critica' ? '#ef4444' : prio === 'Alta' ? '#f43f5e' : prio === 'Media' ? '#f59e0b' : '#10b981';
                  return (
                    <div key={prio} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600' }}>
                        <span>{prio === 'Critica' ? 'Crítica' : prio}</span>
                        <span className="text-dim">{val} ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '10px', background: 'var(--bg-panel-hover)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '5px' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Distribution */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tickets por Estado
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { key: 'Nuevo', label: 'Nuevos', val: ticketsByEstado.Nuevo, color: '#3b82f6' },
                  { key: 'EnProceso', label: 'En Proceso', val: ticketsByEstado.EnProceso, color: '#f59e0b' },
                  { key: 'Resuelto', label: 'Resueltos (N2)', val: ticketsByEstado.Resuelto, color: '#10b981' },
                  { key: 'Cerrado', label: 'Cerrados', val: ticketsByEstado.Cerrado, color: '#64748b' },
                  { key: 'ElevadoAProveedor', label: 'Elevado a Proveedor', val: ticketsByEstado.ElevadoAProveedor, color: '#d97706' },
                  { key: 'ElevadoAAdministracion', label: 'Elevado a Admin', val: ticketsByEstado.ElevadoAAdministracion, color: '#6366f1' }
                ].map(st => {
                  const pct = getPercentage(st.val, ticketsCount);
                  return (
                    <div key={st.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600' }}>
                        <span>{st.label}</span>
                        <span className="text-dim">{st.val} ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '10px', background: 'var(--bg-panel-hover)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: st.color, borderRadius: '5px' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 6. Specialist Performance & SLA Table */}
          {!tecnicoId && desgloseTecnicos.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px 28px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--color-text-main)' }}>
                  Rendimiento & Cumplimiento de SLA por Especialista
                </h3>
                <p className="text-muted font-xs" style={{ margin: '4px 0 0 0' }}>
                  Resumen de carga de trabajo, efectividad y porcentaje individual de SLA en el período seleccionado.
                </p>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="inventario-table">
                  <thead>
                    <tr>
                      <th>Especialista</th>
                      <th style={{ textAlign: 'center' }}>Total Casos</th>
                      <th style={{ textAlign: 'center' }}>Resueltos / Cerrados</th>
                      <th style={{ textAlign: 'center' }}>Abiertos / Pendientes</th>
                      <th style={{ textAlign: 'center' }}>SLA Cumplidos</th>
                      <th style={{ textAlign: 'center' }}>SLA Vencidos</th>
                      <th style={{ textAlign: 'center' }}>% SLA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {desgloseTecnicos.map((t, idx) => {
                      const tecSlaColor = t.slaPct >= 90 ? '#10b981' : t.slaPct >= 75 ? '#f59e0b' : '#ef4444';
                      return (
                        <tr key={idx} className="table-row-hover">
                          <td style={{ fontWeight: '700', fontSize: '14px' }}>{t.nombre}</td>
                          <td style={{ textAlign: 'center', fontWeight: '800', color: '#2563eb' }}>{t.total}</td>
                          <td style={{ textAlign: 'center', fontWeight: '700', color: '#10b981' }}>{t.resueltos}</td>
                          <td style={{ textAlign: 'center', fontWeight: '700', color: '#d97706' }}>{t.abiertos}</td>
                          <td style={{ textAlign: 'center', color: '#10b981', fontWeight: '600' }}>{t.slaCumplidos}</td>
                          <td style={{ textAlign: 'center', color: t.slaVencidos > 0 ? '#ef4444' : 'var(--color-text-muted)', fontWeight: t.slaVencidos > 0 ? '700' : 'normal' }}>
                            {t.slaVencidos}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className="badge"
                              style={{
                                background: `${tecSlaColor}1a`,
                                color: tecSlaColor,
                                fontWeight: '800',
                                fontSize: '12.5px',
                                padding: '4px 10px',
                                borderRadius: '6px'
                              }}
                            >
                              {t.slaPct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
