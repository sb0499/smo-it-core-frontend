import React, { useState, useEffect } from 'react';
import { apiClient, API_BASE_URL } from '../services/api';
import './Inventario.css';

interface Movimiento {
  id: number;
  activo_id: number;
  desde_persona_id: number | null;
  hacia_persona_id: number | null;
  usuario_id: number;
  tipo: string;
  fecha: string;
  observaciones: string;
  persona_entrega_nombre: string | null;
  persona_entrega_cedula: string | null;
  persona_recibe_nombre: string | null;
  persona_recibe_cedula: string | null;
  activo_codigo: string;
  activo_marca: string;
  activo_modelo: string;
  usuario_nombre: string;
}

export const MovimientosInventario: React.FC = () => {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');

  // Selected movement for digitalized receipt/signature view modal
  const [selectedMov, setSelectedMov] = useState<Movimiento | null>(null);

  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    fetchMovimientos();
  }, []);

  const fetchMovimientos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Movimiento[]>('/inventarios/movimientos/global');
      setMovimientos(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los movimientos de inventario.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (mov: Movimiento) => {
    setDownloadingId(mov.id);
    try {
      const token = localStorage.getItem('smo_token');
      const response = await fetch(`${API_BASE_URL}/inventarios/movimientos/${mov.id}/acta`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('No se pudo generar el acta PDF para este tipo de movimiento.');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Acta_${mov.activo_codigo}_${mov.persona_recibe_cedula || 'Bodega'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error al descargar PDF: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredMovimientos = movimientos.filter(m => {
    const matchesSearch = 
      m.activo_codigo.toLowerCase().includes(search.toLowerCase()) ||
      m.activo_marca.toLowerCase().includes(search.toLowerCase()) ||
      m.activo_modelo.toLowerCase().includes(search.toLowerCase()) ||
      (m.persona_recibe_nombre && m.persona_recibe_nombre.toLowerCase().includes(search.toLowerCase())) ||
      (m.persona_entrega_nombre && m.persona_entrega_nombre.toLowerCase().includes(search.toLowerCase())) ||
      m.usuario_nombre.toLowerCase().includes(search.toLowerCase());

    const matchesTipo = tipoFilter ? m.tipo === tipoFilter : true;

    return matchesSearch && matchesTipo;
  });

  return (
    <div className="inventario-view animate-fade">
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Historial de Movimientos de Inventario</h1>
          <p className="text-muted">Registro de asignaciones, transferencias y actas de entrega firmadas digitalmente</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchMovimientos}>
          ⚙️ Recargar Registro
        </button>
      </div>

      {/* Filter Options */}
      <div className="filters-card glass-panel" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por activo, receptor, emisor, autorizado por..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px', width: '100%' }}
          />
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-dim)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>

        <div style={{ width: '200px' }}>
          <select
            className="form-control"
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
          >
            <option value="">Todos los tipos...</option>
            <option value="Asignación">Asignación</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Devolución">Devolución</option>
            <option value="Cambio de Estado">Cambio de Estado</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="spinner" style={{ fontSize: '32px' }}>⏳</div>
          <p className="text-muted" style={{ marginTop: '12px' }}>Cargando bitácora de inventarios...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchMovimientos} style={{ marginTop: '12px' }}>Reintentar</button>
        </div>
      ) : (
        <div className="table-wrapper glass-panel">
          <table className="inventario-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Código Activo</th>
                <th>Equipo / Activo</th>
                <th>Tipo Operación</th>
                <th>Emisor</th>
                <th>Receptor</th>
                <th>Autorizado Por</th>
                <th style={{ textAlign: 'right' }}>Documentos / Firmas</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovimientos.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-dim)' }}>
                    No se registraron movimientos de inventario con los criterios indicados.
                  </td>
                </tr>
              ) : (
                filteredMovimientos.map((m) => (
                  <tr key={m.id} className="table-row-hover">
                    <td>{new Date(m.fecha).toLocaleString()}</td>
                    <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{m.activo_codigo}</td>
                    <td>{m.activo_marca} {m.activo_modelo}</td>
                    <td>
                      <span className={`badge ${
                        m.tipo === 'Asignación' ? 'badge-done' :
                        m.tipo === 'Transferencia' ? 'badge-process' :
                        m.tipo === 'Devolución' ? 'badge-media' : 'badge-baja'
                      }`} style={{ fontSize: '10px' }}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="text-dim">{m.persona_entrega_nombre || 'Bodega IT'}</td>
                    <td>{m.persona_recibe_nombre || 'Bodega / IT Control'}</td>
                    <td className="text-muted">{m.usuario_nombre}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => setSelectedMov(m)}
                        >
                          👁️ Ver Acta
                        </button>
                        {m.persona_recibe_nombre && (
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleDownloadPDF(m)}
                            disabled={downloadingId === m.id}
                          >
                            {downloadingId === m.id ? 'Descargando...' : 'Descargar PDF 📄'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal View for Digitalized Acta & Signatures */}
      {selectedMov && (
        <div className="modal-backdrop animate-fade" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '650px', padding: '32px', background: '#fff', color: '#1f2937', border: '1px solid #d1d5db', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {/* Institution header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #3b82f6', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1e3a8a', fontSize: '22px', fontWeight: 'bold' }}>SMO IT CORE</h2>
                <p style={{ margin: '2px 0 0 0', color: '#4b5563', fontSize: '12px', letterSpacing: '0.5px' }}>SHOPPING MANAGEMENTS OPERADORA</p>
                <p style={{ margin: '2px 0 0 0', color: '#9ca3af', fontSize: '11px' }}>DEPARTAMENTO DE TECNOLOGÍA E INFORMACIÓN</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '4px 10px', borderRadius: '4px' }}>
                  ACTA Nº {selectedMov.id.toString().padStart(5, '0')}
                </span>
                <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#6b7280' }}>
                  Fecha: {new Date(selectedMov.fecha).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Document Title */}
            <h3 style={{ textAlign: 'center', color: '#111827', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '16px' }}>
              ACTA DE ENTREGA - RECEPCIÓN DE EQUIPOS Y ACTIVOS
            </h3>

            {/* Description Paragraph */}
            <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#374151', marginBottom: '20px' }}>
              Por medio del presente documento, se deja constancia de la entrega física y configuración del activo detallado a continuación, bajo las condiciones y observaciones registradas. El receptor asume la responsabilidad del cuidado y uso exclusivo institucional del bien.
            </p>

            {/* Assets details table */}
            <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e5e7eb' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '700', color: '#1f2937' }}>DETALLES DEL ACTIVO</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 20px', fontSize: '12px' }}>
                <div><strong>CÓDIGO DE ACTIVO:</strong> <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{selectedMov.activo_codigo}</span></div>
                <div><strong>TIPO DE MOVIMIENTO:</strong> {selectedMov.tipo}</div>
                <div><strong>MARCA Y MODELO:</strong> {selectedMov.activo_marca} {selectedMov.activo_modelo}</div>
                <div><strong>AUTORIZADO POR:</strong> {selectedMov.usuario_nombre}</div>
              </div>
              
              <div style={{ marginTop: '12px', borderTop: '1px dashed #d1d5db', paddingTop: '8px', fontSize: '12px' }}>
                <strong>OBSERVACIONES:</strong>
                <p style={{ margin: '4px 0 0 0', italic: 'true', color: '#4b5563' }}>
                  {selectedMov.observaciones || 'Sin observaciones específicas. Se entrega en perfecto estado funcional.'}
                </p>
              </div>
            </div>

            {/* Signatures block */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', marginTop: '30px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
              {/* Deliverer (Emisor) */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', marginBottom: '15px' }}>ENTREGADO / AUTORIZADO POR</p>
                
                {/* Simulated signature image */}
                <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', borderBottom: '1px solid #9ca3af', width: '80%', position: 'relative' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '16px', color: '#4b5563', letterSpacing: '-1px', transform: 'rotate(-5deg)' }}>
                    SMO_IT_SECURE_AUTH
                  </span>
                  <div style={{ position: 'absolute', bottom: '2px', right: '10px', fontSize: '8px', color: '#10b981' }}>✓ Firma Digitalizada</div>
                </div>

                <p style={{ margin: 0, fontSize: '12px', fontWeight: '600' }}>{selectedMov.usuario_nombre}</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#6b7280' }}>Soporte Técnico SMO IT CORE</p>
              </div>

              {/* Receiver (Receptor) */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', marginBottom: '15px' }}>RECIBIDO CONFORME POR</p>
                
                {/* Simulated signature image */}
                <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', borderBottom: '1px solid #9ca3af', width: '80%', position: 'relative' }}>
                  {selectedMov.persona_recibe_nombre ? (
                    <>
                      <span style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e3a8a', fontStyle: 'italic', transform: 'rotate(-3deg)' }}>
                        {selectedMov.persona_recibe_nombre.split(' ').slice(0,2).join(' ')}
                      </span>
                      <div style={{ position: 'absolute', bottom: '2px', right: '10px', fontSize: '8px', color: '#10b981' }}>✓ OTP Sign Verified</div>
                    </>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>N/A (Bodega)</span>
                  )}
                </div>

                <p style={{ margin: 0, fontSize: '12px', fontWeight: '600' }}>{selectedMov.persona_recibe_nombre || 'Bodega Central'}</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#6b7280' }}>
                  {selectedMov.persona_recibe_cedula ? `C.I. ${selectedMov.persona_recibe_cedula}` : 'Soporte Inventario'}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '30px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ background: '#e5e7eb', color: '#374151', border: '1px solid #d1d5db' }} 
                onClick={() => setSelectedMov(null)}
              >
                Cerrar Acta
              </button>
              {selectedMov.persona_recibe_nombre && (
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => {
                    handleDownloadPDF(selectedMov);
                    setSelectedMov(null);
                  }}
                  disabled={downloadingId === selectedMov.id}
                >
                  {downloadingId === selectedMov.id ? 'Descargando...' : 'Descargar Impresión PDF'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
