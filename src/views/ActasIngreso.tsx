import React, { useState, useEffect } from "react";
import {
  inventoryService,
  IngresoBodega,
  EgresoBodega,
  Proveedor,
  UpdateIngresoBodegaPayload,
} from "../services/inventory.service";
import { showAlert } from "../utils/alerts";
import { useAuth } from "../context/AuthContext";
import { projectService, User } from "../services/project.service";
import "./Inventario.css";

interface EditActivoItem {
  id: number;
  codigo: string;
  serial: string;
  marca: string;
  modelo: string;
  especificaciones: string;
  tipo_equipo_id: number;
  bodega_id: number;
  estado: string;
}

interface EditActivoNuevoItem {
  tempId: string;
  tipo_equipo_id: number;
  marca: string;
  modelo: string;
  serial: string;
  especificaciones: string;
  bodega_id?: number;
}

export const ActasIngreso: React.FC = () => {
  const { user } = useAuth();
  const [loggedInTech, setLoggedInTech] = useState<User | null>(null);

  useEffect(() => {
    if (user) {
      projectService.getUsuarios().then(users => {
        const me = users.find(u => u.id === user.id);
        if (me) setLoggedInTech(me);
      }).catch(() => {});
    }
  }, [user]);

  const [activeTab, setActiveTab] = useState<
    "ingresos" | "egresos" | "entrega" | "recepciones"
  >("ingresos");
  const [ingresos, setIngresos] = useState<IngresoBodega[]>([]);
  const [egresos, setEgresos] = useState<EgresoBodega[]>([]);
  const [recepciones, setRecepciones] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);

  // Additional catalogs for editing
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [tipoEquipos, setTipoEquipos] = useState<any[]>([]);
  const [bodegas, setBodegas] = useState<any[]>([]);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingIngreso, setEditingIngreso] = useState<IngresoBodega | null>(null);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editSaving, setEditSaving] = useState<boolean>(false);
  const [editActiveTab, setEditActiveTab] = useState<'bienes' | 'cabecera' | 'agregar' | 'historial'>('bienes');

  // Edit Form Fields
  const [editProveedorId, setEditProveedorId] = useState<number>(0);
  const [editNroOrdenCompra, setEditNroOrdenCompra] = useState<string>('');
  const [editNroFactura, setEditNroFactura] = useState<string>('');
  const [editNroSolicitudPago, setEditNroSolicitudPago] = useState<string>('');
  const [editFechaCompra, setEditFechaCompra] = useState<string>('');
  const [editFechaIngreso, setEditFechaIngreso] = useState<string>('');
  const [editDescripcion, setEditDescripcion] = useState<string>('');
  const [editRevisadoPor, setEditRevisadoPor] = useState<string>('Paulina Porras');
  const [editRevisadoPorCargo, setEditRevisadoPorCargo] = useState<string>('GERENTE DE TI');

  // Existing assets in editing
  const [editActivosExistentes, setEditActivosExistentes] = useState<EditActivoItem[]>([]);
  const [editActivosEliminarIds, setEditActivosEliminarIds] = useState<number[]>([]);

  // Staged new assets to add
  const [editActivosNuevos, setEditActivosNuevos] = useState<EditActivoNuevoItem[]>([]);

  // New asset staging inputs
  const [newTipoEquipoId, setNewTipoEquipoId] = useState<number>(0);
  const [newMarca, setNewMarca] = useState<string>('');
  const [newModelo, setNewModelo] = useState<string>('');
  const [newSerial, setNewSerial] = useState<string>('');
  const [newEspecificaciones, setNewEspecificaciones] = useState<string>('');
  const [newBodegaId, setNewBodegaId] = useState<number>(0);
  const [newEsLote, setNewEsLote] = useState<boolean>(false);
  const [newCantidad, setNewCantidad] = useState<number>(1);

  const [detailIngreso, setDetailIngreso] = useState<IngresoBodega | null>(
    null,
  );
  const [detailEgreso, setDetailEgreso] = useState<EgresoBodega | null>(null);

  const userEmpresaIds = loggedInTech?.empresa_ids || [];
  const isManagementRole = user?.rol === 'ADMIN' || user?.rol === 'SUPERVISOR';
  const allowedEmpresas = isManagementRole || !userEmpresaIds.length
    ? empresas
    : empresas.filter((c) => userEmpresaIds.includes(c.id));
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number>(0);
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const totalPages = Math.ceil(totalItems / 10) || 1;

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

  const canEditIngreso = (ing: IngresoBodega | null) => {
    if (!user || !ing) return false;
    if (user.rol === 'ADMIN' || user.rol === 'SUPERVISOR') return true;
    if (user.rol === 'TECNICO') {
      if (ing.realizado_por_id === user.id) return true;
      if (userEmpresaIds.length === 0 || userEmpresaIds.includes(ing.empresa_id)) return true;
    }
    return false;
  };

  const openEditIngreso = async (id: number) => {
    try {
      setEditLoading(true);
      setEditModalOpen(true);

      const [full, provsRes, tiposRes] = await Promise.all([
        inventoryService.getIngresoBodegaById(id),
        proveedores.length > 0 ? Promise.resolve(proveedores) : inventoryService.getProveedores().catch(() => []),
        tipoEquipos.length > 0 ? Promise.resolve(tipoEquipos) : inventoryService.getTipoEquipos().catch(() => []),
      ]);

      if (!full) throw new Error('Ingreso no encontrado');

      const bodegasRes = await inventoryService.getBodegas(undefined, undefined, '', full.empresa_id, true).catch(() => []);

      setProveedores(Array.isArray(provsRes) ? provsRes : []);
      setTipoEquipos(Array.isArray(tiposRes?.data) ? tiposRes.data : (Array.isArray(tiposRes) ? tiposRes : []));
      setBodegas(Array.isArray(bodegasRes?.data) ? bodegasRes.data : (Array.isArray(bodegasRes) ? bodegasRes : []));

      setEditingIngreso(full);
      setEditActiveTab('bienes');
      setEditProveedorId(full.proveedor_id || 0);
      setEditNroOrdenCompra(full.nro_orden_compra || '');
      setEditNroFactura(full.nro_factura || '');
      setEditNroSolicitudPago(full.nro_solicitud_pago || '');
      setEditFechaCompra(full.fecha_compra ? full.fecha_compra.split('T')[0] : '');
      setEditFechaIngreso(full.fecha_ingreso ? full.fecha_ingreso.split('T')[0] : '');
      setEditDescripcion(full.descripcion || '');
      setEditRevisadoPor(full.revisado_por || 'Paulina Porras');
      setEditRevisadoPorCargo(full.revisado_por_cargo || 'GERENTE DE TI');

      setEditActivosExistentes((full.activos || []).map((a: any) => ({
        id: a.id,
        codigo: a.codigo,
        serial: a.serial || '',
        marca: a.marca || '',
        modelo: a.modelo || '',
        especificaciones: a.especificaciones || '',
        tipo_equipo_id: a.tipo_equipo_id || 0,
        bodega_id: a.bodega_id || 0,
        estado: a.estado || 'Stock'
      })));
      setEditActivosEliminarIds([]);
      setEditActivosNuevos([]);

      setNewTipoEquipoId(0);
      setNewMarca('');
      setNewModelo('');
      setNewSerial('');
      setNewEspecificaciones('');
      setNewBodegaId(0);
      setNewEsLote(false);
      setNewCantidad(1);
    } catch (err: any) {
      showAlert('Error al preparar edición del acta: ' + (err.message || 'Error del servidor'));
      setEditModalOpen(false);
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddNewAssetToEdit = () => {
    if (newTipoEquipoId <= 0) {
      showAlert('Seleccione un Tipo de Equipo para el nuevo activo');
      return;
    }
    if (!newMarca.trim()) {
      showAlert('Ingrese la Marca del nuevo activo');
      return;
    }
    if (!newModelo.trim()) {
      showAlert('Ingrese el Modelo del nuevo activo');
      return;
    }

    const count = (newEsLote && newCantidad > 1) ? newCantidad : 1;
    const newItems: EditActivoNuevoItem[] = [];
    for (let i = 0; i < count; i++) {
      newItems.push({
        tempId: 'new_' + Date.now() + '_' + i,
        tipo_equipo_id: newTipoEquipoId,
        marca: newMarca.trim(),
        modelo: newModelo.trim(),
        serial: newSerial.trim() || 'NA',
        especificaciones: newEspecificaciones.trim(),
        bodega_id: newBodegaId > 0 ? newBodegaId : undefined,
      });
    }

    setEditActivosNuevos(prev => [...prev, ...newItems]);
    setNewTipoEquipoId(0);
    setNewMarca('');
    setNewModelo('');
    setNewSerial('');
    setNewEspecificaciones('');
    setNewBodegaId(0);
    setNewEsLote(false);
    setNewCantidad(1);
  };

  const handleSaveEditIngreso = async () => {
    if (!editingIngreso) return;
    if (!editFechaCompra || !editFechaIngreso) {
      showAlert('Las fechas de compra e ingreso son obligatorias');
      return;
    }
    if (!editDescripcion.trim()) {
      showAlert('La descripción de la compra es obligatoria');
      return;
    }

    const activeExistingCount = editActivosExistentes.filter(a => !editActivosEliminarIds.includes(a.id)).length;
    const totalFinalCount = activeExistingCount + editActivosNuevos.length;
    if (totalFinalCount === 0) {
      showAlert('El acta debe tener al menos un bien activo.');
      return;
    }

    try {
      setEditSaving(true);

      const payload: UpdateIngresoBodegaPayload = {
        proveedor_id: editProveedorId > 0 ? editProveedorId : null,
        nro_orden_compra: editNroOrdenCompra.trim() || null,
        nro_factura: editNroFactura.trim() || null,
        nro_solicitud_pago: editNroSolicitudPago.trim() || null,
        fecha_compra: editFechaCompra,
        fecha_ingreso: editFechaIngreso,
        descripcion: editDescripcion.trim(),
        revisado_por: editRevisadoPor.trim(),
        revisado_por_cargo: editRevisadoPorCargo.trim(),
        activos_eliminar_ids: editActivosEliminarIds,
        activos_actualizar: editActivosExistentes
          .filter(a => !editActivosEliminarIds.includes(a.id))
          .map(a => ({
            id: a.id,
            serial: a.serial.trim(),
            marca: a.marca.trim(),
            modelo: a.modelo.trim(),
            especificaciones: a.especificaciones.trim() || undefined,
            tipo_equipo_id: a.tipo_equipo_id,
            bodega_id: a.bodega_id > 0 ? a.bodega_id : undefined,
          })),
        activos_nuevos: editActivosNuevos.map(n => ({
          tipo_equipo_id: n.tipo_equipo_id,
          marca: n.marca.trim(),
          modelo: n.modelo.trim(),
          serial: n.serial.trim() || 'NA',
          especificaciones: n.especificaciones.trim() || undefined,
          bodega_id: n.bodega_id && n.bodega_id > 0 ? n.bodega_id : undefined,
        }))
      };

      const updated = await inventoryService.updateIngresoBodega(editingIngreso.id, payload);
      showAlert('¡Acta de Ingreso actualizada exitosamente!', 'success');
      setEditModalOpen(false);
      setEditingIngreso(null);
      fetchData();

      if (detailIngreso && detailIngreso.id === updated.id) {
        setDetailIngreso(updated);
      }
    } catch (err: any) {
      showAlert('Error al actualizar acta de ingreso: ' + (err.message || 'Error del servidor'));
    } finally {
      setEditSaving(false);
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
              {allowedEmpresas.map((emp) => (
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
                    <td>{ing.nro_orden_compra || "-"}</td>
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
                        {canEditIngreso(ing) && (
                          <button
                            type="button"
                            className="btn btn-warning btn-sm"
                            onClick={() => openEditIngreso(ing.id)}
                            title="Editar Acta de Ingreso"
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Editar
                          </button>
                        )}
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
                  {detailIngreso.nro_orden_compra || "N/A"}
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

              {detailIngreso.historial_ediciones && detailIngreso.historial_ediciones.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                  <h4 style={{ marginBottom: "8px", color: "var(--color-text-dim)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Historial de Modificaciones del Acta ({detailIngreso.historial_ediciones.length})
                  </h4>
                  <div style={{ maxHeight: "120px", overflowY: "auto", background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "10px", fontSize: "12px" }}>
                    {detailIngreso.historial_ediciones.map((h: any) => (
                      <div key={h.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px", marginBottom: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-primary)", fontWeight: "600" }}>
                          <span>{h.usuario_nombre || "Usuario"}</span>
                          <span style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>{new Date(h.fecha).toLocaleString()}</span>
                        </div>
                        <div style={{ color: "var(--color-text-main)", marginTop: "2px" }}>{h.cambios}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions" style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                {canEditIngreso(detailIngreso) && (
                  <button
                    type="button"
                    className="btn btn-warning"
                    onClick={() => {
                      const id = detailIngreso.id;
                      setDetailIngreso(null);
                      openEditIngreso(id);
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Editar Acta
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
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
        </div>
      )}

      {/* MODAL EDITAR INGRESO */}
      {editModalOpen && (
        <div
          className="modal-overlay animate-fade"
          style={{
            zIndex: 9999,
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="modal-container glass-panel animate-slide-up"
            style={{
              maxWidth: "1100px",
              width: "95vw",
              height: "90vh",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              padding: "24px 28px",
              borderRadius: "16px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.45)",
            }}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                flexShrink: 0,
                paddingBottom: "14px",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>
                    Editar Acta de Ingreso
                  </h2>
                  {editingIngreso && (
                    <>
                      <span className="badge badge-primary" style={{ fontSize: "13px", padding: "4px 10px" }}>
                        {editingIngreso.codigo_ingreso}
                      </span>
                      <span className="badge badge-info" style={{ fontSize: "12px", padding: "4px 10px" }}>
                        {editingIngreso.empresa_nombre || "Sede"}
                      </span>
                    </>
                  )}
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--color-text-dim)" }}>
                  Modifica los datos de compra, corrige activos registrados o agrega bienes faltantes a esta misma acta.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => {
                  if (!editSaving) {
                    setEditModalOpen(false);
                    setEditingIngreso(null);
                  }
                }}
                disabled={editSaving}
                style={{ fontSize: "24px", lineHeight: "1" }}
              >
                ×
              </button>
            </div>

            {/* Segmented Navigation Tabs inside Modal */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                padding: "12px 0",
                borderBottom: "1px solid var(--border-color)",
                flexShrink: 0,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className={`btn btn-sm ${editActiveTab === "bienes" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setEditActiveTab("bienes")}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "600" }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <span>Bienes Registrados</span>
                <span
                  className="badge"
                  style={{
                    background: editActiveTab === "bienes" ? "rgba(255,255,255,0.25)" : "var(--bg-panel)",
                    fontSize: "11px",
                    padding: "2px 6px",
                  }}
                >
                  {editActivosExistentes.filter((a) => !editActivosEliminarIds.includes(a.id)).length}
                </span>
              </button>

              <button
                type="button"
                className={`btn btn-sm ${editActiveTab === "cabecera" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setEditActiveTab("cabecera")}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "600" }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>Datos de Compra y Factura</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm ${editActiveTab === "agregar" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setEditActiveTab("agregar")}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "600" }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>+ Agregar Bienes Faltantes</span>
                {editActivosNuevos.length > 0 && (
                  <span className="badge badge-success" style={{ fontSize: "11px", padding: "2px 6px" }}>
                    +{editActivosNuevos.length}
                  </span>
                )}
              </button>

              {editingIngreso?.historial_ediciones && editingIngreso.historial_ediciones.length > 0 && (
                <button
                  type="button"
                  className={`btn btn-sm ${editActiveTab === "historial" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setEditActiveTab("historial")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "600" }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Historial ({editingIngreso.historial_ediciones.length})</span>
                </button>
              )}
            </div>

            {/* Modal Body with Active Tab Content */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 4px 10px 0",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              {editLoading ? (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <p className="text-muted">Cargando información del acta...</p>
                </div>
              ) : editingIngreso ? (
                <>
                  {/* TAB 1: BIENES REGISTRADOS */}
                  {editActiveTab === "bienes" && (
                    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "rgba(59, 130, 246, 0.08)",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: "12.5px", color: "var(--color-text-main)" }}>
                          💡 <strong>Corrección de activos:</strong> Edita directamente la serie, marca, modelo, tipo de equipo o bodega. Para eliminar un ítem registrado por error, haz clic en el botón ✕ (solo permitido si está en Stock).
                        </p>
                        {editActivosEliminarIds.length > 0 && (
                          <span className="badge badge-danger" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
                            {editActivosEliminarIds.length} marcado(s) para eliminar
                          </span>
                        )}
                      </div>

                      <div
                        className="table-wrapper"
                        style={{
                          flex: 1,
                          overflowY: "auto",
                          overflowX: "auto",
                          border: "1px solid var(--border-color)",
                          borderRadius: "10px",
                          background: "var(--bg-panel)",
                          minHeight: "340px",
                        }}
                      >
                        <table className="inventario-table" style={{ fontSize: "12px", width: "100%" }}>
                          <thead>
                            <tr style={{ position: "sticky", top: 0, background: "var(--bg-panel)", zIndex: 2 }}>
                              <th style={{ minWidth: "120px" }}>CÓDIGO</th>
                              <th style={{ minWidth: "150px" }}>TIPO DE EQUIPO</th>
                              <th style={{ minWidth: "120px" }}>MARCA</th>
                              <th style={{ minWidth: "130px" }}>MODELO</th>
                              <th style={{ minWidth: "140px" }}>SERIE (SERIAL)</th>
                              <th style={{ minWidth: "160px" }}>ESPECIFICACIONES</th>
                              <th style={{ minWidth: "130px" }}>BODEGA</th>
                              <th style={{ width: "90px", textAlign: "center" }}>ESTADO</th>
                              <th style={{ width: "90px", textAlign: "center" }}>ACCIÓN</th>
                            </tr>
                          </thead>
                          <tbody>
                            {editActivosExistentes.map((act, index) => {
                              const isDeleted = editActivosEliminarIds.includes(act.id);
                              const isStock = act.estado === "Stock";

                              return (
                                <tr
                                  key={act.id}
                                  style={{
                                    opacity: isDeleted ? 0.45 : 1,
                                    background: isDeleted ? "rgba(239, 68, 68, 0.08)" : undefined,
                                    textDecoration: isDeleted ? "line-through" : "none",
                                  }}
                                >
                                  <td style={{ fontWeight: "700", color: isDeleted ? "inherit" : "var(--color-primary)" }}>
                                    {act.codigo}
                                  </td>
                                  <td>
                                    <select
                                      className="form-control"
                                      style={{ padding: "4px 8px", fontSize: "12px", height: "32px" }}
                                      value={act.tipo_equipo_id}
                                      disabled={isDeleted}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setEditActivosExistentes((prev) =>
                                          prev.map((item, i) => (i === index ? { ...item, tipo_equipo_id: val } : item))
                                        );
                                      }}
                                    >
                                      <option value={0}>-- Seleccione --</option>
                                      {tipoEquipos.map((te) => (
                                        <option key={te.id} value={te.id}>
                                          {te.nombre}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                      style={{ padding: "4px 8px", fontSize: "12px", height: "32px" }}
                                      value={act.marca}
                                      disabled={isDeleted}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditActivosExistentes((prev) =>
                                          prev.map((item, i) => (i === index ? { ...item, marca: val } : item))
                                        );
                                      }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                      style={{ padding: "4px 8px", fontSize: "12px", height: "32px" }}
                                      value={act.modelo}
                                      disabled={isDeleted}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditActivosExistentes((prev) =>
                                          prev.map((item, i) => (i === index ? { ...item, modelo: val } : item))
                                        );
                                      }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                      style={{ padding: "4px 8px", fontSize: "12px", height: "32px" }}
                                      value={act.serial}
                                      disabled={isDeleted}
                                      placeholder="NA"
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditActivosExistentes((prev) =>
                                          prev.map((item, i) => (i === index ? { ...item, serial: val } : item))
                                        );
                                      }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                      style={{ padding: "4px 8px", fontSize: "12px", height: "32px" }}
                                      value={act.especificaciones}
                                      disabled={isDeleted}
                                      placeholder="Ej: Core i5, 16GB..."
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditActivosExistentes((prev) =>
                                          prev.map((item, i) => (i === index ? { ...item, especificaciones: val } : item))
                                        );
                                      }}
                                    />
                                  </td>
                                  <td>
                                    <select
                                      className="form-control"
                                      style={{ padding: "4px 8px", fontSize: "12px", height: "32px" }}
                                      value={act.bodega_id || 0}
                                      disabled={isDeleted}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setEditActivosExistentes((prev) =>
                                          prev.map((item, i) => (i === index ? { ...item, bodega_id: val } : item))
                                        );
                                      }}
                                    >
                                      <option value={0}>Principal</option>
                                      {bodegas.map((b) => (
                                        <option key={b.id} value={b.id}>
                                          {b.nombre}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td style={{ textAlign: "center" }}>
                                    <span
                                      className={`badge ${act.estado === "Stock" ? "badge-success" : "badge-process"}`}
                                      style={{ fontSize: "11px" }}
                                    >
                                      {act.estado}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: "center" }}>
                                    {isDeleted ? (
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        style={{ padding: "3px 8px", fontSize: "11px" }}
                                        onClick={() =>
                                          setEditActivosEliminarIds((prev) => prev.filter((id) => id !== act.id))
                                        }
                                        title="Deshacer eliminación"
                                      >
                                        Restaurar
                                      </button>
                                    ) : isStock ? (
                                      <button
                                        type="button"
                                        className="btn btn-danger btn-sm"
                                        style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center" }}
                                        onClick={() => setEditActivosEliminarIds((prev) => [...prev, act.id])}
                                        title="Eliminar este activo del acta"
                                      >
                                        ✕
                                      </button>
                                    ) : (
                                      <span
                                        title="No se puede eliminar porque ya tiene asignación o egreso"
                                        style={{ fontSize: "11px", color: "var(--color-text-dim)" }}
                                      >
                                        Protegido
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: DATOS DE COMPRA Y FACTURA */}
                  {editActiveTab === "cabecera" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div className="glass-panel" style={{ padding: "20px", borderRadius: "12px" }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: "16px",
                          }}
                        >
                          <div>
                            <label className="form-label">Proveedor</label>
                            <select
                              className="form-control"
                              value={editProveedorId}
                              onChange={(e) => setEditProveedorId(Number(e.target.value))}
                            >
                              <option value={0}>-- Sin proveedor --</option>
                              {proveedores.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="form-label">Nro. Orden de Compra (Opcional)</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editNroOrdenCompra}
                              onChange={(e) => setEditNroOrdenCompra(e.target.value)}
                              placeholder="OC-2026-... (opcional)"
                            />
                          </div>

                          <div>
                            <label className="form-label">Nro. Factura</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editNroFactura}
                              onChange={(e) => setEditNroFactura(e.target.value)}
                              placeholder="001-001-..."
                            />
                          </div>

                          <div>
                            <label className="form-label">Nro. Solicitud de Pago</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editNroSolicitudPago}
                              onChange={(e) => setEditNroSolicitudPago(e.target.value)}
                              placeholder="SP-..."
                            />
                          </div>

                          <div>
                            <label className="form-label">Fecha de Compra *</label>
                            <input
                              type="date"
                              className="form-control"
                              value={editFechaCompra}
                              onChange={(e) => setEditFechaCompra(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="form-label">Fecha de Ingreso a Bodega *</label>
                            <input
                              type="date"
                              className="form-control"
                              value={editFechaIngreso}
                              onChange={(e) => setEditFechaIngreso(e.target.value)}
                            />
                          </div>
                        </div>

                        <div style={{ marginTop: "16px" }}>
                          <label className="form-label">Descripción / Justificación de la Adquisición *</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            value={editDescripcion}
                            onChange={(e) => setEditDescripcion(e.target.value)}
                            placeholder="Detalle o justificación de la compra..."
                          />
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "16px",
                            marginTop: "16px",
                          }}
                        >
                          <div>
                            <label className="form-label">Revisado Por</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editRevisadoPor}
                              onChange={(e) => setEditRevisadoPor(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="form-label">Cargo de quien revisa</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editRevisadoPorCargo}
                              onChange={(e) => setEditRevisadoPorCargo(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: AGREGAR BIENES FALTANTES */}
                  {editActiveTab === "agregar" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div className="glass-panel" style={{ padding: "20px", borderRadius: "12px" }}>
                        <h4 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px", color: "var(--color-primary)" }}>
                          Ingresar Activo Adicional a esta Compra
                        </h4>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "12px",
                            alignItems: "flex-end",
                          }}
                        >
                          <div>
                            <label className="form-label" style={{ fontSize: "12px" }}>Tipo de Equipo *</label>
                            <select
                              className="form-control"
                              style={{ fontSize: "12px", height: "36px" }}
                              value={newTipoEquipoId}
                              onChange={(e) => setNewTipoEquipoId(Number(e.target.value))}
                            >
                              <option value={0}>-- Seleccione --</option>
                              {tipoEquipos.map((te) => (
                                <option key={te.id} value={te.id}>
                                  {te.nombre}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="form-label" style={{ fontSize: "12px" }}>Marca *</label>
                            <input
                              type="text"
                              className="form-control"
                              style={{ fontSize: "12px", height: "36px" }}
                              placeholder="Ej: Dell, HP..."
                              value={newMarca}
                              onChange={(e) => setNewMarca(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="form-label" style={{ fontSize: "12px" }}>Modelo *</label>
                            <input
                              type="text"
                              className="form-control"
                              style={{ fontSize: "12px", height: "36px" }}
                              placeholder="Ej: Latitude 3420"
                              value={newModelo}
                              onChange={(e) => setNewModelo(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="form-label" style={{ fontSize: "12px" }}>Serie (Serial)</label>
                            <input
                              type="text"
                              className="form-control"
                              style={{ fontSize: "12px", height: "36px" }}
                              placeholder="NA si no aplica"
                              value={newSerial}
                              onChange={(e) => setNewSerial(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="form-label" style={{ fontSize: "12px" }}>Bodega Destino</label>
                            <select
                              className="form-control"
                              style={{ fontSize: "12px", height: "36px" }}
                              value={newBodegaId}
                              onChange={(e) => setNewBodegaId(Number(e.target.value))}
                            >
                              <option value={0}>Principal de la Sede</option>
                              {bodegas.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "2fr 1fr 1fr auto",
                            gap: "12px",
                            alignItems: "flex-end",
                            marginTop: "12px",
                          }}
                        >
                          <div>
                            <label className="form-label" style={{ fontSize: "12px" }}>Especificaciones (Opcional)</label>
                            <input
                              type="text"
                              className="form-control"
                              style={{ fontSize: "12px", height: "36px" }}
                              placeholder="Ej: Core i5, 16GB RAM, SSD 512GB..."
                              value={newEspecificaciones}
                              onChange={(e) => setNewEspecificaciones(e.target.value)}
                            />
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "36px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12.5px", userSelect: "none" }}>
                              <input
                                type="checkbox"
                                checked={newEsLote}
                                onChange={(e) => setNewEsLote(e.target.checked)}
                              />
                              Por lote (cantidad)
                            </label>
                          </div>

                          {newEsLote ? (
                            <div>
                              <label className="form-label" style={{ fontSize: "12px" }}>Cantidad</label>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                className="form-control"
                                style={{ fontSize: "12px", height: "36px" }}
                                value={newCantidad}
                                onChange={(e) => setNewCantidad(Math.max(1, Number(e.target.value)))}
                              />
                            </div>
                          ) : (
                            <div />
                          )}

                          <div>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{
                                height: "36px",
                                padding: "0 18px",
                                fontSize: "12px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                whiteSpace: "nowrap",
                              }}
                              onClick={handleAddNewAssetToEdit}
                            >
                              <span>+ Añadir a la lista</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Lista de activos por agregarse */}
                      <div className="glass-panel" style={{ padding: "16px", borderRadius: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <h5 style={{ fontSize: "13px", fontWeight: "600", margin: 0, color: editActivosNuevos.length > 0 ? "var(--color-success)" : "var(--color-text-dim)" }}>
                            Bienes que se agregarán al guardar ({editActivosNuevos.length})
                          </h5>
                          {editActivosNuevos.length > 0 && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: "11px", padding: "2px 8px" }}
                              onClick={() => setEditActivosNuevos([])}
                            >
                              Limpiar lista
                            </button>
                          )}
                        </div>

                        {editActivosNuevos.length === 0 ? (
                          <p style={{ margin: "10px 0", fontSize: "12px", color: "var(--color-text-dim)", textAlign: "center" }}>
                            No hay bienes adicionales pendientes de agregar. Usa el formulario de arriba para incorporar los que hayan faltado.
                          </p>
                        ) : (
                          <div className="table-wrapper" style={{ maxHeight: "200px", overflowY: "auto" }}>
                            <table className="inventario-table" style={{ fontSize: "12px" }}>
                              <thead>
                                <tr>
                                  <th>TIPO</th>
                                  <th>MARCA</th>
                                  <th>MODELO</th>
                                  <th>SERIE</th>
                                  <th>ESPECIFICACIONES</th>
                                  <th style={{ width: "60px", textAlign: "center" }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {editActivosNuevos.map((item, i) => (
                                  <tr key={item.tempId}>
                                    <td>
                                      {tipoEquipos.find((t) => t.id === item.tipo_equipo_id)?.nombre || "Equipo"}
                                    </td>
                                    <td>{item.marca}</td>
                                    <td>{item.modelo}</td>
                                    <td>{item.serial || "NA"}</td>
                                    <td>{item.especificaciones || "-"}</td>
                                    <td style={{ textAlign: "center" }}>
                                      <button
                                        type="button"
                                        className="btn btn-danger btn-sm"
                                        style={{ padding: "3px 8px", fontSize: "11px" }}
                                        onClick={() => setEditActivosNuevos((prev) => prev.filter((_, idx) => idx !== i))}
                                        title="Quitar de la lista"
                                      >
                                        ✕
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: HISTORIAL DE MODIFICACIONES */}
                  {editActiveTab === "historial" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "var(--color-text-dim)" }}>
                        Registro de auditoría de todas las modificaciones realizadas a esta Acta de Ingreso:
                      </p>
                      <div
                        style={{
                          maxHeight: "360px",
                          overflowY: "auto",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {editingIngreso?.historial_ediciones?.map((h: any) => (
                          <div
                            key={h.id}
                            className="glass-panel"
                            style={{
                              padding: "12px 16px",
                              borderRadius: "10px",
                              background: "rgba(255,255,255,0.02)",
                              borderLeft: "3px solid var(--color-primary)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontWeight: "600", color: "var(--color-primary)", fontSize: "13px" }}>
                                {h.usuario_nombre || "Usuario"}
                              </span>
                              <span style={{ fontSize: "12px", color: "var(--color-text-dim)" }}>
                                {new Date(h.fecha).toLocaleString()}
                              </span>
                            </div>
                            <div style={{ fontSize: "12.5px", color: "var(--color-text-main)", lineHeight: "1.4" }}>
                              {h.cambios}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Actions Footer */}
            <div
              className="modal-actions"
              style={{
                marginTop: "12px",
                paddingTop: "14px",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: "13px", color: "var(--color-text-dim)" }}>
                {editingIngreso && (
                  <span>
                    Total activos en acta:{" "}
                    <strong style={{ color: "var(--color-text-main)", fontSize: "14px" }}>
                      {editActivosExistentes.filter((a) => !editActivosEliminarIds.includes(a.id)).length +
                        editActivosNuevos.length}
                    </strong>
                    {editActivosNuevos.length > 0 && (
                      <span style={{ color: "var(--color-success)", marginLeft: "6px" }}>
                        (+{editActivosNuevos.length} nuevos)
                      </span>
                    )}
                    {editActivosEliminarIds.length > 0 && (
                      <span style={{ color: "var(--color-danger)", marginLeft: "6px" }}>
                        (-{editActivosEliminarIds.length} eliminados)
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingIngreso(null);
                  }}
                  disabled={editSaving}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveEditIngreso}
                  disabled={editSaving || editLoading}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: "600" }}
                >
                  {editSaving ? "Guardando cambios..." : "Guardar Cambios y Actualizar Acta"}
                </button>
              </div>
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
