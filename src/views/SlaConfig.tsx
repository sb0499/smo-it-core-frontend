import React, { useState, useEffect } from 'react';
import { slaService, SlaConfig } from '../services/sla.service';
import { showAlert } from '../utils/alerts';
import './Inventario.css';

export const SlaConfigView: React.FC = () => {
  const [configs, setConfigs] = useState<SlaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'SOLICITUD' | 'INCIDENCIA'>('SOLICITUD');

  // Local state for editable configs
  const [editedConfigs, setEditedConfigs] = useState<Record<number, { tiempo_horas: number; descripcion: string }>>({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const data = await slaService.getSlaConfigs();
      setConfigs(data);
      const initialMap: Record<number, { tiempo_horas: number; descripcion: string }> = {};
      data.forEach((c) => {
        initialMap[c.id] = {
          tiempo_horas: c.tiempo_horas,
          descripcion: c.descripcion || ''
        };
      });
      setEditedConfigs(initialMap);
    } catch (err: any) {
      console.error('Error al cargar SLA:', err);
      showAlert('Error al cargar configuraciones de SLA: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleHourChange = (id: number, val: number) => {
    const hours = Math.max(1, isNaN(val) ? 1 : val);
    setEditedConfigs((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        tiempo_horas: hours
      }
    }));
  };

  const handleDescChange = (id: number, desc: string) => {
    setEditedConfigs((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        descripcion: desc
      }
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(editedConfigs).map(([idStr, val]) => ({
        id: Number(idStr),
        tiempo_horas: val.tiempo_horas,
        descripcion: val.descripcion
      }));

      await slaService.bulkUpdateSlaConfigs(payload);
      showAlert('¡Configuraciones de SLA actualizadas exitosamente!');
      fetchConfigs();
    } catch (err: any) {
      showAlert('Error al guardar SLA: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatHoursPreview = (hours: number) => {
    if (hours < 24) {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    const days = (hours / 24).toFixed(1).replace('.0', '');
    return `${hours} horas (~${days} ${days === '1' ? 'día' : 'días'})`;
  };

  const getPriorityBadge = (prioridad: string) => {
    switch (prioridad) {
      case 'Critica':
        return (
          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 700, padding: '4px 10px' }}>
            Crítica
          </span>
        );
      case 'Alta':
        return (
          <span className="badge" style={{ background: 'rgba(249, 115, 22, 0.12)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)', fontWeight: 700, padding: '4px 10px' }}>
            Alta
          </span>
        );
      case 'Media':
        return (
          <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', fontWeight: 700, padding: '4px 10px' }}>
            Media
          </span>
        );
      case 'Baja':
        return (
          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 700, padding: '4px 10px' }}>
            Baja
          </span>
        );
      default:
        return <span className="badge badge-secondary">{prioridad}</span>;
    }
  };

  const filteredConfigs = configs.filter((c) => c.tipo_itil === activeTab);

  return (
    <div className="inventario-view animate-fade">
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Tiempos de SLA</h1>
          <p className="text-muted">
            Configuración de Acuerdos de Nivel de Servicio (tiempos máximos de resolución) diferenciados para Solicitudes (N1) e Incidencias (N2/N3/Admin)
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSaveAll}
          disabled={saving || loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {saving ? 'Guardando...' : 'Guardar Todos los Cambios'}
        </button>
      </div>

      {/* Tabs Header */}
      <div className="tabs-header" style={{ marginBottom: '24px' }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'SOLICITUD' ? 'active' : ''}`}
          onClick={() => setActiveTab('SOLICITUD')}
        >
          Solicitudes de Servicio (Nivel N1)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'INCIDENCIA' ? 'active' : ''}`}
          onClick={() => setActiveTab('INCIDENCIA')}
        >
          Incidencias Operativas (Nivel N2 / N3 / Admin)
        </button>
      </div>

      {/* SLA Type Description Banner */}
      <div
        className="filters-card glass-panel"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: activeTab === 'SOLICITUD' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(139, 92, 246, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {activeTab === 'SOLICITUD' ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          )}
        </div>
        <div>
          <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: '700' }}>
            {activeTab === 'SOLICITUD'
              ? 'Tiempos de Solicitudes y Requerimientos (Nivel N1)'
              : 'Tiempos de Incidencias, Fallas y Errores (Nivel N2 / N3 / Admin)'}
          </h4>
          <p className="text-muted" style={{ margin: 0, fontSize: '13px' }}>
            {activeTab === 'SOLICITUD'
              ? 'Aplica automáticamente a tickets clasificados como peticiones de servicio, accesos, consumibles o soporte general gestionados por técnicos en sede.'
              : 'Aplica a incidentes de indisponibilidad, caídas de servicio, fallas críticas de infraestructura o desarrollo.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="spinner" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)"></circle>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path>
            </svg>
          </div>
          <p className="text-muted" style={{ marginTop: '12px' }}>Cargando configuraciones de SLA...</p>
        </div>
      ) : (
        <div className="table-wrapper glass-panel">
          <table className="inventario-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Prioridad</th>
                <th style={{ width: '220px' }}>Tiempo de Solución (Horas)</th>
                <th style={{ width: '180px' }}>Equivalencia</th>
                <th>Descripción y Criterio de Aplicación</th>
                <th style={{ width: '140px' }}>Último Cambio</th>
              </tr>
            </thead>
            <tbody>
              {filteredConfigs.map((c) => {
                const currentEdit = editedConfigs[c.id] || { tiempo_horas: c.tiempo_horas, descripcion: c.descripcion || '' };
                return (
                  <tr key={c.id} className="table-row-hover">
                    <td>
                      {getPriorityBadge(c.prioridad)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          min="1"
                          max="720"
                          className="form-control"
                          value={currentEdit.tiempo_horas}
                          onChange={(e) => handleHourChange(c.id, parseInt(e.target.value, 10))}
                          style={{
                            width: '100px',
                            fontWeight: '700',
                            fontSize: '14px',
                            textAlign: 'center'
                          }}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>hrs</span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: '600',
                          fontSize: '13px',
                          color: 'var(--color-primary)'
                        }}
                      >
                        {formatHoursPreview(currentEdit.tiempo_horas)}
                      </span>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Descripción o justificación del tiempo SLA..."
                        value={currentEdit.descripcion}
                        onChange={(e) => handleDescChange(c.id, e.target.value)}
                        style={{ width: '100%', fontSize: '13px' }}
                      />
                    </td>
                    <td className="text-muted" style={{ fontSize: '12px' }}>
                      {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom Save Action Panel */}
      <div
        className="glass-panel"
        style={{
          marginTop: '20px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-text-dim)" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span style={{ fontSize: '12.5px', color: 'var(--color-text-dim)' }}>
            Los cambios afectarán el cálculo de SLA de los nuevos tickets creados a partir de su guardado.
          </span>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSaveAll}
          disabled={saving || loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {saving ? 'Guardando...' : 'Guardar Todos los Cambios'}
        </button>
      </div>
    </div>
  );
};
