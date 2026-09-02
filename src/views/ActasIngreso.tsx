import React, { useState, useEffect } from 'react';
import { inventoryService, IngresoBodega, EgresoBodega } from '../services/inventory.service';
import { showAlert } from '../utils/alerts';
import './Inventario.css';

export const ActasIngreso: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ingresos' | 'egresos' | 'entrega'>('ingresos');
  const [ingresos, setIngresos] = useState<IngresoBodega[]>([]);
  const [egresos, setEgresos] = useState<EgresoBodega[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const [detailIngreso, setDetailIngreso] = useState<IngresoBodega | null>(null);
  const [detailEgreso, setDetailEgreso] = useState<EgresoBodega | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab, search]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'ingresos') {
        const res = await inventoryService.getIngresosBodega(1, 100, search);
        setIngresos(res.data);
      } else {
        const res = await inventoryService.getEgresosBodega(1, 100, search);
        setEgresos(res.data);
      }
    } catch (err: any) {
      showAlert('Error al cargar actas de bodega');
    } finally {
      setLoading(false);
    }
  };

  const openIngresoDetail = async (id: number) => {
    try {
      const full = await inventoryService.getIngresoBodegaById(id);
      setDetailIngreso(full);
    } catch (err: any) {
      showAlert('Error al obtener detalle del ingreso');
    }
  };

  const openEgresoDetail = async (id: number) => {
    try {
      const full = await inventoryService.getEgresoBodegaById(id);
      setDetailEgreso(full);
    } catch (err: any) {
      showAlert('Error al obtener detalle del egreso');
    }
  };

  return (
    <div className="inventario-view animate-fade">
      {/* View Header */}
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Actas de Bodega</h1>
          <p className="text-muted">Gestión y descarga de actas de ingresos, egresos y entregas de bienes TI</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={fetchData}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          Recargar
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="inventario-tabs glass-panel mb-4" style={{ display: 'flex', gap: '8px', padding: '6px' }}>
        <button
          className={`tab-btn ${activeTab === 'ingresos' ? 'active' : ''}`}
          onClick={() => setActiveTab('ingresos')}
        >
          Actas de Ingreso (IB)
        </button>
        <button
          className={`tab-btn ${activeTab === 'egresos' ? 'active' : ''}`}
          onClick={() => setActiveTab('egresos')}
        >
          Actas de Egreso (EB)
        </button>
        <button
          className={`tab-btn ${activeTab === 'entrega' ? 'active' : ''}`}
          onClick={() => setActiveTab('entrega')}
        >
          Actas de Entrega (AE)
        </button>
      </div>

      {/* Search Bar */}
      <div className="filters-card glass-panel" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por código, custodio, proveedor o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px', width: '100%' }}
          />
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-dim)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <p className="text-muted">Cargando datos...</p>
        </div>
      ) : activeTab === 'ingresos' ? (
        /* TAB 1: INGRESOS */
        <div className="table-wrapper glass-panel">
          <table className="inventario-table">
            <thead>
              <tr>
                <th>CÓDIGO INGRESO</th>
                <th>SEDE / EMPRESA</th>
                <th>PROVEEDOR</th>
                <th>NRO. OC</th>
                <th>DESCRIPCIÓN COMPRA</th>
                <th>FECHA INGRESO</th>
                <th>CANT. ACTIVOS</th>
                <th>REGISTRADO POR</th>
                <th style={{ textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {ingresos.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-dim)' }}>
                    No se encontraron actas de ingreso registradas.
                  </td>
                </tr>
              ) : (
                ingresos.map((ing) => (
                  <tr key={ing.id} className="table-row-hover">
                    <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{ing.codigo_ingreso}</td>
                    <td>{ing.empresa_nombre || '-'}</td>
                    <td>{ing.proveedor_nombre || 'Sin proveedor'}</td>
                    <td>{ing.nro_orden_compra}</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ing.descripcion}
                    </td>
                    <td>{ing.fecha_ingreso ? ing.fecha_ingreso.split('T')[0] : '-'}</td>
                    <td>
                      <span className="badge badge-process">{ing.cantidad_activos || 0} ítems</span>
                    </td>
                    <td className="text-muted">{ing.realizado_por_nombre || 'Soporte TI'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openIngresoDetail(ing.id)}
                          title="Ver detalle"
                        >
                          Ficha
                        </button>
                        <a
                          href={inventoryService.getActaIngresoUrl(ing.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          Descargar PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'egresos' ? (
        /* TAB 2: EGRESOS */
        <div className="table-wrapper glass-panel">
          <table className="inventario-table">
            <thead>
              <tr>
                <th>CÓDIGO EGRESO</th>
                <th>SEDE / EMPRESA</th>
                <th>CUSTODIO / RECEPTOR</th>
                <th>ÁREA</th>
                <th>OBSERVACIONES</th>
                <th>FECHA EGRESO</th>
                <th>CANT. ACTIVOS</th>
                <th>REGISTRADO POR</th>
                <th style={{ textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {egresos.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-dim)' }}>
                    No se encontraron actas de egreso registradas.
                  </td>
                </tr>
              ) : (
                egresos.map((egr) => (
                  <tr key={egr.id} className="table-row-hover">
                    <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{egr.codigo_egreso}</td>
                    <td>{egr.empresa_nombre || '-'}</td>
                    <td>{egr.custodio_nombre || '-'}</td>
                    <td>{egr.area || '-'}</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {egr.observaciones || 'Sin observaciones'}
                    </td>
                    <td>{egr.fecha_egreso ? egr.fecha_egreso.split('T')[0] : (egr.created_at ? egr.created_at.split('T')[0] : '-')}</td>
                    <td>
                      <span className="badge badge-process">{egr.cantidad_activos || 0} ítems</span>
                    </td>
                    <td className="text-muted">{egr.realizado_por_nombre || 'Soporte TI'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEgresoDetail(egr.id)}
                          title="Ver detalle"
                        >
                          Ficha
                        </button>
                        <a
                          href={inventoryService.getActaEgresoUrl(egr.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          Descargar PDF (3 Firmas)
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* TAB 3: ENTREGA (NUEVO FORMATO ACTA ENTREGA POR PROCESO DE EGRESO) */
        <div className="table-wrapper glass-panel">
          <table className="inventario-table">
            <thead>
              <tr>
                <th>CÓDIGO ENTREGA</th>
                <th>SEDE / UBICACIÓN</th>
                <th>CUSTODIO RECEPTOR</th>
                <th>DEPARTAMENTO / ÁREA</th>
                <th>OBSERVACIONES</th>
                <th>FECHA ENTREGA</th>
                <th>CANT. ACTIVOS</th>
                <th>ENTREGADO POR</th>
                <th style={{ textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {egresos.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-dim)' }}>
                    No se encontraron actas de entrega registradas.
                  </td>
                </tr>
              ) : (
                egresos.map((egr) => {
                  const empName = egr.empresa_nombre || 'SMO';
                  const words = empName.trim().split(/\s+/).filter(w => w.length > 0);
                  let initials = 'SCA';
                  if (words.length >= 2) initials = (words[0][0] + words[1][0]).toUpperCase();
                  else if (words.length === 1) initials = words[0].substring(0, 3).toUpperCase();
                  const year = egr.fecha_egreso ? new Date(egr.fecha_egreso).getFullYear() : new Date().getFullYear();
                  const codigoEntrega = `SIS-${initials}-${year}`;

                  return (
                    <tr key={egr.id} className="table-row-hover">
                      <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{codigoEntrega}</td>
                      <td>{egr.empresa_nombre || '-'}</td>
                      <td>{egr.custodio_nombre || '-'}</td>
                      <td>{egr.area || '-'}</td>
                      <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {egr.observaciones || 'Sin observaciones'}
                      </td>
                      <td>{egr.fecha_egreso ? egr.fecha_egreso.split('T')[0] : (egr.created_at ? egr.created_at.split('T')[0] : '-')}</td>
                      <td>
                        <span className="badge badge-process">{egr.cantidad_activos || 0} ítems</span>
                      </td>
                      <td className="text-muted">{egr.realizado_por_nombre || 'Soporte TI'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEgresoDetail(egr.id)}
                            title="Ver detalle"
                          >
                            Ficha
                          </button>
                          <a
                            href={inventoryService.getActaEntregaEgresoUrl(egr.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary btn-sm"
                            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            Descargar PDF Entrega
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DETALLE INGRESO */}
      {detailIngreso && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h2>Detalle de Ingreso - {detailIngreso.codigo_ingreso}</h2>
              <button className="modal-close-btn" onClick={() => setDetailIngreso(null)}>×</button>
            </div>
            <div style={{ padding: '12px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px', fontSize: '13px' }}>
                <div><strong>Sede / Empresa:</strong> {detailIngreso.empresa_nombre || '-'}</div>
                <div><strong>Proveedor:</strong> {detailIngreso.proveedor_nombre || 'N/A'}</div>
                <div><strong>Nro. Orden Compra:</strong> {detailIngreso.nro_orden_compra}</div>
                <div><strong>Nro. Factura:</strong> {detailIngreso.nro_factura || 'N/A'}</div>
                <div><strong>Fecha Ingreso:</strong> {detailIngreso.fecha_ingreso ? detailIngreso.fecha_ingreso.split('T')[0] : '-'}</div>
                <div><strong>Registrado Por:</strong> {detailIngreso.realizado_por_nombre || 'Soporte TI'}</div>
              </div>

              <div style={{ marginBottom: '16px', fontSize: '13px' }}>
                <strong>Descripción:</strong> {detailIngreso.descripcion}
              </div>

              <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>
                Bienes Registrados ({detailIngreso.activos?.length || 0})
              </h4>
              <div className="table-wrapper">
                <table className="inventario-table">
                  <thead>
                    <tr>
                      <th>Código Activo</th>
                      <th>Tipo</th>
                      <th>Marca</th>
                      <th>Modelo</th>
                      <th>Serie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailIngreso.activos?.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{a.codigo}</td>
                        <td>{a.tipo_equipo_nombre || 'N/A'}</td>
                        <td>{a.marca}</td>
                        <td>{a.modelo}</td>
                        <td>{a.serial || 'NA'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <a
                href={inventoryService.getActaIngresoUrl(detailIngreso.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                Descargar PDF Ingreso
              </a>
              <button type="button" className="btn btn-secondary" onClick={() => setDetailIngreso(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE EGRESO / ENTREGA */}
      {detailEgreso && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div className="modal-container glass-panel animate-slide-up" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h2>Detalle de Egreso / Entrega - {detailEgreso.codigo_egreso}</h2>
              <button className="modal-close-btn" onClick={() => setDetailEgreso(null)}>×</button>
            </div>
            <div style={{ padding: '12px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px', fontSize: '13px' }}>
                <div><strong>Sede / Empresa:</strong> {detailEgreso.empresa_nombre || '-'}</div>
                <div><strong>Receptor / Custodio:</strong> {detailEgreso.custodio_nombre || '-'}</div>
                <div><strong>Área / Departamento:</strong> {detailEgreso.area || '-'}</div>
                <div><strong>Fecha Egreso:</strong> {detailEgreso.fecha_egreso ? detailEgreso.fecha_egreso.split('T')[0] : '-'}</div>
                <div><strong>Registrado Por:</strong> {detailEgreso.realizado_por_nombre || 'Soporte TI'}</div>
                <div><strong>Revisado Por:</strong> {detailEgreso.revisado_por || 'Paulina Porras'}</div>
              </div>

              <div style={{ marginBottom: '16px', fontSize: '13px' }}>
                <strong>Observaciones:</strong> {detailEgreso.observaciones || 'Sin observaciones.'}
              </div>

              <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>
                Bienes Asignados ({detailEgreso.activos?.length || 0})
              </h4>
              <div className="table-wrapper">
                <table className="inventario-table">
                  <thead>
                    <tr>
                      <th>Código Activo</th>
                      <th>Tipo</th>
                      <th>Marca</th>
                      <th>Modelo</th>
                      <th>Serie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailEgreso.activos?.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{a.codigo}</td>
                        <td>{a.tipo_equipo_nombre || 'N/A'}</td>
                        <td>{a.marca}</td>
                        <td>{a.modelo}</td>
                        <td>{a.serial || 'NA'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <a
                href={inventoryService.getActaEgresoUrl(detailEgreso.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                Acta Egreso (3 Firmas)
              </a>
              <a
                href={inventoryService.getActaEntregaEgresoUrl(detailEgreso.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                Acta Entrega (2 Firmas)
              </a>
              <button type="button" className="btn btn-secondary" onClick={() => setDetailEgreso(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
