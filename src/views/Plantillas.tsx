import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { ticketService } from '../services/ticket.service';
import './Inventario.css';

interface Plantilla {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  empresa: string | null;
  area_solicitante: string | null;
  is_active: number | boolean;
}

interface Empresa {
  id: number;
  nombre: string;
}

export const Plantillas: React.FC = () => {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [search, setSearch] = useState('');
  
  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [areaSolicitante, setAreaSolicitante] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [submitting, setSubmitting] = useState(false);
  const [triggeringId, setTriggeringId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plantillasData, empresasData] = await Promise.all([
        apiClient.get<Plantilla[]>('/plantillas'),
        apiClient.get<Empresa[]>('/empresas'),
      ]);
      setPlantillas(plantillasData);
      setEmpresas(empresasData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las plantillas.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitulo('');
    setDescripcion('');
    setCategoria('Soporte General');
    setEmpresa('');
    setAreaSolicitante('');
    setIsActive(true);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (p: Plantilla) => {
    setIsEditing(true);
    setEditingId(p.id);
    setTitulo(p.titulo);
    setDescripcion(p.descripcion);
    setCategoria(p.categoria);
    setEmpresa(p.empresa || '');
    setAreaSolicitante(p.area_solicitante || '');
    setIsActive(!!p.is_active);
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !descripcion || !categoria) {
      setError('Por favor, completa título, descripción y categoría.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const payload = {
      titulo,
      descripcion,
      categoria,
      empresa: empresa || null,
      area_solicitante: areaSolicitante || null,
      is_active: isActive
    };

    try {
      if (isEditing && editingId) {
        await apiClient.put(`/plantillas/${editingId}`, payload);
      } else {
        await apiClient.post('/plantillas', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la plantilla.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la plantilla "${title}"?`)) {
      return;
    }
    try {
      await apiClient.delete(`/plantillas/${id}`);
      fetchData();
    } catch (err: any) {
      alert(`Error al eliminar plantilla: ${err.message}`);
    }
  };

  const handleTriggerTicket = async (plantillaId: number) => {
    setTriggeringId(plantillaId);
    try {
      await ticketService.createDesdePlantilla(plantillaId);
      alert('¡Ticket generado exitosamente a partir de la plantilla! El técnico de turno ha sido asignado.');
    } catch (err: any) {
      alert(`Error al generar ticket: ${err.message}`);
    } finally {
      setTriggeringId(null);
    }
  };

  const filteredPlantillas = plantillas.filter(p => 
    p.titulo.toLowerCase().includes(search.toLowerCase()) || 
    p.categoria.toLowerCase().includes(search.toLowerCase()) ||
    (p.empresa && p.empresa.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="inventario-view animate-fade">
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Plantillas de Tareas Recurrentes</h1>
          <p className="text-muted">Creación de bitácoras automatizadas y disparo rápido de mantenimientos semanales o mensuales</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nueva Plantilla
        </button>
      </div>

      {/* Filter and Search Section */}
      <div className="filters-card glass-panel" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por título, categoría o sede..."
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
          <div className="spinner" style={{ fontSize: '32px' }}>⏳</div>
          <p className="text-muted" style={{ marginTop: '12px' }}>Cargando plantillas...</p>
        </div>
      ) : error && !showModal ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchData} style={{ marginTop: '12px' }}>Reintentar</button>
        </div>
      ) : (
        <div className="table-wrapper glass-panel">
          <table className="inventario-table">
            <thead>
              <tr>
                <th>Título Tarea</th>
                <th>Sede / Empresa</th>
                <th>Área</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlantillas.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-dim)' }}>
                    No se encontraron plantillas recurrentes.
                  </td>
                </tr>
              ) : (
                filteredPlantillas.map((p) => (
                  <tr key={p.id} className="table-row-hover">
                    <td style={{ fontWeight: '600', color: 'var(--color-text-main)' }}>
                      <div>{p.titulo}</div>
                      <div className="text-dim" style={{ fontSize: '12px', fontWeight: 'normal', marginTop: '2px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.descripcion}
                      </div>
                    </td>
                    <td>
                      {p.empresa ? (
                        <span className="badge badge-process" style={{ fontSize: '10px' }}>
                          {p.empresa}
                        </span>
                      ) : (
                        <span className="text-dim">—</span>
                      )}
                    </td>
                    <td>{p.area_solicitante || '—'}</td>
                    <td>{p.categoria}</td>
                    <td>
                      <span className={`badge ${p.is_active ? 'badge-done' : 'badge-baja'}`} style={{ fontSize: '9px' }}>
                        {p.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '12px', background: 'linear-gradient(135deg, #7f00ff, #a855f7)', color: '#fff', boxShadow: 'none' }}
                          onClick={() => handleTriggerTicket(p.id)}
                          disabled={triggeringId === p.id}
                        >
                          {triggeringId === p.id ? 'Gatillando...' : 'Gatillar Ticket ⚡'}
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openEditModal(p)}>
                          Editar
                        </button>
                        <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleDelete(p.id, p.titulo)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Overlay */}
      {showModal && (
        <div className="modal-backdrop animate-fade" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '500px', padding: '28px', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color-active)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{isEditing ? 'Editar Plantilla Recurrente' : 'Registrar Nueva Plantilla'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            
            {error && (
              <div className="login-error-alert" style={{ marginBottom: '16px' }}>
                <span className="alert-icon">⚠️</span>
                <span className="alert-text">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">TÍTULO DE LA TAREA</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Limpieza de rack y backups semanales"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">DESCRIPCIÓN DE LA BITÁCORA</label>
                <textarea
                  className="form-control"
                  placeholder="Describe detalladamente los pasos a seguir por el técnico..."
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  disabled={submitting}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">CATEGORÍA</label>
                <select
                  className="form-control"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  disabled={submitting}
                >
                  <option value="Soporte General">Soporte General</option>
                  <option value="Mantenimiento Preventivo">Mantenimiento Preventivo</option>
                  <option value="Mantenimiento Correctivo">Mantenimiento Correctivo</option>
                  <option value="Redes e Infraestructura">Redes e Infraestructura</option>
                  <option value="Sistemas y Servidores">Sistemas y Servidores</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">SEDE / EMPRESA ASOCIADA (OPCIONAL)</label>
                <select
                  className="form-control"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Ninguna empresa (Asignación libre)...</option>
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.nombre}>{emp.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">ÁREA SOLICITANTE (OPCIONAL)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Administración, Servidores, Cajas"
                  value={areaSolicitante}
                  onChange={(e) => setAreaSolicitante(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={submitting}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="isActiveCheck" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                  Plantilla Activa (Recurrente disponible para disparar)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar Plantilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
