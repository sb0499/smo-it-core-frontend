import React, { useState, useEffect } from 'react';
import { inventoryService, Bodega } from '../services/inventory.service';
import { apiClient } from '../services/api';
import { showAlert, showConfirm } from '../utils/alerts';
import './Inventario.css';

interface Empresa {
  id: number;
  nombre: string;
}

export const Bodegas: React.FC = () => {
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSedeFilter, setSelectedSedeFilter] = useState<number>(0);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [nombre, setNombre] = useState('');
  const [empresaId, setEmpresaId] = useState<number>(0);
  const [descripcion, setDescripcion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load empresas once on mount
  useEffect(() => {
    console.log('[Bodegas] Cargando empresas...');
    apiClient.get<Empresa[]>('/empresas')
      .then(res => {
        console.log('[Bodegas] Empresas obtenidas:', res);
        setEmpresas(Array.isArray(res) ? res : []);
      })
      .catch(err => {
        console.error('[Bodegas] Error al cargar empresas:', err);
        setEmpresas([]);
      });
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch paginated bodegas whenever page, limit, filter, or search changes
  useEffect(() => {
    fetchData();
  }, [page, limit, selectedSedeFilter, debouncedSearch]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log(`[Bodegas] Consultando bodegas - page: ${page}, limit: ${limit}, sedeFilter: ${selectedSedeFilter}, search: "${debouncedSearch}"`);
      const result = await inventoryService.getBodegas(
        page, 
        limit, 
        debouncedSearch, 
        selectedSedeFilter > 0 ? selectedSedeFilter : undefined
      );
      console.log('[Bodegas] Respuesta recibida:', result);
      const dataArr = Array.isArray(result?.data) ? result.data : (Array.isArray(result) ? result : []);
      setBodegas(dataArr);
      setTotal(result?.total || dataArr.length || 0);
    } catch (err: any) {
      console.error('[Bodegas] Error al cargar bodegas:', err);
      setBodegas([]);
      setError(err.message || 'Error al cargar los datos de bodegas.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setNombre('');
    setEmpresaId(empresas.length > 0 ? empresas[0].id : 0);
    setDescripcion('');
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (b: Bodega) => {
    setIsEditing(true);
    setEditingId(b.id);
    setNombre(b.nombre);
    setEmpresaId(b.empresa_id);
    setDescripcion(b.descripcion || '');
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre) {
      setError('Por favor, ingresa el nombre de la bodega.');
      return;
    }
    if (!empresaId || empresaId <= 0) {
      setError('Por favor, selecciona una sede/ubicación.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const payload = {
      nombre,
      empresa_id: Number(empresaId),
      descripcion: descripcion || null
    };

    try {
      if (isEditing && editingId) {
        await inventoryService.updateBodega(editingId, payload);
      } else {
        await inventoryService.createBodega(payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la bodega.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const confirmed = await showConfirm(`¿Estás seguro de que deseas eliminar la bodega "${name}"?`);
    if (!confirmed) return;

    try {
      await inventoryService.deleteBodega(id);
      fetchData();
    } catch (err: any) {
      showAlert('Error al eliminar bodega: ' + (err.message || err));
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="inventario-view animate-fade">
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Bodegas de Inventario TI</h1>
          <p className="text-muted">Administra los espacios físicos de almacenamiento y stock de activos por sede</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nueva Bodega
        </button>
      </div>

      {/* Filter and Search Section */}
      <div className="filters-card glass-panel" style={{ padding: '16px', marginBottom: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 2, minWidth: '240px', position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre o descripción de la bodega..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px', width: '100%' }}
          />
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-dim)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>

        <div style={{ flex: 1, minWidth: '180px' }}>
          <select
            className="form-control"
            value={selectedSedeFilter}
            onChange={(e) => {
              setSelectedSedeFilter(Number(e.target.value));
              setPage(1);
            }}
            style={{ width: '100%' }}
          >
            <option value="0">Todas las Sedes</option>
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.nombre}</option>
            ))}
          </select>
        </div>

        <button className="btn btn-secondary" onClick={fetchData}>
          Actualizar
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="spinner" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
          </div>
          <p className="text-muted" style={{ marginTop: '12px' }}>Cargando bodegas...</p>
        </div>
      ) : error && !showModal ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchData} style={{ marginTop: '12px' }}>Reintentar</button>
        </div>
      ) : (
        <>
          <div className="table-wrapper glass-panel">
            <table className="inventario-table">
              <thead>
                <tr>
                  <th>Bodega</th>
                  <th>Sede / Ubicación</th>
                  <th>Descripción</th>
                  <th>Fecha Registro</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {bodegas.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-dim)' }}>
                      No se encontraron bodegas de almacenamiento registradas.
                    </td>
                  </tr>
                ) : (
                  bodegas.map((b) => (
                    <tr key={b.id} className="table-row-hover animate-slide-up">
                      <td style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{b.nombre}</td>
                      <td style={{ fontWeight: '500' }}>
                        <span className="holder-badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '3px 8px', borderRadius: '4px', fontSize: '11.5px' }}>
                          {b.empresa_nombre || 'N/A'}
                        </span>
                      </td>
                      <td className="text-muted" style={{ fontSize: '13px' }}>{b.descripcion || '—'}</td>
                      <td className="text-muted" style={{ fontSize: '13px' }}>
                        {b.created_at ? new Date(b.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button className="btn btn-secondary" style={{ padding: '5px 7px' }} onClick={() => openEditModal(b)} title="Editar">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
                          </button>
                          <button className="btn btn-danger" style={{ padding: '5px 7px' }} onClick={() => handleDelete(b.id, b.nombre)} title="Eliminar">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {bodegas.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px' }}>
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
                Página {page} de {totalPages} ({total} registros)
              </span>
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                style={{ cursor: page >= totalPages ? 'not-allowed' : 'pointer', padding: '6px 12px', fontSize: '12px' }}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Overlay */}
      {showModal && (
        <div className="modal-backdrop animate-fade" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '460px', padding: '28px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{isEditing ? 'Editar Bodega TI' : 'Registrar Nueva Bodega'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            
            {error && (
              <div className="login-error-alert" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '10px 14px' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span className="alert-text" style={{ color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nombre de Bodega *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Bodega de Repuestos, Rack Principal"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sede / Ubicación *</label>
                <select
                  className="form-control"
                  value={empresaId}
                  onChange={(e) => setEmpresaId(Number(e.target.value))}
                  required
                >
                  <option value="0">Seleccionar sede...</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-control"
                  placeholder="Ej. Piso 3, sección TI. Almacén de laptops y cargadores..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
                  {submitting ? 'Guardando...' : 'Guardar Bodega'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
