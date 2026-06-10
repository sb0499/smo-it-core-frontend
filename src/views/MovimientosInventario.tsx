import { showAlert, showConfirm } from '../utils/alerts';
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
      showAlert(`Error al descargar PDF: ${err.message}`);
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
        <button className="btn btn-secondary" onClick={fetchMovimientos} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          Recargar Registro
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
          <div className="spinner" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
          </div>
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

                        {m.persona_recibe_nombre && (
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleDownloadPDF(m)}
                            disabled={downloadingId === m.id}
                          >
                            {downloadingId === m.id ? (
                              'Descargando...'
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                Descargar PDF
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                              </span>
                            )}
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

    </div>
  );
};
