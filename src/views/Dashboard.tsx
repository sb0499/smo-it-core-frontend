import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ticketService, Ticket } from '../services/ticket.service';
import { inventoryService, Activo, Consumible } from '../services/inventory.service';
import { guardService, GuardiaFeriado } from '../services/guard.service';
import './Dashboard.css';

import { apiClient } from '../services/api';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activos, setActivos] = useState<Activo[]>([]);
  const [consumibles, setConsumibles] = useState<Consumible[]>([]);
  const [guardias, setGuardias] = useState<GuardiaFeriado[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [ticketsList, activosList, consumiblesList, guardiasList, usersList, personasList] = await Promise.all([
        ticketService.getTickets().catch(() => [] as Ticket[]),
        inventoryService.getActivos().catch(() => [] as Activo[]),
        inventoryService.getConsumibles().catch(() => [] as Consumible[]),
        guardService.getGuardias().catch(() => [] as GuardiaFeriado[]),
        apiClient.get<any[]>('/usuarios').catch(() => []),
        apiClient.get<any[]>('/personas').catch(() => []),
      ]);

      if (user?.rol === 'TECNICO') {
        const me = usersList.find((u: any) => u.id === user.id);
        const myEmpresaIds = me?.empresa_ids || [];

        // Filter tickets to only technician's assigned tickets
        const filteredTickets = ticketsList.filter((t: Ticket) => t.tecnico_id === user.id);

        // Filter assets to those assigned to the technician's companies
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
  const openTickets = tickets.filter(t => t.estado !== 'Finalizada');
  const criticalCount = openTickets.filter(t => t.prioridad === 'Critica').length;
  const altaCount = openTickets.filter(t => t.prioridad === 'Alta').length;
  const processCount = openTickets.filter(t => t.estado === 'En Proceso' || t.estado === 'Pruebas').length;

  // 2. Inventory computations
  const totalAssets = activos.length;
  const assignedAssets = activos.filter(a => a.estado === 'Asignado').length;
  const stockAssets = activos.filter(a => a.estado === 'Stock').length;

  // 3. Low stock consumables
  const lowStockConsumibles = consumibles.filter(c => c.stock_actual <= c.stock_minimo);

  // 4. Today's on-duty technician
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
      <div className="welcome-banner glass-panel">
        <div className="welcome-left">
          <h1>¡Hola de nuevo, <span className="gradient-text">{user?.nombre}</span>!</h1>
          <p className="text-muted">Aquí tienes el estado operativo de Shopping Managements Operadora para el día de hoy.</p>
        </div>
        <div className="welcome-right">
          <div className="guard-bubble">
            <span className="guard-label text-dim">Guardia TI Hoy:</span>
            <span className="guard-value" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ef4444' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {getTodayGuardTechName()}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Row */}
      <div className="dashboard-grid">
        {/* Metric 1: Active Support Tickets */}
        <div className="metric-card glass-panel glass-panel-interactive">
          <div className="metric-header">
            <span className="metric-icon-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"></path><line x1="13" y1="5" x2="13" y2="19"></line></svg>
            </span>
            <span className="metric-badge active-badge">En Curso</span>
          </div>
          <div className="metric-body">
            <h2 className="metric-value">{openTickets.length}</h2>
            <p className="metric-title">Tickets Activos</p>
          </div>
          <div className="metric-footer">
            <span className="sub-metric text-muted"><strong className="color-critical">{criticalCount}</strong> Críticos</span>
            <span className="sub-metric text-muted"><strong>{altaCount}</strong> Alta Prioridad</span>
          </div>
        </div>

        {/* Metric 2: Process Advance */}
        <div className="metric-card glass-panel glass-panel-interactive">
          <div className="metric-header">
            <span className="metric-icon-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: '#fff7ed' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            </span>
            <span className="metric-badge process-badge">Avance</span>
          </div>
          <div className="metric-body">
            <h2 className="metric-value">{processCount}</h2>
            <p className="metric-title">En Proceso o Pruebas</p>
          </div>
          <div className="metric-footer">
            <span className="sub-metric text-muted">Alineando resoluciones semanales</span>
          </div>
        </div>

        {/* Metric 3: Assets Stock */}
        <div className="metric-card glass-panel glass-panel-interactive">
          <div className="metric-header">
            <span className="metric-icon-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: '#ecfeff' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </span>
            <span className="metric-badge stock-badge">Hardware</span>
          </div>
          <div className="metric-body">
            <h2 className="metric-value">{totalAssets}</h2>
            <p className="metric-title">Activos Registrados</p>
          </div>
          <div className="metric-footer">
            <span className="sub-metric text-muted"><strong>{assignedAssets}</strong> Asignados</span>
            <span className="sub-metric text-muted"><strong>{stockAssets}</strong> en Bodega</span>
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

        {/* Low Stock Consumables */}
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
