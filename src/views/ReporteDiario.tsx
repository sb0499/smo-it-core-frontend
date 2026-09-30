import React, { useState, useEffect } from 'react';
import { ticketService } from '../services/ticket.service';
import { showAlert, showConfirm } from '../utils/alerts';
import './Inventario.css';

export const ReporteDiarioView: React.FC = () => {
  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedTecId, setSelectedTecId] = useState<number | null>(null);

  const selectedTec = data?.tecnicos?.find((t: any) => t.tecnico_id === selectedTecId);

  useEffect(() => {
    fetchReporte(fecha);
  }, [fecha]);

  const fetchReporte = async (targetFecha: string) => {
    try {
      setLoading(true);
      const res = await ticketService.getPreviewReporteDiario(targetFecha);
      setData(res);
    } catch (err: any) {
      console.error('Error al cargar reporte diario:', err);
      showAlert('Error al cargar reporte diario: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarExcel = async () => {
    try {
      setDownloading(true);
      await ticketService.descargarReporteDiarioExcel(fecha);
    } catch (err: any) {
      showAlert('Error al descargar Excel del reporte diario: ' + (err.message || 'Error desconocido'));
    } finally {
      setDownloading(false);
    }
  };

  const handleEnviarEmail = async () => {
    const confirm = await showConfirm(
      `¿Deseas despachar por correo electrónico el Resumen Final del Día (${fecha}) a todos los Administradores y Supervisores?`
    );
    if (!confirm) return;

    try {
      setSendingEmail(true);
      const res = await ticketService.enviarReporteDiarioEmail(fecha);
      showAlert(
        `¡Reporte diario despachado exitosamente! (${res.destinatarios?.length || 0} correos enviados)`
      );
    } catch (err: any) {
      showAlert('Error al enviar reporte diario: ' + (err.message || 'Error desconocido'));
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="inventario-view animate-fade">
      {/* Header */}
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Reporte Diario de Tickets</h1>
          <p className="text-muted">
            Resumen ejecutivo del día por técnico especialista con desglose de solicitudes N1, incidencias N2/N3, bitácora y cumplimiento de SLA.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleEnviarEmail}
            disabled={sendingEmail || loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            {sendingEmail ? 'Enviando...' : 'Enviar por Correo'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDescargarExcel}
            disabled={downloading || loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#10b981',
              borderColor: '#10b981'
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            {downloading ? 'Generando Excel...' : 'Descargar Excel (.xlsx)'}
          </button>
        </div>
      </div>

      {/* Control / Date Selector Card */}
      <div
        className="filters-card glass-panel"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-main)' }}>
            Fecha de Corte:
          </label>
          <input
            type="date"
            className="form-control"
            style={{ width: '170px', padding: '6px 12px', fontSize: '13px' }}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchReporte(fecha)}
            style={{ padding: '7px 14px', fontSize: '12.5px' }}
          >
            Actualizar Corte
          </button>
        </div>

        {data && (
          <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
            Hora del corte: <strong>{data.hora_generacion || '18:00'} (Ecuador - UTC-5)</strong>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="spinner" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)"></circle>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path>
            </svg>
          </div>
          <p className="text-muted" style={{ marginTop: '12px' }}>Cargando resumen diario de soporte...</p>
        </div>
      ) : data ? (
        <>
          {/* Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '4px solid #6366f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Total Tickets
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#6366f1', marginTop: '4px' }}>
                {data.total_tickets_dia}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '4px solid #0284c7' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Solicitudes N1
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#0284c7', marginTop: '4px' }}>
                {data.total_solicitudes_n1}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Incidencias N2+
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>
                {data.total_incidencias}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Resueltos / Cerrados
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>
                {data.total_resueltos_hoy + data.total_cerrados_hoy}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '4px solid #d97706' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Abiertos Pendientes
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>
                {data.total_abiertos}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '4px solid #0d9488' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                % Cumplimiento SLA
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#0d9488', marginTop: '4px' }}>
                {data.cumplimiento_sla_porcentaje}%
              </div>
            </div>
          </div>

          {/* Specialists Performance Table */}
          <div className="table-wrapper glass-panel" style={{ marginBottom: '24px' }}>
            <table className="inventario-table">
              <thead>
                <tr>
                  <th>Técnico / Especialista</th>
                  <th style={{ textAlign: 'center' }}>Nivel de Soporte</th>
                  <th style={{ textAlign: 'center' }}>Total Gestión</th>
                  <th style={{ textAlign: 'center' }}>Sol. N1</th>
                  <th style={{ textAlign: 'center' }}>Inc. N2+</th>
                  <th style={{ textAlign: 'center' }}>Resueltos</th>
                  <th style={{ textAlign: 'center' }}>Abiertos</th>
                  <th style={{ textAlign: 'center' }}>SLA %</th>
                </tr>
              </thead>
              <tbody>
                {data.tecnicos.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                      No se registraron atenciones o tickets para la fecha seleccionada ({fecha}).
                    </td>
                  </tr>
                ) : (
                  data.tecnicos.map((t: any, idx: number) => {
                    const totalSla = t.sla_cumplidos + t.sla_vencidos;
                    const slaPct = totalSla > 0 ? `${Math.round((t.sla_cumplidos / totalSla) * 100)}%` : '100%';
                    const isSelected = selectedTecId === t.tecnico_id;
                    return (
                      <tr 
                        key={idx} 
                        className={`table-row-hover ${isSelected ? 'active-row' : ''}`}
                        onClick={() => setSelectedTecId(isSelected ? null : t.tecnico_id)}
                        style={{ cursor: 'pointer', background: isSelected ? 'rgba(37, 99, 235, 0.08)' : undefined }}
                        title="Haz clic para ver el desglose detallado de tickets de este técnico"
                      >
                        <td style={{ fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            {isSelected ? '▼' : '►'}
                          </span>
                          {t.nombre_completo}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="badge"
                            style={{
                              background: t.tecnico_id === 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                              color: t.tecnico_id === 0 ? '#ef4444' : '#6366f1',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '11px'
                            }}
                          >
                            {t.nivel_soporte}
                            {t.grupo_n2 ? ` (${t.grupo_n2})` : ''}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '800', color: '#2563eb' }}>
                          {t.total_gestionados}
                        </td>
                        <td style={{ textAlign: 'center', color: '#0284c7', fontWeight: '600' }}>
                          {t.solicitudes_n1}
                        </td>
                        <td style={{ textAlign: 'center', color: '#7c3aed', fontWeight: '600' }}>
                          {t.incidencias_n2_n3}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '700', color: '#10b981' }}>
                          {t.resueltos_hoy + t.cerrados_hoy}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '700', color: '#d97706' }}>
                          {t.abiertos_pendientes}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '700', color: '#0d9488' }}>
                          {slaPct}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Detailed Tickets Drawer / Card when a technician is selected */}
          {selectedTec && (
            <div className="table-wrapper glass-panel animate-fade" style={{ marginBottom: '24px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--color-text-main)' }}>
                    Detalle de Tickets: {selectedTec.nombre_completo}
                  </h3>
                  <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '12.5px' }}>
                    Mostrando {selectedTec.tickets.length} ticket(s) gestionados / abiertos asignados a este especialista.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedTecId(null)}
                >
                  Cerrar Detalle ✕
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="inventario-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tipo</th>
                      <th>Asunto / Requerimiento</th>
                      <th>Empresa / Sucursal</th>
                      <th>Solicitante</th>
                      <th style={{ textAlign: 'center' }}>Estado</th>
                      <th style={{ textAlign: 'center' }}>Fecha Creación</th>
                      <th style={{ textAlign: 'center' }}>SLA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTec.tickets.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>
                          No hay tickets asignados a este especialista en este corte.
                        </td>
                      </tr>
                    ) : (
                      selectedTec.tickets.map((tk: any) => {
                        const isSlaVencido = tk.sla_estado_str.includes('Vencido');
                        const isEnRiesgo = tk.sla_estado_str.includes('Riesgo');
                        return (
                          <tr key={tk.id}>
                            <td style={{ fontWeight: '700', color: '#2563eb' }}>#{tk.id}</td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: tk.tipo_itil === 'Solicitud' ? 'rgba(2, 132, 199, 0.12)' : 'rgba(124, 58, 237, 0.12)',
                                  color: tk.tipo_itil === 'Solicitud' ? '#0284c7' : '#7c3aed',
                                  fontSize: '11px'
                                }}
                              >
                                {tk.tipo_itil}
                              </span>
                            </td>
                            <td style={{ maxWidth: '300px', fontWeight: '500' }}>
                              <div style={{ fontWeight: '600', color: 'var(--color-text-main)' }}>{tk.titulo}</div>
                              <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {tk.descripcion}
                              </div>
                            </td>
                            <td style={{ fontSize: '12px' }}>
                              <div>{tk.empresa_nombre}</div>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{tk.sucursal_nombre}</div>
                            </td>
                            <td style={{ fontSize: '12.5px' }}>{tk.solicitante}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                className="badge"
                                style={{
                                  background: tk.estado === 'Cerrado' || tk.estado === 'Resuelto' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                                  color: tk.estado === 'Cerrado' || tk.estado === 'Resuelto' ? '#10b981' : '#d97706',
                                  fontSize: '11.5px',
                                  fontWeight: '700'
                                }}
                              >
                                {tk.estado}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', fontSize: '12px' }}>
                              {tk.created_at}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                className="badge"
                                style={{
                                  background: tk.sla_estado_str.includes('N3') || tk.sla_estado_str.includes('Sin SLA')
                                    ? 'rgba(139, 92, 246, 0.12)'
                                    : isSlaVencido 
                                    ? 'rgba(239, 68, 68, 0.12)' 
                                    : isEnRiesgo 
                                    ? 'rgba(245, 158, 11, 0.12)' 
                                    : 'rgba(16, 185, 129, 0.12)',
                                  color: tk.sla_estado_str.includes('N3') || tk.sla_estado_str.includes('Sin SLA')
                                    ? '#8b5cf6'
                                    : isSlaVencido 
                                    ? '#ef4444' 
                                    : isEnRiesgo 
                                    ? '#d97706' 
                                    : '#10b981',
                                  fontSize: '11px',
                                  fontWeight: '700'
                                }}
                              >
                                {tk.sla_estado_str}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Information Card */}
          <div
            className="filters-card glass-panel"
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0284c7" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span style={{ fontSize: '13px', color: 'var(--color-text-dim)' }}>
              <strong>Estructura del archivo Excel descargable:</strong> La primera hoja incluye la matriz y métricas ejecutivas consolidadas. Cada técnico cuenta con una hoja independiente con el detalle de tickets, bitácora de soporte y trazabilidad de atención. Haz clic sobre cualquier fila de la tabla para ver sus tickets detallados.
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
};
