import { showAlert, showConfirm } from '../utils/alerts';
import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { recurrenciaService, SoporteRecurrente } from '../services/recurrencia.service';
import { ticketService } from '../services/ticket.service';
import './Inventario.css';

interface Empresa {
  id: number;
  nombre: string;
}

export const SoportesRecurrentes: React.FC = () => {
  const [soportes, setSoportes] = useState<SoporteRecurrente[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [categoriesList, setCategoriesList] = useState<{ id: number; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros y búsqueda
  const [search, setSearch] = useState('');

  // Estados de modal y formulario
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [empresaId, setEmpresaId] = useState<number>(0);
  const [areaSolicitante, setAreaSolicitante] = useState('');
  const [personaSolicitante, setPersonaSolicitante] = useState('');
  const [prioridad, setPrioridad] = useState<'Baja' | 'Media' | 'Alta' | 'Critica'>('Media');
  const [frecuencia, setFrecuencia] = useState<'Diario' | 'Semanal' | 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual'>('Mensual');
  const [fechaInicio, setFechaInicio] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalSoportes, setTotalSoportes] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const fetchSoportes = async (pageNumber = page, searchVal = debouncedSearch) => {
    setLoading(true);
    setError(null);
    try {
      const res = await recurrenciaService.getSoportesRecurrentes(pageNumber, 10, searchVal);
      setSoportes(res.data);
      setTotalSoportes(res.total);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los soportes recurrentes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = () => {
    fetchSoportes(page, debouncedSearch);
  };

  // Load static metadata once on mount
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [empresasData, catsData] = await Promise.all([
          apiClient.get<Empresa[]>('/empresas'),
          ticketService.getCategorias().catch(() => [])
        ]);
        setEmpresas(empresasData);
        setCategoriesList(catsData);
        if (empresasData.length > 0 && !empresaId) {
          setEmpresaId(empresasData[0].id);
        }
        if (catsData.length > 0 && !categoria) {
          setCategoria(catsData[0].nombre);
        }
      } catch (err: any) {
        console.error('Error loading metadata', err);
      }
    };
    loadMetadata();
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Fetch when page or search changes
  useEffect(() => {
    fetchSoportes(page, debouncedSearch);
  }, [page, debouncedSearch]);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitulo('');
    setDescripcion('');
    setCategoria(categoriesList[0]?.nombre || 'Sistemas');
    setEmpresaId(empresas[0]?.id || 0);
    setAreaSolicitante('');
    setPersonaSolicitante('Sistema de Mantenimiento');
    setPrioridad('Media');
    setFrecuencia('Mensual');
    // Default start date to today
    setFechaInicio(new Date().toISOString().split('T')[0]);
    setIsActive(true);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (s: SoporteRecurrente) => {
    setIsEditing(true);
    setEditingId(s.id);
    setTitulo(s.titulo);
    setDescripcion(s.descripcion);
    setCategoria(s.categoria);
    setEmpresaId(s.empresa_id || 0);
    setAreaSolicitante(s.area_solicitante || '');
    setPersonaSolicitante(s.persona_solicitante || '');
    setPrioridad(s.prioridad);
    setFrecuencia(s.frecuencia);
    setFechaInicio(s.fecha_inicio.split('T')[0]);
    setIsActive(!!s.is_active);
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !descripcion || !categoria || !frecuencia || !fechaInicio) {
      setError('Por favor, completa los campos requeridos.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      titulo,
      descripcion,
      categoria,
      empresa_id: empresaId > 0 ? empresaId : null,
      area_solicitante: areaSolicitante || null,
      persona_solicitante: personaSolicitante || null,
      prioridad,
      frecuencia,
      fecha_inicio: fechaInicio,
      is_active: isActive
    };

    try {
      if (isEditing && editingId) {
        await recurrenciaService.updateSoporteRecurrente(editingId, payload);
        showAlert('Soporte recurrente actualizado correctamente.');
      } else {
        await recurrenciaService.createSoporteRecurrente(payload);
        showAlert('Soporte recurrente registrado correctamente.');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el soporte recurrente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!await showConfirm('¿Estás seguro de eliminar esta programación recurrente? Se detendrá la generación de tickets automáticos.')) return;
    try {
      await recurrenciaService.deleteSoporteRecurrente(id);
      showAlert('Programación eliminada correctamente.');
      fetchData();
    } catch (err: any) {
      showAlert('Error al eliminar: ' + err.message);
    }
  };

  const filteredSoportes = soportes;

  return (
    <div className="inventario-view animate-fade">
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Soportes TI Recurrentes</h1>
          <p className="text-muted">Gestión de tareas de mantenimiento, revisiones e inspecciones periódicas programadas</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Programar Soporte
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="filters-card glass-panel" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por título, descripción, categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px', width: '100%' }}
          />
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-dim)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
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
          <p className="text-muted" style={{ marginTop: '12px' }}>Cargando programaciones recurrentes...</p>
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
                  <th>Título Tarea</th>
                  <th>CC / Centro Comercial</th>
                  <th>Área / Solicitante</th>
                  <th>Frecuencia</th>
                  <th>Próxima Ejecución</th>
                  <th>Última Ejecución</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSoportes.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-dim)' }}>
                      No se encontraron soportes recurrentes programados.
                    </td>
                  </tr>
                ) : (
                  filteredSoportes.map((s) => (
                    <tr key={s.id} className="table-row-hover">
                      <td>
                        <div style={{ fontWeight: '600' }}>{s.titulo}</div>
                        <div className="text-muted" style={{ fontSize: '11px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.descripcion}</div>
                      </td>
                      <td>
                        <span className="badge badge-process" style={{ fontSize: '10px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                          {s.empresa_nombre || 'Todas las Sedes'}
                        </span>
                      </td>
                      <td>{s.area_solicitante || 'TI'}</td>
                      <td>
                        <span className="badge badge-media" style={{ fontSize: '10px' }}>
                          {s.frecuencia}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
                        {new Date(s.siguiente_ejecucion).toLocaleDateString()}
                      </td>
                      <td>
                        {s.ultima_ejecucion ? new Date(s.ultima_ejecucion).toLocaleDateString() : 'Nunca'}
                      </td>
                      <td>
                        <span className={`badge ${s.is_active ? 'badge-done' : 'badge-baja'}`} style={{ fontSize: '10px' }}>
                          {s.is_active ? 'Activo' : 'Pausado'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary" style={{ padding: '5px 7px' }} onClick={() => openEditModal(s)} title="Editar">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
                          </button>
                          <button className="btn btn-danger" style={{ padding: '5px 7px', border: '1px solid #fee2e2', color: '#c53030' }} onClick={() => handleDelete(s.id)} title="Eliminar">
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
          {totalSoportes > 10 && (
            <div className="pagination-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px', padding: '10px 0' }}>
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                style={{ cursor: page === 1 ? 'not-allowed' : 'pointer', padding: '6px 12px', fontSize: '12px' }}
              >
                Anterior
              </button>
              <span style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: '500' }}>
                Página {page} de {Math.ceil(totalSoportes / 10)} ({totalSoportes} registros)
              </span>
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page === Math.ceil(totalSoportes / 10)}
                onClick={() => setPage(page + 1)}
                style={{ cursor: page === Math.ceil(totalSoportes / 10) ? 'not-allowed' : 'pointer', padding: '6px 12px', fontSize: '12px' }}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de Creación / Edición */}
      {showModal && (
        <div className="modal-backdrop animate-fade" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '580px', padding: '28px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{isEditing ? 'Editar Programación de Soporte' : 'Nueva Programación Recurrente'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            {error && (
              <div className="login-error-alert" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '10px 14px' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span style={{ color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">TÍTULO DEL SOPORTE RECURRENTE</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Mantenimiento Preventivo de Cámaras"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">DESCRIPCIÓN DE LA TAREA PROGRAMADA</label>
                <textarea
                  className="form-control"
                  placeholder="Describe qué se debe hacer en esta tarea técnica..."
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">CATEGORÍA</label>
                  <select
                    className="form-control"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    disabled={submitting}
                  >
                    {categoriesList.map(c => (
                      <option key={c.id} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">CENTRO COMERCIAL (CC)</label>
                  <select
                    className="form-control"
                    value={empresaId}
                    onChange={(e) => setEmpresaId(Number(e.target.value))}
                    disabled={submitting}
                  >
                    {empresas.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">ÁREA SOLICITANTE</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Administración, Pasillos, etc."
                    value={areaSolicitante}
                    onChange={(e) => setAreaSolicitante(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SOLICITANTE REF.</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Mantenimiento de Planta"
                    value={personaSolicitante}
                    onChange={(e) => setPersonaSolicitante(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">PRIORIDAD</label>
                  <select
                    className="form-control"
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value as any)}
                    disabled={submitting}
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                    <option value="Critica">Crítica</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label text-glow">FRECUENCIA DE RECURRENCIA</label>
                  <select
                    className="form-control"
                    value={frecuencia}
                    onChange={(e) => setFrecuencia(e.target.value as any)}
                    disabled={submitting}
                    style={{ border: '1px solid var(--color-primary)' }}
                  >
                    <option value="Diario">Diario</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">FECHA DE INICIO DE PROGRAMACIÓN</label>
                <input
                  type="date"
                  className="form-control"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="isActiveRecurrence"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={submitting}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="isActiveRecurrence" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                  Programación Activa (Generar tickets automáticamente según el Cron)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Programar Soporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
