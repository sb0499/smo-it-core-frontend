import React, { useState, useEffect } from "react";
import { apiClient } from "../services/api";
import { showAlert, showConfirm } from "../utils/alerts";
import "./Inventario.css";

export interface Sucursal {
  id?: number;
  empresa_id?: number;
  nombre: string;
  usuario_id?: number | null;
  usuario_nombre?: string;
  usuario_email?: string;
}

export interface Empresa {
  id: number;
  nombre: string;
  tecnico_principal_id?: number | null;
  tecnico_principal_nombre?: string;
  sucursales?: Sucursal[];
}

export interface TecnicoOption {
  id: number;
  nombre_completo: string;
  email: string;
}

export const Empresas: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [tecnicos, setTecnicos] = useState<TecnicoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [tecnicoPrincipalId, setTecnicoPrincipalId] = useState<number | null>(
    null,
  );

  // Sucursales in form state
  const [hasSucursales, setHasSucursales] = useState(false);
  const [formSucursales, setFormSucursales] = useState<
    { id?: number; nombre: string; usuario_id?: number | null }[]
  >([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [empData, usersData] = await Promise.all([
        apiClient.get<Empresa[]>("/empresas"),
        apiClient.get<any[]>("/usuarios?limit=500").catch(() => []),
      ]);
      setEmpresas(Array.isArray(empData) ? empData : []);

      const techList = Array.isArray(usersData)
        ? usersData.filter(
            (u: any) =>
              u.is_active &&
              (u.rol_nombre === "TECNICO" || u.rol_nombre === "SUPERVISOR") &&
              u.nivel_soporte === "N1",
          )
        : [];
      setTecnicos(techList);
    } catch (err: any) {
      console.error("Error al cargar empresas:", err);
      setError(err.message || "Error al cargar empresas");
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setNombreEmpresa("");
    setTecnicoPrincipalId(null);
    setHasSucursales(false);
    setFormSucursales([]);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (emp: Empresa) => {
    setIsEditing(true);
    setEditingId(emp.id);
    setNombreEmpresa(emp.nombre);
    setTecnicoPrincipalId(emp.tecnico_principal_id || null);
    const existingSuc = emp.sucursales || [];
    setHasSucursales(existingSuc.length > 0);
    setFormSucursales(
      existingSuc.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        usuario_id: s.usuario_id || null,
      })),
    );
    setError(null);
    setShowModal(true);
  };

  const handleAddSucursalRow = () => {
    setFormSucursales((prev) => [...prev, { nombre: "", usuario_id: null }]);
  };

  const handleRemoveSucursalRow = (index: number) => {
    setFormSucursales((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSucursalNameChange = (index: number, value: string) => {
    setFormSucursales((prev) => {
      const updated = [...prev];
      updated[index].nombre = value;
      return updated;
    });
  };

  const handleSucursalTechChange = (
    index: number,
    usuarioId: number | null,
  ) => {
    setFormSucursales((prev) => {
      const updated = [...prev];
      updated[index].usuario_id = usuarioId;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreEmpresa.trim()) {
      setError("Por favor ingresa el nombre de la empresa.");
      return;
    }

    if (hasSucursales) {
      const validSuc = formSucursales.filter((s) => s.nombre.trim());
      if (validSuc.length === 0) {
        setError(
          "Si la empresa tiene sucursales, debes agregar al menos una con nombre.",
        );
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      nombre: nombreEmpresa.trim(),
      tecnico_principal_id: tecnicoPrincipalId || null,
      sucursales: hasSucursales
        ? formSucursales
            .filter((s) => s.nombre.trim())
            .map((s) => ({
              id: s.id,
              nombre: s.nombre.trim(),
              usuario_id: s.usuario_id || null,
            }))
        : [],
    };

    try {
      if (isEditing && editingId) {
        await apiClient.put(`/empresas/${editingId}`, payload);
      } else {
        await apiClient.post("/empresas", payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Error al guardar la empresa.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (emp: Empresa) => {
    if (
      !(await showConfirm(
        `¿Estás seguro de eliminar la empresa "${emp.nombre}"?`,
      ))
    )
      return;

    try {
      await apiClient.delete(`/empresas/${emp.id}`);
      fetchData();
      showAlert("Empresa eliminada exitosamente.");
    } catch (err: any) {
      showAlert("Error al eliminar la empresa: " + err.message);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filteredEmpresas = empresas.filter(
    (emp) =>
      emp.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (emp.tecnico_principal_nombre &&
        emp.tecnico_principal_nombre
          .toLowerCase()
          .includes(search.toLowerCase())) ||
      (emp.sucursales &&
        emp.sucursales.some(
          (s) =>
            s.nombre.toLowerCase().includes(search.toLowerCase()) ||
            (s.usuario_nombre &&
              s.usuario_nombre.toLowerCase().includes(search.toLowerCase())),
        )),
  );

  const totalPages = Math.ceil(filteredEmpresas.length / limit) || 1;
  const paginatedEmpresas = filteredEmpresas.slice((page - 1) * limit, page * limit);

  return (
    <div className="inventario-view animate-fade">
      <div className="view-header">
        <div>
          <h1 className="gradient-text">Empresas y Sucursales</h1>
          <p className="text-muted">
            Gestión de empresas del grupo, asignación de Técnico N1 Principal y
            registro de sucursales
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{ marginRight: "6px" }}
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nueva Empresa
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="filters-card glass-panel"
        style={{
          padding: "16px",
          marginBottom: "24px",
          display: "flex",
          gap: "16px",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por empresa, técnico asignado o sucursal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "40px", width: "100%" }}
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
              left: "14px",
              top: "15px",
              color: "var(--color-text-dim)",
            }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <button className="btn btn-secondary" onClick={fetchData}>
          Actualizar
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px" }}>
          <div
            className="spinner"
            style={{
              display: "inline-block",
              animation: "spin 1s linear infinite",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)"></circle>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path>
            </svg>
          </div>
          <p className="text-muted" style={{ marginTop: "12px" }}>
            Cargando catálogo de empresas...
          </p>
        </div>
      ) : filteredEmpresas.length === 0 ? (
        <div
          className="glass-panel text-center py-5"
          style={{ padding: "40px" }}
        >
          <h3>No se encontraron empresas</h3>
          <p className="text-muted">
            Empieza agregando la primera empresa y sus sucursales.
          </p>
        </div>
      ) : (
        <div className="table-wrapper glass-panel">
          <table className="inventario-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre de Empresa</th>
                <th>Técnico N1 Principal</th>
                <th>Sucursales Registradas</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEmpresas.map((emp) => {
                const hasSuc = emp.sucursales && emp.sucursales.length > 0;
                return (
                  <tr key={emp.id} className="table-row-hover">
                    <td style={{ fontWeight: "600" }}>#{emp.id}</td>
                    <td style={{ fontWeight: "700", fontSize: "15px" }}>
                      {emp.nombre}
                    </td>
                    <td>
                      {emp.tecnico_principal_nombre ? (
                        <span
                          className="badge badge-success"
                          style={{
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "#10b981",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {emp.tecnico_principal_nombre}
                        </span>
                      ) : (
                        <span
                          className="badge badge-secondary"
                          style={{ opacity: 0.7, fontSize: "11px" }}
                        >
                          Auto-balanceo N1
                        </span>
                      )}
                    </td>
                    <td>
                      {hasSuc ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            flexWrap: "wrap",
                          }}
                        >
                          {emp.sucursales!.map((suc) => (
                            <span
                              key={suc.id || suc.nombre}
                              className="badge badge-process"
                              style={{
                                fontSize: "11px",
                                background: "rgba(139,92,246,0.1)",
                                color: "#8b5cf6",
                                border: "1px solid rgba(139,92,246,0.2)",
                              }}
                            >
                              {suc.nombre}{" "}
                              {suc.usuario_nombre
                                ? `( ${suc.usuario_nombre})`
                                : ""}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-dim" style={{ fontSize: "13px" }}>
                          -
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "6px 10px" }}
                          onClick={() => openEditModal(emp)}
                          title="Editar Empresa y Sucursales"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
                          </svg>
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: "6px 10px",
                            color: "#ef4444",
                            borderColor: "rgba(239, 68, 68, 0.3)",
                          }}
                          onClick={() => handleDelete(emp)}
                          title="Eliminar Empresa"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && filteredEmpresas.length > 0 && (
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
              registros por página (Total: {filteredEmpresas.length})
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          className="modal-backdrop animate-fade"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            className="glass-panel animate-slide-up"
            style={{
              width: "100%",
              maxWidth: "640px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              background: "var(--bg-panel)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3>
                {isEditing
                  ? "Editar Empresa y Sucursales"
                  : "Registrar Nueva Empresa"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-text-muted)",
                  fontSize: "22px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {error && (
              <div
                className="login-error-alert"
                style={{
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#fef2f2",
                  border: "1px solid #fee2e2",
                  borderRadius: "8px",
                  padding: "10px 14px",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span
                  className="alert-text"
                  style={{
                    color: "#b91c1c",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  {error}
                </span>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div className="form-group">
                <label className="form-label">
                  NOMBRE DE LA EMPRESA / SEDE *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. CONDADO, SCALA, SMO, DATATRUST..."
                  value={nombreEmpresa}
                  onChange={(e) => setNombreEmpresa(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              {/* Técnico N1 Principal Selection */}
              <div className="form-group">
                <label className="form-label">
                  TÉCNICO N1 PRINCIPAL (ASIGNACIÓN AUTOMÁTICA DE TICKETS)
                </label>
                <select
                  className="form-control"
                  value={tecnicoPrincipalId || 0}
                  onChange={(e) =>
                    setTecnicoPrincipalId(Number(e.target.value) || null)
                  }
                  disabled={submitting}
                >
                  <option value={0}>
                    -- Sin Asignación Fija (Balancear carga entre N1) --
                  </option>
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre_completo} ({t.email})
                    </option>
                  ))}
                </select>
                <small
                  className="text-muted"
                  style={{
                    fontSize: "11.5px",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  Si se selecciona un técnico N1 principal, los nuevos tickets
                  creados para esta sede se le asignarán prioritariamente a él.
                </small>
              </div>

              {/* Checkbox / Toggle for Sucursales */}
              <div
                className="form-group"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    fontWeight: "600",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={hasSucursales}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setHasSucursales(checked);
                      if (checked && formSucursales.length === 0) {
                        setFormSucursales([{ nombre: "", usuario_id: null }]);
                      }
                    }}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <span>Esta empresa cuenta con varias sucursales</span>
                </label>
              </div>

              {/* Dynamic Sucursales list */}
              {hasSucursales && (
                <div
                  className="sucursales-section animate-fade"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <label
                      className="form-label"
                      style={{ margin: 0, fontWeight: "700" }}
                    >
                      LISTA DE SUCURSALES
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddSucursalRow}
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      + Agregar Sucursal
                    </button>
                  </div>

                  {formSucursales.map((suc, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                        flexWrap: "wrap",
                        background: "rgba(255, 255, 255, 0.02)",
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: "180px" }}>
                        <label
                          className="form-label font-xs"
                          style={{ marginBottom: "4px" }}
                        >
                          Nombre Sucursal *
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej. Sucursal Norte, Matriz..."
                          value={suc.nombre}
                          onChange={(e) =>
                            handleSucursalNameChange(idx, e.target.value)
                          }
                          disabled={submitting}
                          required
                        />
                      </div>

                      <div style={{ flex: 1, minWidth: "180px" }}>
                        <label
                          className="form-label font-xs"
                          style={{ marginBottom: "4px" }}
                        >
                          Técnico N1 de Sucursal (Opcional)
                        </label>
                        <select
                          className="form-control"
                          value={suc.usuario_id || 0}
                          onChange={(e) =>
                            handleSucursalTechChange(
                              idx,
                              Number(e.target.value) || null,
                            )
                          }
                          disabled={submitting}
                        >
                          <option value={0}>
                            -- Usar Técnico N1 de Sede --
                          </option>
                          {tecnicos.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nombre_completo}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSucursalRow(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          padding: "6px",
                          marginTop: "16px",
                        }}
                        title="Quitar sucursal"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
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
                  {submitting ? "Guardando..." : "Guardar Empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
