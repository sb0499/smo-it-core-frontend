import React, { useState, useEffect } from 'react';
import { areaService, Area } from '../services/area.service';
import { showAlert, showConfirm } from '../utils/alerts';
import './Inventario.css';

export const Areas: React.FC = () => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAreas(page, search);
  }, [page, search, limit]);

  const fetchAreas = async (targetPage = page, searchTerm = search) => {
    setLoading(true);
    setError(null);
    try {
      const res = await areaService.getAreas({
        page: targetPage,
        limit,
        search: searchTerm
      });
      setAreas(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotalRecords(res.total || 0);
    } catch (err: any) {
      console.error('Error al cargar áreas:', err);
      setError(err.message || 'Error al cargar áreas solicitantes');
      setAreas([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setNombre('');
    setDescripcion('');
    setIsActive(true);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (a: Area) => {
    setIsEditing(true);
    setEditingId(a.id);
    setNombre(a.nombre);
    setDescripcion(a.descripcion || '');
    setIsActive(Boolean(a.is_active));
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Por favor ingresa el nombre del área.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      is_active: isActive
    };

    try {
      if (isEditing && editingId) {
        await areaService.updateArea(editingId, payload);
      } else {
        await areaService.createArea(payload);
      }
      setShowModal(false);
      fetchAreas(page, search);
      showAlert(isEditing ? 'Área actualizada exitosamente.' : 'Área creada exitosamente.');
    } catch (err: any) {
      setError(err.message || 'Error al guardar el área.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (a: Area) => {
    const nextStatus = !a.is_active;
    const actionLabel = nextStatus ? 'activar' : 'desactivar';
    if (!await showConfirm(`¿Deseas ${actionLabel} el área "${a.nombre}"?`)) return;

    try {
      await areaService.updateArea(a.id, { is_active: nextStatus });
      fetchAreas(page, search);
      showAlert(`Área ${nextStatus ? 'activada' : 'desactivada'} exitosamente.`);
    } catch (err: any) {
      showAlert('Error al actualizar el área: ' + err.message);
    }
  };

  const handleDelete = async (a: Area) => {
    if (!await showConfirm(`¿Estás seguro de eliminar el área "${a.nombre}"? Los tickets existentes mantendrán el registro histórico.`)) return;

    try {
      await areaService.deleteArea(a.id);
      fetchAreas(page, search);
      showAlert('Área procesada exitosamente.');
    } catch (err: any) {
      showAlert('Error al eliminar área: ' + err.message);
    }
  };

  return (
    <div className="inventario-view animate-fade">
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Áreas Solicitantes</h1>
          <p className="text-muted">Administración del catálogo de departamentos y áreas solicitantes para tickets de soporte técnico</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nueva Área
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-card glass-panel" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre o descripción de área..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ paddingLeft: '40px', width: '100%' }}
          />
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-dim)' }}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <button className="btn btn-secondary" onClick={() => fetchAreas(page, search)}>
          Actualizar
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="spinner" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)"></circle>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path>
            </svg>
          </div>
          <p className="text-muted" style={{ marginTop: '12px' }}>Cargando áreas solicitantes...</p>
        </div>
      ) : areas.length === 0 ? (
        <div className="glass-panel text-center py-5" style={{ padding: '40px' }}>
          <h3>No se encontraron áreas</h3>
          <p className="text-muted">Crea una nueva área para asignarla a los tickets de soporte.</p>
        </div>
      ) : (
        <div className="table-wrapper glass-panel">
          <table className="inventario-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Nombre del Área</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Fecha Registro</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.id} className="table-row-hover">
                  <td style={{ fontWeight: '600' }}>#{a.id}</td>
                  <td style={{ fontWeight: '700', fontSize: '15px' }}>{a.nombre}</td>
                  <td className="text-muted" style={{ fontSize: '13px' }}>
                    {a.descripcion || '-'}
                  </td>
                  <td>
                    {a.is_active ? (
                      <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        Activa
                      </span>
                    ) : (
                      <span className="badge badge-secondary" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="text-muted" style={{ fontSize: '13px' }}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => handleToggleStatus(a)}
                        title={a.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {a.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px' }}
                        onClick={() => openEditModal(a)}
                        title="Editar Área"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
                        </svg>
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        onClick={() => handleDelete(a)}
                        title="Eliminar Área"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && areas.length > 0 && (
        <div
          className="pagination-card glass-panel"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            marginTop: "16px",
            borderRadius: "10px",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", color: "var(--color-text-dim)" }}>
              Mostrar
            </span>
            <select
              className="form-control"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={{ width: "70px", padding: "4px 8px", fontSize: "13px" }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span style={{ fontSize: "13px", color: "var(--color-text-dim)" }}>
              registros por página (Total: {totalRecords})
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              Anterior
            </button>
            <span style={{ fontSize: "13px", fontWeight: "600", padding: "0 6px" }}>
              Página {page} de {totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar */}
      {showModal && (
        <div
          className="modal-backdrop animate-fade"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            className="glass-panel animate-slide-up"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '28px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{isEditing ? 'Editar Área Solicitante' : 'Nueva Área Solicitante'}</h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  fontSize: '22px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            {error && (
              <div
                className="login-error-alert"
                style={{
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  borderRadius: '8px',
                  padding: '10px 14px'
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span className="alert-text" style={{ color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group">
                <label className="form-label">NOMBRE DEL ÁREA *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Contabilidad, Gerencia, Caja 3, etc."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={submitting}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">DESCRIPCIÓN (OPCIONAL)</label>
                <textarea
                  className="form-control"
                  placeholder="Detalle o funciones principales del departamento..."
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">ESTADO DEL ÁREA</label>
                <select
                  className="form-control"
                  value={isActive ? '1' : '0'}
                  onChange={(e) => setIsActive(e.target.value === '1')}
                  disabled={submitting}
                >
                  <option value="1">Activa (Disponible para tickets)</option>
                  <option value="0">Inactiva (Oculta en nuevos tickets)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  {submitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Área'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
