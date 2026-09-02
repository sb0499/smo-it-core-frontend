import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
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
  
  // Search, filter & pagination
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchMovimientos();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, tipoFilter]);

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

  const filteredMovimientos = movimientos.filter(m => {
    const matchesSearch = 
      m.activo_codigo.toLowerCase().includes(search.toLowerCase()) ||
      m.activo_marca.toLowerCase().includes(search.toLowerCase()) ||
      m.activo_modelo.toLowerCase().includes(search.toLowerCase()) ||
      (m.persona_recibe_nombre && m.persona_recibe_nombre.toLowerCase().includes(search.toLowerCase())) ||
      (m.persona_entrega_nombre && m.persona_entrega_nombre.toLowerCase().includes(search.toLowerCase())) ||
      m.usuario_nombre.toLowerCase().includes(search.toLowerCase()) ||
      (m.observaciones && m.observaciones.toLowerCase().includes(search.toLowerCase()));

    const matchesTipo = tipoFilter ? m.tipo === tipoFilter : true;

    return matchesSearch && matchesTipo;
  });

  const totalPages = Math.ceil(filteredMovimientos.length / pageSize) || 1;
  const paginatedMovimientos = filteredMovimientos.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="inventario-view animate-fade">
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Historial de Movimientos de Inventario</h1>
          <p className="text-muted">Bitácora de movimientos y cambios de custodia de activos TI</p>
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
          <p className="text-muted">Cargando bitácora de inventarios...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchMovimientos} style={{ marginTop: '12px' }}>Reintentar</button>
        </div>
      ) : (
        <>
          <div className="table-wrapper glass-panel">
            <table className="inventario-table">
              <thead>
                <tr>
                  <th>FECHA Y HORA</th>
                  <th>CÓDIGO ACTIVO</th>
                  <th>EQUIPO / ACTIVO</th>
                  <th>TIPO OPERACIÓN</th>
                  <th>EMISOR</th>
                  <th>RECEPTOR</th>
                  <th>OBSERVACIONES</th>
                  <th>AUTORIZADO POR</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMovimientos.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-dim)' }}>
                      No se registraron movimientos de inventario con los criterios indicados.
                    </td>
                  </tr>
                ) : (
                  paginatedMovimientos.map((m) => (
                    <tr key={m.id} className="table-row-hover">
                      <td>{new Date(m.fecha).toLocaleString()}</td>
                      <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{m.activo_codigo}</td>
                      <td>{m.activo_marca} {m.activo_modelo}</td>
                      <td>
                        <span className={`badge ${
                          m.tipo === 'Asignación' ? 'badge-done' :
                          m.tipo === 'Transferencia' ? 'badge-process' :
                          m.tipo === 'Devolución' ? 'badge-media' : 'badge-baja'
                        }`} style={{ fontSize: '11px' }}>
                          {m.tipo}
                        </span>
                      </td>
                      <td className="text-dim">{m.persona_entrega_nombre || 'Bodega IT'}</td>
                      <td>{m.persona_recibe_nombre || 'Bodega / IT Control'}</td>
                      <td style={{ maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.observaciones || '-'}
                      </td>
                      <td className="text-muted">{m.usuario_nombre}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px' }}>
              <span className="text-muted font-xs">
                Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, filteredMovimientos.length)} de {filteredMovimientos.length} movimientos
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </button>
                <span style={{ padding: '4px 12px', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                  Página {page} de {totalPages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
