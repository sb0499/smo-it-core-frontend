import React, { useState, useEffect } from "react";
import {
  inventoryService,
  IngresoBodega,
  EgresoBodega,
} from "../services/inventory.service";
import { showAlert } from "../utils/alerts";
import "./Inventario.css";

export const ActasIngreso: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "ingresos" | "egresos" | "entrega" | "recepciones"
  >("ingresos");
  const [ingresos, setIngresos] = useState<IngresoBodega[]>([]);
  const [egresos, setEgresos] = useState<EgresoBodega[]>([]);
  const [recepciones, setRecepciones] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number>(0);
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const totalPages = Math.ceil(totalItems / 10) || 1;

  const [detailIngreso, setDetailIngreso] = useState<IngresoBodega | null>(
    null,
  );
  const [detailEgreso, setDetailEgreso] = useState<EgresoBodega | null>(null);

  useEffect(() => {
    console.log('[ActasIngreso] Cargando catálogo de empresas...');
    inventoryService
      .getEmpresas()
      .then(res => {
        console.log('[ActasIngreso] Empresas obtenidas:', res);
        setEmpresas(Array.isArray(res) ? res : []);
      })
      .catch(err => {
        console.error('[ActasIngreso] Error al obtener empresas:', err);
        setEmpresas([]);
      });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, fechaDesde, fechaHasta, selectedEmpresaId]);

  useEffect(() => {
    fetchData();
  }, [activeTab, search, fechaDesde, fechaHasta, selectedEmpresaId, page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log(`[ActasIngreso] Consultando actas - tab: ${activeTab}, page: ${page}, search: "${search}", empresaId: ${selectedEmpresaId}, fechaDesde: "${fechaDesde}", fechaHasta: "${fechaHasta}"`);

      if (activeTab === "ingresos") {
        const res = await inventoryService.getIngresosBodega(
          page,
          10,
          search,
          fechaDesde,
          fechaHasta,
          selectedEmpresaId,
        );
        console.log('[ActasIngreso] Respuesta getIngresosBodega:', res);
        const dataArr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setIngresos(dataArr);
        setTotalItems(res?.total ?? dataArr.length ?? 0);
      } else if (activeTab === "recepciones") {
        const res = await inventoryService.getRecepcionesBodega(
          page,
          10,
          search,
          fechaDesde,
          fechaHasta,
          selectedEmpresaId,
        );
        console.log('[ActasIngreso] Respuesta getRecepcionesBodega:', res);
        const dataArr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setRecepciones(dataArr);
        setTotalItems(res?.total ?? dataArr.length ?? 0);
      } else {
        const res = await inventoryService.getEgresosBodega(
          page,
          10,
          search,
          fechaDesde,
          fechaHasta,
          selectedEmpresaId,
        );
        console.log('[ActasIngreso] Respuesta getEgresosBodega:', res);
        const dataArr = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setEgresos(dataArr);
        setTotalItems(res?.total ?? dataArr.length ?? 0);
      }
    } catch (err: any) {
      console.error('[ActasIngreso] Error al cargar actas de bodega:', err);
      setIngresos([]);
      setRecepciones([]);
      setEgresos([]);
      setTotalItems(0);
      showAlert("Error al cargar actas de bodega: " + (err.message || 'Error del servidor'));
    } finally {
      setLoading(false);
    }
  };

  const openIngresoDetail = async (id: number) => {
    try {
      const full = await inventoryService.getIngresoBodegaById(id);
      setDetailIngreso(full);
    } catch (err: any) {
      showAlert("Error al obtener detalle del ingreso");
    }
  };

  const openEgresoDetail = async (id: number) => {
    try {
      const full = await inventoryService.getEgresoBodegaById(id);
      setDetailEgreso(full);
    } catch (err: any) {
      showAlert("Error al obtener detalle del egreso");
    }
  };

  return (
    <div className="inventario-view animate-fade">
      {/* View Header */}
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Actas de Bodega</h1>
          <p className="text-muted">
            Gestión y descarga de actas de ingresos, egresos, entregas y
            recepciones de bienes TI
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={fetchData}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          Recargar
        </button>
      </div>

      {/* Tabs Bar */}
      <div
        className="inventario-tabs glass-panel mb-4"
        style={{ display: "flex", gap: "8px", padding: "6px" }}
      >
        <button
          className={`tab-btn ${activeTab === "ingresos" ? "active" : ""}`}
          onClick={() => setActiveTab("ingresos")}
        >
          Actas de Ingreso (IB)
        </button>
        <button
          className={`tab-btn ${activeTab === "egresos" ? "active" : ""}`}
          onClick={() => setActiveTab("egresos")}
        >
          Actas de Egreso (EB)
        </button>
        <button
          className={`tab-btn ${activeTab === "entrega" ? "active" : ""}`}
          onClick={() => setActiveTab("entrega")}
        >
          Actas de Entrega (AE)
        </button>
        <button
          className={`tab-btn ${activeTab === "recepciones" ? "active" : ""}`}
          onClick={() => setActiveTab("recepciones")}
        >
          Actas de Recepción (AR)
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div
        className="filters-card glass-panel"
        style={{ padding: "16px 20px", marginBottom: "24px" }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "center",
            width: "100%",
          }}
        >
          {/* Input de Búsqueda */}
          <div style={{ position: "relative", flex: "2", minWidth: "260px" }}>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por código, custodio, proveedor o número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "38px", height: "40px" }}
            />
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                position: "absolute",
                left: "12px",
                top: "12px",
                color: "var(--color-text-dim)",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* Filtro Empresa */}
          <div style={{ flex: "1", minWidth: "180px" }}>
            <select
              className="form-control"
              value={selectedEmpresaId}
              onChange={(e) => setSelectedEmpresaId(Number(e.target.value))}
              style={{ height: "40px" }}
            >
              <option value="0">Todas las Sedes</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Desde */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: "170px",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: "500",
                color: "var(--color-text-dim)",
                whiteSpace: "nowrap",
              }}
            >
              Desde:
            </span>
            <input
              type="date"
              className="form-control"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{ height: "40px" }}
            />
          </div>

          {/* Fecha Hasta */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: "170px",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: "500",
                color: "var(--color-text-dim)",
                whiteSpace: "nowrap",
              }}
            >
              Hasta:
            </span>
            <input
              type="date"
              className="form-control"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{ height: "40px" }}
            />
          </div>

          {/* Limpiar Filtros */}
          {(search || selectedEmpresaId > 0 || fechaDesde || fechaHasta) && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSearch("");
                setSelectedEmpresaId(0);
                setFechaDesde("");
                setFechaHasta("");
              }}
              style={{
                height: "40px",
                padding: "0 16px",
                display: "inline-flex",
                alignItems: "center",
                whiteSpace: "nowrap",
              }}
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px" }}>
          <p className="text-muted">Cargando datos...</p>
        </div>
      ) : activeTab === "ingresos" ? (
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
                <th style={{ textAlign: "right" }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {ingresos.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "var(--color-text-dim)",
                    }}
                  >
                    No se encontraron actas de ingreso registradas.
                  </td>
                </tr>
              ) : (
                ingresos.map((ing) => (
                  <tr key={ing.id} className="table-row-hover">
                    <td
                      style={{
                        fontWeight: "700",
                        color: "var(--color-primary)",
                      }}
                    >
                      {ing.codigo_ingreso}
                    </td>
                    <td>{ing.empresa_nombre || "-"}</td>
                    <td>{ing.proveedor_nombre || "Sin proveedor"}</td>
                    <td>{ing.nro_orden_compra}</td>
                    <td
                      style={{
                        maxWidth: "200px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ing.descripcion}
                    </td>
                    <td>
                      {ing.fecha_ingreso
                        ? ing.fecha_ingreso.split("T")[0]
                        : "-"}
                    </td>
                    <td>
                      <span className="badge badge-process">
                        {ing.cantidad_activos || 0} ítems
                      </span>
                    </td>
                    <td className="text-muted">
                      {ing.realizado_por_nombre || "Soporte TI"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          justifyContent: "flex-end",
                        }}
                      >
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
                          style={{
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === "egresos" ? (
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
                <th style={{ textAlign: "right" }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {egresos.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "var(--color-text-dim)",
                    }}
                  >
                    No se encontraron actas de egreso registradas.
                  </td>
                </tr>
              ) : (
                egresos.map((egr) => (
                  <tr key={egr.id} className="table-row-hover">
                    <td
                      style={{
                        fontWeight: "700",
                        color: "var(--color-primary)",
                      }}
                    >
                      {egr.codigo_egreso}
                    </td>
                    <td>{egr.empresa_nombre || "-"}</td>
                    <td>{egr.custodio_nombre || "-"}</td>
                    <td>{egr.area || "-"}</td>
                    <td
                      style={{
                        maxWidth: "200px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {egr.observaciones || "Sin observaciones"}
                    </td>
                    <td>
                      {egr.fecha_egreso
                        ? egr.fecha_egreso.split("T")[0]
                        : egr.created_at
                          ? egr.created_at.split("T")[0]
                          : "-"}
                    </td>
                    <td>
                      <span className="badge badge-process">
                        {egr.cantidad_activos || 0} ítems
                      </span>
                    </td>
                    <td className="text-muted">
                      {egr.realizado_por_nombre || "Soporte TI"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          justifyContent: "flex-end",
                        }}
                      >
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
                          style={{
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === "entrega" ? (
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
                <th style={{ textAlign: "right" }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {egresos.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "var(--color-text-dim)",
                    }}
                  >
                    No se encontraron actas de entrega registradas.
                  </td>
                </tr>
              ) : (
                (() => {
                  const companyCounters: Record<string, number> = {};
                  const companyMap: Record<string, string> = {
                    CONDADO: "CON",
                    "CONDADO SHOPPING": "CON",
                    SCALA: "SCA",
                    "SCALA SHOPPING": "SCA",
                    POMASQUI: "POM",
                    CCI: "CCI",
                    SMO: "SMO",
                    "SHOPPING MANAGEMENTS OPERADORA": "SMO",
                    PORTOSHOPPING: "POR",
                    GAMETOWN: "GAM",
                    APPARCA: "APP",
                    DATATRUST: "DAT",
                    "EL TEATRO": "TEA",
                  };

                  // Build chronological per-company map
                  const sorted = [...egresos].sort((a, b) => a.id - b.id);
                  const codeMap = new Map<number, string>();

                  sorted.forEach((item) => {
                    if (
                      item.codigo_egreso &&
                      item.codigo_egreso.startsWith("TI-")
                    ) {
                      codeMap.set(item.id, item.codigo_egreso);
                    } else {
                      const empName = item.empresa_nombre || "SMO";
                      const nUpper = empName.toUpperCase().trim();
                      let initials = companyMap[nUpper];
                      if (!initials) {
                        const words = empName
                          .trim()
                          .split(/\s+/)
                          .filter((w: string) => w.length > 0);
                        if (words.length >= 2)
                          initials = (words[0][0] + words[1][0]).toUpperCase();
                        else if (words.length === 1)
                          initials = words[0].substring(0, 3).toUpperCase();
                        else initials = "SMO";
                      }

                      companyCounters[initials] =
                        (companyCounters[initials] || 0) + 1;
                      const seqStr = String(companyCounters[initials]).padStart(
                        4,
                        "0",
                      );
                      codeMap.set(item.id, `TI-${initials}-AE-${seqStr}`);
                    }
                  });

                  return egresos.map((egr) => {
                    const codigoEntrega =
                      codeMap.get(egr.id) || egr.codigo_egreso;

                    return (
                      <tr key={egr.id} className="table-row-hover">
                        <td
                          style={{
                            fontWeight: "700",
                            color: "var(--color-primary)",
                          }}
                        >
                          {codigoEntrega}
                        </td>
                        <td>{egr.empresa_nombre || "-"}</td>
                        <td>{egr.custodio_nombre || "-"}</td>
                        <td>{egr.area || "-"}</td>
                        <td
                          style={{
                            maxWidth: "200px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {egr.observaciones || "Sin observaciones"}
                        </td>
                        <td>
                          {egr.fecha_egreso
                            ? egr.fecha_egreso.split("T")[0]
                            : egr.created_at
                              ? egr.created_at.split("T")[0]
                              : "-"}
                        </td>
                        <td>
                          <span className="badge badge-process">
                            {egr.cantidad_activos || 0} ítems
                          </span>
                        </td>
                        <td className="text-muted">
                          {egr.realizado_por_nombre || "Soporte TI"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              justifyContent: "flex-end",
                            }}
                          >
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEgresoDetail(egr.id)}
                              title="Ver detalle"
                            >
                              Ficha
                            </button>
                            <a
                              href={inventoryService.getActaEntregaEgresoUrl(
                                egr.id,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-primary btn-sm"
                              style={{
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              PDF
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* TAB 4: RECEPCIONES */
        <div className="table-wrapper glass-panel">
          <table className="inventario-table">
            <thead>
              <tr>
                <th>CÓDIGO RECEPCIÓN</th>
                <th>SEDE / EMPRESA</th>
                <th>DEVOLVIÓ (CUSTODIO)</th>
                <th>RECIBIÓ (SOPORTE TI)</th>
                <th>ÁREA</th>
                <th>FECHA RECEPCIÓN</th>
                <th>CANT. ACTIVOS</th>
                <th style={{ textAlign: "right" }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {recepciones.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "var(--color-text-dim)",
                    }}
                  >
                    No se encontraron actas de recepción registradas.
                  </td>
                </tr>
              ) : (
                recepciones.map((r) => (
                  <tr key={r.id} className="table-row-hover">
                    <td
                      style={{
                        fontWeight: "700",
                        color: "var(--color-primary)",
                      }}
                    >
                      {r.codigo_recepcion}
                    </td>
                    <td>{r.empresa_nombre || "-"}</td>
                    <td>{r.persona_entrega_nombre || "-"}</td>
                    <td className="text-muted">
                      {r.recibido_por_nombre || "Soporte TI"}
                    </td>
                    <td>{r.area || "-"}</td>
                    <td>
                      {r.fecha_recepcion
                        ? r.fecha_recepcion.split("T")[0]
                        : r.created_at
                          ? r.created_at.split("T")[0]
                          : "-"}
                    </td>
                    <td>
                      <span className="badge badge-process">
                        {r.cantidad_activos || 0} ítems
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          justifyContent: "flex-end",
                        }}
                      >
                        <a
                          href={inventoryService.getActaRecepcionUrl(r.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                          style={{
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && totalPages > 1 && (
        <div
          className="pagination-container"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
            marginTop: "20px",
            padding: "12px 0",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              cursor: page === 1 ? "not-allowed" : "pointer",
              padding: "6px 14px",
              fontSize: "12px",
            }}
          >
            Anterior
          </button>
          <span
            style={{
              fontSize: "13px",
              color: "var(--color-text)",
              fontWeight: "500",
            }}
          >
            Página {page} de {totalPages} ({totalItems} registros)
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              cursor: page >= totalPages ? "not-allowed" : "pointer",
              padding: "6px 14px",
              fontSize: "12px",
            }}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* MODAL DETALLE INGRESO */}
      {detailIngreso && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div
            className="modal-container glass-panel animate-slide-up"
            style={{ maxWidth: "750px" }}
          >
            <div className="modal-header">
              <h2>Detalle de Ingreso - {detailIngreso.codigo_ingreso}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setDetailIngreso(null)}
              >
                ×
              </button>
            </div>
            <div style={{ padding: "12px 0" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "12px",
                  marginBottom: "16px",
                  fontSize: "13px",
                }}
              >
                <div>
                  <strong>Sede / Empresa:</strong>{" "}
                  {detailIngreso.empresa_nombre || "-"}
                </div>
                <div>
                  <strong>Proveedor:</strong>{" "}
                  {detailIngreso.proveedor_nombre || "N/A"}
                </div>
                <div>
                  <strong>Nro. Orden Compra:</strong>{" "}
                  {detailIngreso.nro_orden_compra}
                </div>
                <div>
                  <strong>Nro. Factura:</strong>{" "}
                  {detailIngreso.nro_factura || "N/A"}
                </div>
                <div>
                  <strong>Fecha Ingreso:</strong>{" "}
                  {detailIngreso.fecha_ingreso
                    ? detailIngreso.fecha_ingreso.split("T")[0]
                    : "-"}
                </div>
                <div>
                  <strong>Registrado Por:</strong>{" "}
                  {detailIngreso.realizado_por_nombre || "Soporte TI"}
                </div>
              </div>

              <div style={{ marginBottom: "16px", fontSize: "13px" }}>
                <strong>Descripción:</strong> {detailIngreso.descripcion}
              </div>

              <h4 style={{ marginTop: "20px", marginBottom: "10px" }}>
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
                    {detailIngreso.activos?.map((a) => (
                      <tr key={a.id}>
                        <td
                          style={{
                            fontWeight: "bold",
                            color: "var(--color-primary)",
                          }}
                        >
                          {a.codigo}
                        </td>
                        <td>{a.tipo_equipo_nombre || "N/A"}</td>
                        <td>{a.marca}</td>
                        <td>{a.modelo}</td>
                        <td>{a.serial || "NA"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <a
                href={inventoryService.getActaIngresoUrl(detailIngreso.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: "none" }}
              >
                PDF
              </a>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDetailIngreso(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE EGRESO / ENTREGA */}
      {detailEgreso && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 1001 }}>
          <div
            className="modal-container glass-panel animate-slide-up"
            style={{ maxWidth: "750px" }}
          >
            <div className="modal-header">
              <h2>
                Detalle de Egreso / Entrega - {detailEgreso.codigo_egreso}
              </h2>
              <button
                className="modal-close-btn"
                onClick={() => setDetailEgreso(null)}
              >
                ×
              </button>
            </div>
            <div style={{ padding: "12px 0" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "12px",
                  marginBottom: "16px",
                  fontSize: "13px",
                }}
              >
                <div>
                  <strong>Sede / Empresa:</strong>{" "}
                  {detailEgreso.empresa_nombre || "-"}
                </div>
                <div>
                  <strong>Receptor / Custodio:</strong>{" "}
                  {detailEgreso.custodio_nombre || "-"}
                </div>
                <div>
                  <strong>Área / Departamento:</strong>{" "}
                  {detailEgreso.area || "-"}
                </div>
                <div>
                  <strong>Fecha Egreso:</strong>{" "}
                  {detailEgreso.fecha_egreso
                    ? detailEgreso.fecha_egreso.split("T")[0]
                    : "-"}
                </div>
                <div>
                  <strong>Registrado Por:</strong>{" "}
                  {detailEgreso.realizado_por_nombre || "Soporte TI"}
                </div>
                <div>
                  <strong>Revisado Por:</strong>{" "}
                  {detailEgreso.revisado_por || "Paulina Porras"}
                </div>
              </div>

              <div style={{ marginBottom: "16px", fontSize: "13px" }}>
                <strong>Observaciones:</strong>{" "}
                {detailEgreso.observaciones || "Sin observaciones."}
              </div>

              <h4 style={{ marginTop: "20px", marginBottom: "10px" }}>
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
                    {detailEgreso.activos?.map((a) => (
                      <tr key={a.id}>
                        <td
                          style={{
                            fontWeight: "bold",
                            color: "var(--color-primary)",
                          }}
                        >
                          {a.codigo}
                        </td>
                        <td>{a.tipo_equipo_nombre || "N/A"}</td>
                        <td>{a.marca}</td>
                        <td>{a.modelo}</td>
                        <td>{a.serial || "NA"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <a
                href={inventoryService.getActaEgresoUrl(detailEgreso.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ textDecoration: "none" }}
              >
                Acta Egreso (3 Firmas)
              </a>
              <a
                href={inventoryService.getActaEntregaEgresoUrl(detailEgreso.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: "none" }}
              >
                Acta Entrega (2 Firmas)
              </a>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDetailEgreso(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
