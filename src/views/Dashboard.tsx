import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketService, Ticket } from '../services/ticket.service';
import { inventoryService, Activo, Consumible } from '../services/inventory.service';
import { guardService, GuardiaFeriado } from '../services/guard.service';
import { projectService, Proyecto } from '../services/project.service';
import { apiClient } from '../services/api';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activos, setActivos] = useState<Activo[]>([]);
  const [consumibles, setConsumibles] = useState<Consumible[]>([]);
  const [guardias, setGuardias] = useState<GuardiaFeriado[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [ticketsList, activosList, consumiblesList, guardiasList, usersList, personasList, proyectosList, companiesList] = await Promise.all([
        ticketService.getTickets().catch(() => [] as Ticket[]),
        inventoryService.getActivos(1, 999999).then(res => res.data).catch(() => [] as Activo[]),
        inventoryService.getConsumibles(1, 999999).then(res => res.data).catch(() => [] as Consumible[]),
        guardService.getGuardias().catch(() => [] as GuardiaFeriado[]),
        apiClient.get<any[]>('/usuarios').catch(() => []),
        apiClient.get<any[]>('/personas').catch(() => []),
        projectService.getProyectos().catch(() => [] as Proyecto[]),
        apiClient.get<any[]>('/empresas').catch(() => []),
      ]);

      if (user?.rol === 'TECNICO') {
        const me = usersList.find((u: any) => u.id === user.id);
        const myEmpresaIds = me?.empresa_ids || [];

        // Filter tickets
        const filteredTickets = ticketsList.filter((t: Ticket) => t.tecnico_id === user.id);

        // Filter assets
        const personaToEmpresaMap = new Map(personasList.map((p: any) => [p.id, p.empresa_id]));
        const filteredActivos = activosList.filter((a: Activo) => {
          if (!a.persona_id) return false;
          const empId = personaToEmpresaMap.get(a.persona_id);
          return empId ? myEmpresaIds.includes(empId) : false;
        });

        setTickets(filteredTickets);
        setActivos(filteredActivos);
      } else {
        setTickets(ticketsList);
        setActivos(activosList);
      }

      setConsumibles(consumiblesList);
      setGuardias(guardiasList);
      setProyectos(proyectosList);
      setEmpresas(companiesList);
      
      // Filter out admins - el Administrador del Sistema nunca está de turno
      setTechnicians(usersList.filter((u: any) => (u.rol === 'TECNICO' || u.rol_nombre === 'TECNICO') && u.is_active));
    } catch (e) {
      console.error('Error fetching dashboard metrics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 1. Ticket computations
  const totalTicketsCount = tickets.length;
  const resolvedTicketsCount = tickets.filter(t => t.estado === 'Finalizada').length;
  const resolutionRate = totalTicketsCount > 0 ? Math.round((resolvedTicketsCount / totalTicketsCount) * 100) : 100;

  const openTickets = tickets.filter(t => t.estado !== 'Finalizada');
  const criticalCount = openTickets.filter(t => t.prioridad === 'Critica').length;
  const altaCount = openTickets.filter(t => t.prioridad === 'Alta').length;

  // 2. Inventory computations
  const totalAssets = activos.length;
  const assignedAssets = activos.filter(a => a.estado === 'Asignado').length;
  const stockAssets = activos.filter(a => a.estado === 'Stock').length;

  // 3. Low stock consumables
  const lowStockConsumibles = consumibles.filter(c => c.stock_actual <= c.stock_minimo);

  // 4. Project computations
  const activeProjects = proyectos.filter(p => p.estado !== 'Finalizado');
  const finishedProjects = proyectos.filter(p => p.estado === 'Finalizado');

  // 5. Active support shift per Sede/CC
  const getActiveTechForSede = (empresaId: number, empresaNombre: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // 1. Check if there's a registered weekend/holiday guard today for this Sede or globally
    const activeGuard = guardias.find(g => 
      g.fecha.split('T')[0] === todayStr && 
      (g.empresa_id === empresaId || g.empresa_id === null || g.empresa_id === undefined)
    );
    if (activeGuard) {
      return activeGuard.tecnico_nombre;
    }

    // 2. Regular Workday logic
    const isSpecialSede = ['GAMETOWN', 'TEATRO', 'APPARCA'].some(name => empresaNombre.toUpperCase().includes(name));
    
    // Gametown, El Teatro, Apparca work Tuesday (2) to Saturday (6).
    // Other companies work Monday (1) to Friday (5).
    const isWorkingDay = isSpecialSede
      ? (dayOfWeek >= 2 && dayOfWeek <= 6)
      : (dayOfWeek >= 1 && dayOfWeek <= 5);

    if (!isWorkingDay) {
      return 'Día Libre';
    }

    // Working day. Find technicians assigned to this Sede.
    const assignedTechs = technicians.filter(tech => {
      const belongs = tech.empresa_ids?.includes(empresaId);
      if (!belongs) return false;
      if (isSpecialSede) return true; // all cover equally
      return tech.nivel_soporte === 'N1'; // prefer N1 for normal sites
    });

    if (assignedTechs.length === 0) {
      const anySedeTechs = technicians.filter(tech => tech.empresa_ids?.includes(empresaId));
      if (anySedeTechs.length > 0) {
        return anySedeTechs.map(t => t.nombre_completo.split(' ')[0]).join(', ');
      }
      return 'TI General';
    }

    return assignedTechs.map(t => t.nombre_completo.split(' ')[0]).join(', ');
  };

  const getTodayGuardTechName = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayGuard = guardias.find(g => g.fecha.startsWith(todayStr));
    return todayGuard?.tecnico_nombre || 'Sin Guardia Programada';
  };

  if (loading) {
    return (
      <div className="dashboard-loading animate-fade">
        <div className="loader"></div>
        <p className="text-muted">Analizando métricas del sistema IT CORE...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container animate-fade">
      {/* Welcome Banner */}
      <div className="welcome-banner glass-panel" style={{ padding: '16px 20px' }}>
        <div className="welcome-left">
          <h1 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>¡Hola de nuevo, <span className="gradient-text">{user?.nombre}</span>!</h1>
          <p className="text-muted" style={{ fontSize: '11.5px', marginTop: '2px' }}>Aquí tienes el estado operativo de Shopping Managements Operadora para el día de hoy.</p>
        </div>
      </div>

      {/* Próximas Guardias Programadas */}
      <div className="glass-panel animate-slide-up" style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span style={{ fontSize: '10.5px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>Próximas Guardias Programadas (Fines de Semana y Feriados)</span>
        </div>
        
        {guardias.filter(g => new Date(g.fecha) >= new Date(new Date().setHours(0,0,0,0))).length === 0 ? (
          <p className="text-muted" style={{ fontSize: '11.5px', padding: '4px 0' }}>No hay guardias de fin de semana o feriados programadas.</p>
        ) : (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '2px' }}>
            {guardias
              .filter(g => new Date(g.fecha) >= new Date(new Date().setHours(0,0,0,0)))
              .sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
              .slice(0, 4)
              .map(g => {
                const dateObj = new Date(g.fecha);
                const dateStr = dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                return (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #f1f5f9', fontSize: '12px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--color-primary)', textTransform: 'capitalize' }}>{dateStr}:</span>
                    {g.empresa_nombre && (
                      <span style={{ fontSize: '9px', fontWeight: 'bold', background: '#eff6ff', color: '#1e40af', padding: '2px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                        {g.empresa_nombre}
                      </span>
                    )}
                    <span style={{ color: 'var(--color-text-main)', fontWeight: '500' }}>{g.tecnico_nombre}</span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>({g.observaciones || 'Guardia'})</span>
                  </div>
                );
              })
            }
          </div>
        )}
      </div>

      {/* Primary Metrics Row */}
      <div className="dashboard-grid">
        {/* Metric 1: Active Support Tickets */}
        <div className="metric-card glass-panel glass-panel-interactive animate-slide-up">
          <div className="metric-header">
            <span className="metric-icon-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.08)' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"></path><line x1="13" y1="5" x2="13" y2="19"></line></svg>
            </span>
            <span className="metric-badge active-badge">En Curso</span>
          </div>
          <div className="metric-body">
            <h2 className="metric-value">{openTickets.length}</h2>
            <p className="metric-title">Tickets Activos</p>
          </div>
          <div className="metric-footer">
            <span className="sub-metric"><strong className="color-critical">{criticalCount}</strong> Críticos</span>
            <span className="sub-metric"><strong>{altaCount}</strong> Alta</span>
          </div>
        </div>

        {/* Metric 2: Resolution Rate */}
        <div className="metric-card glass-panel glass-panel-interactive animate-slide-up">
          <div className="metric-header">
            <span className="metric-icon-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: '#f0fdf4' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            </span>
            <span className="metric-badge" style={{ background: '#f0fdf4', color: '#166534' }}>Efectividad</span>
          </div>
          <div className="metric-body">
            <h2 className="metric-value">{resolutionRate}%</h2>
            <p className="metric-title">Tasa de Resolución</p>
          </div>
          <div className="metric-footer">
            <span className="sub-metric"><strong>{resolvedTicketsCount}</strong> resueltos</span>
            <span className="sub-metric"><strong>{totalTicketsCount}</strong> totales</span>
          </div>
        </div>

        {/* Metric 3: Assets Stock */}
        <div className="metric-card glass-panel glass-panel-interactive animate-slide-up">
          <div className="metric-header">
            <span className="metric-icon-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.08)' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </span>
            <span className="metric-badge stock-badge">Hardware</span>
          </div>
          <div className="metric-body">
            <h2 className="metric-value">{totalAssets}</h2>
            <p className="metric-title">Activos Registrados</p>
          </div>
          <div className="metric-footer">
            <span className="sub-metric"><strong>{assignedAssets}</strong> Asignados</span>
            <span className="sub-metric"><strong>{stockAssets}</strong> Bodega</span>
          </div>
        </div>

        {/* Metric 4: Projects TI */}
        <div className="metric-card glass-panel glass-panel-interactive animate-slide-up">
          <div className="metric-header">
            <span className="metric-icon-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: '#f8fafc' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            </span>
            <span className="metric-badge process-badge">Proyectos</span>
          </div>
          <div className="metric-body">
            <h2 className="metric-value">{activeProjects.length}</h2>
            <p className="metric-title">Proyectos Activos</p>
          </div>
          <div className="metric-footer">
            <span className="sub-metric"><strong>{finishedProjects.length}</strong> Finalizados</span>
            <span className="sub-metric"><strong>{proyectos.length}</strong> Totales</span>
          </div>
        </div>
      </div>

      {/* Detailed Operations Area */}
      <div className="operations-grid">
        {/* Support Overview */}
        <div className="operation-column glass-panel">
          <div className="column-header">
            <h3>Actividades Recientes y Alertas</h3>
            <div className="pulse-green"></div>
          </div>
          <div className="recent-tickets-list">
            {openTickets.length === 0 ? (
              <div className="empty-operation text-center py-4">
                <p className="text-muted mt-2">¡Todo al día! No hay tickets pendientes de soporte.</p>
              </div>
            ) : (
              openTickets.slice(0, 4).map((ticket) => (
                <div key={ticket.id} className="mini-ticket-row">
                  <div className="mini-ticket-left">
                    <span className={`mini-priority-dot priority-${ticket.prioridad.toLowerCase()}`} title={ticket.prioridad}></span>
                    <div className="mini-ticket-info">
                      <span className="mini-ticket-title">{ticket.titulo}</span>
                      <span className="mini-ticket-desc text-muted">{ticket.categoria} • {ticket.persona_solicitante || 'Sede'}</span>
                    </div>
                  </div>
                  <div className="mini-ticket-right">
                    <span className={`badge badge-${ticket.estado.toLowerCase().replace(' ', '')}`}>
                      {ticket.estado}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Consumibles */}
        <div className="operation-column glass-panel">
          <div className="column-header">
            <h3>Alertas de Consumibles Críticos</h3>
            {lowStockConsumibles.length > 0 && <span className="warning-count-badge">{lowStockConsumibles.length}</span>}
          </div>
          <div className="low-stock-list">
            {lowStockConsumibles.length === 0 ? (
              <div className="empty-operation text-center py-4">
                <p className="text-muted mt-2">Stock robusto. Todos los consumibles por encima del mínimo.</p>
              </div>
            ) : (
              lowStockConsumibles.map((c) => (
                <div key={c.id} className="low-stock-row animate-fade">
                  <div className="low-stock-info">
                    <span className="consumable-name">{c.nombre}</span>
                    <span className="consumable-stock text-muted">Stock: <strong className="color-critical">{c.stock_actual}</strong> / Mínimo: {c.stock_minimo} {c.unidad_medida}</span>
                  </div>
                  <div className="stock-progress-bar-container">
                    <div 
                      className="stock-progress-fill" 
                      style={{ width: `${Math.max(5, Math.min(100, (c.stock_actual / c.stock_minimo) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
