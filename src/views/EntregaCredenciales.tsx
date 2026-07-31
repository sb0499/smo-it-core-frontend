import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { credencialService, CredencialEntrega } from '../services/credencial.service';
import { showAlert, showConfirm } from '../utils/alerts';
import './Inventario.css';
import './EntregaCredenciales.css';

interface Empresa {
  id: number;
  nombre: string;
}

export const EntregaCredenciales: React.FC = () => {
  const { user } = useAuth();
  const [entregas, setEntregas] = useState<CredencialEntrega[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Modal form states
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fields
  const [empresaId, setEmpresaId] = useState<number>(0);
  const [fechaEntrega, setFechaEntrega] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [tipo, setTipo] = useState('Usuario y Clave');
  const [sitio, setSitio] = useState('');
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [recibidoPorNombre, setRecibidoPorNombre] = useState('');
  const [recibidoPorArea, setRecibidoPorArea] = useState('');
  const [correoReceptor, setCorreoReceptor] = useState('');

  // Live preview helpers
  const [previewSecuencial, setPreviewSecuencial] = useState('SI-[CC]-MMDDSEQ-YYYY');
  const [previewVersionTI, setPreviewVersionTI] = useState(false);

  // Load empresas once on mount
  useEffect(() => {
    apiClient.get<Empresa[]>('/empresas')
      .then(res => {
        setEmpresas(res);
      })
      .catch(err => {
        console.error('Error al cargar empresas:', err);
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

  // Fetch paginated entregas whenever page, limit, or search changes
  useEffect(() => {
    fetchData();
  }, [page, limit, debouncedSearch]);

  // Update preview secuencial whenever empresaId or fechaEntrega changes
  useEffect(() => {
    if (empresaId && fechaEntrega) {
      credencialService
        .getNextSecuencial(empresaId, fechaEntrega)
        .then((res) => {
          setPreviewSecuencial(res.secuencial);
        })
        .catch(() => {
          setPreviewSecuencial('SI-[CC]-MMDDSEQ-YYYY');
        });
    } else {
      setPreviewSecuencial('SI-[CC]-MMDDSEQ-YYYY');
    }
  }, [empresaId, fechaEntrega]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await credencialService.getEntregas(page, limit, debouncedSearch);
      setEntregas(res.data || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos de credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEmpresaId(empresas[0]?.id || 0);
    setFechaEntrega(new Date().toISOString().split('T')[0]);
    setTipo('Usuario y Clave');
    setSitio('');
    setUsuario('');
    setClave('');
    setRecibidoPorNombre('');
    setRecibidoPorArea('');
    setCorreoReceptor('');
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId || !fechaEntrega || !sitio || !usuario || !clave || !recibidoPorNombre || !recibidoPorArea) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await credencialService.createEntrega({
        empresa_id: empresaId,
        fecha_entrega: fechaEntrega,
        tipo,
        sitio,
        usuario,
        clave,
        recibido_por_nombre: recibidoPorNombre,
        recibido_por_area: recibidoPorArea,
        correo_receptor: correoReceptor,
      });
      setShowModal(false);
      fetchData();
      showAlert('Entrega de credenciales registrada con éxito.');
    } catch (err: any) {
      setError(err.message || 'Error al registrar la entrega de credenciales.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, secuencial: string) => {
    const confirmed = await showConfirm(`¿Estás seguro de eliminar el acta secuencial ${secuencial}?`);
    if (!confirmed) {
      return;
    }
    try {
      await credencialService.deleteEntrega(id);
      fetchData();
      showAlert('Registro eliminado correctamente.');
    } catch (err: any) {
      showAlert(`Error al eliminar: ${err.message}`);
    }
  };

  const handleDownload = (id: number, version: 'usuario' | 'ti') => {
    const url = credencialService.getPDFUrl(id, version);
    window.open(url, '_blank');
  };

  const localDateToSpanishWords = (dateInput: string | Date): string => {
    if (!dateInput) return '';
    const cleanStr = String(dateInput).split('T')[0];
    const parts = cleanStr.split('-');
    let day: number, month: number, year: number;
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      const date = new Date(dateInput);
      day = date.getDate();
      month = date.getMonth();
      year = date.getFullYear();
    }

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return 'FECHA INVALIDA';
    }

    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const especiales = {
      11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
      16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
      21: 'veintiuno', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro',
      25: 'veinticinco', 26: 'veintiséis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve'
    };

    const numALetras = (n: number): string => {
      if (n === 0) return 'cero';
      if (n === 10) return 'diez';
      if (n === 20) return 'veinte';
      if (n === 30) return 'treinta';
      if (n in especiales) return (especiales as any)[n];
      if (n < 10) return unidades[n];
      if (n < 30) return 'veinti' + unidades[n % 10];
      const d = Math.floor(n / 10);
      const u = n % 10;
      if (u === 0) return decenas[d];
      return decenas[d] + ' y ' + unidades[u];
    };

    const yrALetras = (y: number): string => {
      if (y >= 2000 && y < 3000) {
        const resto = y - 2000;
        if (resto === 0) return 'dos mil';
        return 'dos mil ' + numALetras(resto);
      }
      return y.toString();
    };

    const diaPalabra = day === 1 ? 'primer día' : `${numALetras(day)} días`;
    return `${diaPalabra} del mes de ${meses[month]} del ${yrALetras(year)}`;
  };

  const formatFechaSimple = (fechaInput: string | Date): string => {
    if (!fechaInput) return '—';
    const cleanStr = String(fechaInput).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('es-EC');
    }
    const d = new Date(fechaInput);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-EC');
  };

  const formatFechaCompleta = (fechaInput: string | Date): string => {
    if (!fechaInput) return '—';
    const cleanStr = String(fechaInput).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    const d = new Date(fechaInput);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const getEmpresaNombre = (id: number) => {
    const emp = empresas.find((e) => e.id === id);
    if (!emp) return 'CC';
    const n = emp.nombre.toUpperCase();
    if (n === 'CONDADO') return 'Condado Shopping';
    if (n === 'SCALA') return 'Scala Shopping';
    if (n === 'POMASQUI') return 'Pomasqui';
    if (n === 'PORTOSHOPPING') return 'Portoshopping';
    return emp.nombre;
  };

  const getEmpresaCleanName = (id: number): string => {
    const emp = empresas.find((e) => e.id === id);
    if (!emp) return 'shopping';
    return emp.nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="credenciales-view animate-fade">
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Entrega de Credenciales</h1>
          <p className="text-muted">Registro y generación de actas de entrega de accesos y contraseñas</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Registrar Entrega
        </button>
      </div>

      {/* Filter and Search Section */}
      <div className="filters-card glass-panel" style={{ padding: '16px', marginBottom: '8px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por secuencial, centro comercial, sitio, usuario o receptor..."
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
          <p className="text-muted" style={{ marginTop: '12px' }}>Cargando registros de credenciales...</p>
        </div>
      ) : error && !showModal ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchData} style={{ marginTop: '12px' }}>Reintentar</button>
        </div>
      ) : (
        <>
          <div className="table-wrapper glass-panel">
            <table className="credenciales-table">
              <thead>
                <tr>
                  <th>Secuencial</th>
                  <th>Centro Comercial</th>
                  <th>Sitio / Aplicativo</th>
                  <th>Usuario</th>
                  <th>Recibe Conforme</th>
                  <th>Área</th>
                  <th>Fecha Entrega</th>
                  <th style={{ textAlign: 'right' }}>Descargas & Acciones</th>
                </tr>
              </thead>
              <tbody>
                {entregas.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-dim)' }}>
                      No se encontraron actas de entrega de credenciales.
                    </td>
                  </tr>
                ) : (
                  entregas.map((e) => (
                    <tr key={e.id} className="table-row-hover">
                      <td style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{e.secuencial}</td>
                      <td>{e.empresa_nombre}</td>
                      <td>{e.sitio}</td>
                      <td>{e.usuario}</td>
                      <td>{e.recibido_por_nombre}</td>
                      <td>{e.recibido_por_area}</td>
                      <td>{formatFechaSimple(e.fecha_entrega)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-buttons-group">
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 'bold' }}
                            onClick={() => handleDownload(e.id, 'usuario')}
                            title="Descargar versión Usuario (Clave visible)"
                          >
                            PDF Usuario
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 'bold' }}
                            onClick={() => handleDownload(e.id, 'ti')}
                            title="Descargar versión TI (Clave oculta)"
                          >
                            PDF TI
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '6px 8px' }}
                            onClick={() => handleDelete(e.id, e.secuencial)}
                            title="Eliminar registro"
                          >
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
          {entregas.length > 0 && (
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

      {/* Main Glassmorphic Modal with Live Preview */}
      {showModal && (
        <div className="modal-backdrop animate-fade" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-slide-up" style={{ width: '95%', maxWidth: '960px', padding: '24px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3>Registrar Entrega de Credenciales</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            
            {error && (
              <div className="login-error-alert" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '10px 14px' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span className="alert-text" style={{ color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>{error}</span>
              </div>
            )}

            <div className="modal-grid">
              {/* Form Side */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">CENTRO COMERCIAL *</label>
                  <select
                    className="form-control"
                    value={empresaId}
                    onChange={(e) => setEmpresaId(parseInt(e.target.value))}
                    disabled={submitting}
                  >
                    <option value={0}>Selecciona un Centro Comercial...</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">FECHA DE ENTREGA *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">TIPO DE CREDENCIAL *</label>
                    <select
                      className="form-control"
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                      disabled={submitting}
                    >
                      <option value="Usuario y Clave">Usuario y Clave</option>
                      <option value="Código de Acceso">Código de Acceso</option>
                      <option value="Pin de Seguridad">Pin de Seguridad</option>
                      <option value="Clave de Encriptación">Clave de Encriptación</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">SITIO / APLICATIVO *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. https://cctv.dominio.com o SAP"
                      value={sitio}
                      onChange={(e) => setSitio(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">USUARIO *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. administrador"
                      value={usuario}
                      onChange={(e) => setUsuario(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">CLAVE *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. Clave_Soporte2025"
                      value={clave}
                      onChange={(e) => setClave(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">RECIBE CONFORME (EMPLEADO) *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. Juan Pérez"
                      value={recibidoPorNombre}
                      onChange={(e) => setRecibidoPorNombre(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">ÁREA *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. Operaciones"
                      value={recibidoPorArea}
                      onChange={(e) => setRecibidoPorArea(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">CORREO ELECTRÓNICO RECEPTOR (OPCIONAL - ENVÍA CREDENCIALES POR CORREO)</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Ej. receptor@correo.com"
                    value={correoReceptor}
                    onChange={(e) => setCorreoReceptor(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)} disabled={submitting}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                    {submitting ? 'Guardando...' : 'Generar y Guardar'}
                  </button>
                </div>
              </form>

              {/* Live Preview Side */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 'bold' }}>VISTA PREVIA DEL DOCUMENTO</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                    <input
                      type="checkbox"
                      checked={previewVersionTI}
                      onChange={(e) => setPreviewVersionTI(e.target.checked)}
                    />
                    Ver Versión TI (Ocultar Clave)
                  </label>
                </div>

                {/* Simulated Paper Sheet */}
                <div className="acta-live-preview">
                  {/* Letterhead */}
                  <div className="acta-preview-header">
                    <div>
                      <div className="acta-preview-logo-text">TECNOLOGÍA DE LA INFORMACIÓN</div>
                      <div className="acta-preview-logo-text">SHOPPING MANAGEMENTS OPERADORA</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <img 
                        key={empresaId}
                        src={`/logo-${getEmpresaCleanName(empresaId)}.png`}
                        alt="shoppingmanagements" 
                        style={{ height: '22px', width: 'auto', display: 'none' }}
                        onLoad={(e) => {
                          e.currentTarget.style.display = 'block';
                          const sibling = e.currentTarget.nextSibling as HTMLElement;
                          if (sibling) sibling.style.display = 'none';
                        }}
                        onError={(e) => {
                          const currentSrc = e.currentTarget.src;
                          const fallbackSrc = window.location.origin + '/logo-shopping.png';
                          if (currentSrc !== fallbackSrc) {
                            e.currentTarget.src = '/logo-shopping.png';
                          } else {
                            e.currentTarget.style.display = 'none';
                            const sibling = e.currentTarget.nextSibling as HTMLElement;
                            if (sibling) sibling.style.display = 'block';
                          }
                        }}
                      />
                      <svg width="110" height="22" viewBox="0 0 180 40">
                        <polygon points="15,5 170,5 175,0 180,30 177,35 165,35 15,35 3,35 0,30 5,0" fill="#304d69" />
                        <text x="90" y="24" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif">shoppingmanagements</text>
                      </svg>
                    </div>
                  </div>

                  {/* Quito, Date */}
                  <div className="acta-preview-date">
                    Quito, {fechaEntrega ? formatFechaCompleta(fechaEntrega) : '—'}
                  </div>

                  {/* Secuencial code */}
                  <div className="acta-preview-secuencial">
                    {previewSecuencial}
                  </div>

                  {/* Document Title */}
                  <div className="acta-preview-title">
                    ACTA DE ENTREGA-RECEPCION
                  </div>

                  {/* Body description */}
                  <div className="acta-preview-body">
                    En las instalaciones de <strong>{getEmpresaNombre(empresaId)}</strong>, a los <strong>{fechaEntrega ? localDateToSpanishWords(fechaEntrega) : '—'}</strong>, se procede a entregar lo siguiente.
                  </div>

                  {/* Table */}
                  <table className="acta-preview-table">
                    <thead>
                      <tr>
                        <th style={{ width: '5%' }}>#</th>
                        <th style={{ width: '25%' }}>TIPO</th>
                        <th style={{ width: '25%' }}>SITIO</th>
                        <th style={{ width: '25%' }}>USUARIO</th>
                        <th style={{ width: '20%' }}>CLAVE</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td>{tipo || 'Usuario y Clave'}</td>
                        <td>{sitio || '—'}</td>
                        <td>{usuario || '—'}</td>
                        <td style={{ fontWeight: previewVersionTI ? 'normal' : 'bold', color: previewVersionTI ? '#4b5563' : '#111827' }}>
                          {previewVersionTI ? 'Entregada al Usuario' : (clave || '—')}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="acta-preview-note">
                    Nota: La información entregada debe ser custodiada y utilizada de la mejor manera por parte del usuario.
                  </div>

                  <div className="acta-preview-body">
                    En fe de conformidad y aceptación se procede a suscribir la presente acta de entrega-recepción en original y una copia del mismo tenor y efecto.
                  </div>

                  {/* Signatures */}
                  <div className="acta-preview-signatures">
                    <div className="acta-preview-sig-line">
                      ENTREGA CONFORME
                      <div className="acta-preview-sig-sub">{user?.nombre || 'Administrador Sistema'}</div>
                      <div className="acta-preview-sig-sub">TI</div>
                    </div>
                    <div className="acta-preview-sig-line">
                      RECIBE CONFORME
                      <div className="acta-preview-sig-sub">{recibidoPorNombre || '—'}</div>
                      <div className="acta-preview-sig-sub">{recibidoPorArea || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
