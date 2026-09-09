import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { kbService, ArticuloKB } from "../services/kb.service";
import { ticketService } from "../services/ticket.service";
import { showAlert, showConfirm } from "../utils/alerts";
import { formatLocalDateSimple } from "../utils/date";
import "./Inventario.css";

export const BaseConocimiento: React.FC = () => {
  const { user } = useAuth();
  const canManage =
    user?.rol === "ADMIN" ||
    user?.rol === "SUPERVISOR" ||
    user?.rol === "TECNICO";

  const [articulos, setArticulos] = useState<ArticuloKB[]>([]);
  const [categoriesList, setCategoriesList] = useState<
    { id: number; nombre: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("todas");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Expanded article cards state
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("Sistemas");
  const [pasosSolucion, setPasosSolucion] = useState("");
  const [ticketOrigenId, setTicketOrigenId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalArticulos, setTotalArticulos] = useState(0);

  const fetchArticulos = async (
    pageNum = page,
    searchVal = debouncedSearch,
    catVal = selectedCat,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await kbService.getArticulos(searchVal, catVal, pageNum, 10);
      setArticulos(res.data);
      setTotalArticulos(res.total);
    } catch (err: any) {
      setError(
        err.message ||
          "Error al cargar los artículos de la Base de Conocimientos.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ticketService
      .getCategorias()
      .then((cats) => {
        setCategoriesList(cats);
      })
      .catch(() => []);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCat]);

  useEffect(() => {
    fetchArticulos(page, debouncedSearch, selectedCat);
  }, [page, debouncedSearch, selectedCat]);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitulo("");
    setCategoria(categoriesList[0]?.nombre || "Sistemas");
    setPasosSolucion("");
    setTicketOrigenId(null);
    setShowModal(true);
  };

  const openEditModal = (art: ArticuloKB) => {
    setIsEditing(true);
    setEditingId(art.id);
    setTitulo(art.titulo);
    setCategoria(art.categoria);
    setPasosSolucion(art.pasos_solucion);
    setTicketOrigenId(art.ticket_origen_id || null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !pasosSolucion.trim()) {
      showAlert(
        "Por favor completa el título y el paso a paso de la solución.",
      );
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing && editingId) {
        await kbService.updateArticulo(editingId, {
          titulo,
          categoria,
          pasos_solucion: pasosSolucion,
        });
        showAlert("Guía actualizada exitosamente.");
      } else {
        await kbService.createArticulo({
          titulo,
          categoria,
          pasos_solucion: pasosSolucion,
          ticket_origen_id: ticketOrigenId,
        });
        showAlert("Guía publicada en la Base de Conocimientos exitosamente.");
      }
      setShowModal(false);
      fetchArticulos(page, debouncedSearch, selectedCat);
    } catch (err: any) {
      showAlert(
        "Error al guardar la guía: " + (err.message || "Error desconocido"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (
      !(await showConfirm(
        "¿Estás seguro de eliminar este artículo de la Base de Conocimientos?",
      ))
    )
      return;
    try {
      await kbService.deleteArticulo(id);
      showAlert("Artículo eliminado.");
      fetchArticulos(page, debouncedSearch, selectedCat);
    } catch (err: any) {
      showAlert("Error al eliminar: " + err.message);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="inventario-view animate-fade">
      <div
        className="view-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h1
            className="gradient-text"
            style={{ fontSize: "24px", fontWeight: "bold" }}
          >
            📚 Base de Conocimientos TI
          </h1>
          <p
            className="text-muted"
            style={{ fontSize: "13px", marginTop: "4px" }}
          >
            Soluciones paso a paso y guías de autoayuda para problemas comunes
            de la empresa.
          </p>
        </div>
        {canManage && (
          <button
            className="btn btn-primary"
            onClick={openCreateModal}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Nueva Guía / Artículo
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div
        className="filters-card glass-panel"
        style={{
          padding: "16px",
          marginBottom: "20px",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar soluciones, errores o palabras clave..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "38px", width: "100%" }}
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
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: "bold",
              color: "var(--color-text-muted)",
            }}
          >
            Categoría:
          </span>
          <select
            className="form-control"
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            style={{ width: "170px" }}
          >
            <option value="todas">Todas las Categorías</option>
            {categoriesList.map((c) => (
              <option key={c.id} value={c.nombre}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px" }}>
          <div className="loader" style={{ margin: "0 auto 14px" }}></div>
          <p className="text-muted">Cargando base de conocimientos...</p>
        </div>
      ) : error ? (
        <div
          className="glass-panel"
          style={{ padding: "24px", textAlign: "center", color: "#f87171" }}
        >
          <p>{error}</p>
          <button
            className="btn btn-secondary"
            onClick={() => fetchArticulos(page, debouncedSearch, selectedCat)}
            style={{ marginTop: "10px" }}
          >
            Reintentar
          </button>
        </div>
      ) : articulos.length === 0 ? (
        <div
          className="glass-panel text-center"
          style={{ padding: "50px 20px", textAlign: "center" }}
        >
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>🔍</div>
          <h3 style={{ fontSize: "16px", fontWeight: "600" }}>
            No se encontraron guías en la Base de Conocimientos
          </h3>
          <p
            className="text-muted"
            style={{ fontSize: "13px", marginTop: "6px" }}
          >
            Intenta buscando con otros términos o crea una nueva solución paso a
            paso.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {articulos.map((art) => {
            const isExpanded = expandedId === art.id;
            return (
              <div
                key={art.id}
                className="glass-panel animate-slide-up"
                style={{
                  padding: "16px 20px",
                  borderRadius: "10px",
                  border: "1px solid #f1f5f9",
                  background: "#ffffff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleExpand(art.id)}
                >
                  <div style={{ flex: 1, paddingRight: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        className="badge badge-process"
                        style={{
                          fontSize: "10.5px",
                          background: "rgba(37,99,235,0.1)",
                          color: "#2563eb",
                          border: "1px solid rgba(37,99,235,0.2)",
                          fontWeight: "600",
                        }}
                      >
                        {art.categoria}
                      </span>
                      {art.ticket_origen_id && (
                        <span
                          className="badge badge-media"
                          style={{
                            fontSize: "10px",
                            background: "#f1f5f9",
                            color: "#64748b",
                          }}
                        >
                          Origen: Ticket #{art.ticket_origen_id}
                        </span>
                      )}
                    </div>
                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: "700",
                        color: "#0f172a",
                        margin: "0 0 4px 0",
                        lineHeight: "1.4",
                      }}
                    >
                      {art.titulo}
                    </h3>
                    <div
                      style={{
                        fontSize: "11.5px",
                        color: "#64748b",
                        display: "flex",
                        gap: "14px",
                      }}
                    >
                      <span>
                        Por:{" "}
                        <strong>{art.creador_nombre || "Equipo TI"}</strong>
                      </span>
                      {art.created_at && (
                        <span>
                          Publicado: {formatLocalDateSimple(art.created_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    {canManage && (
                      <div
                        style={{ display: "flex", gap: "6px" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                          onClick={() => openEditModal(art)}
                          title="Editar Guía"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{
                            padding: "4px 8px",
                            fontSize: "12px",
                            background: "#fef2f2",
                            border: "1px solid #fee2e2",
                            color: "#dc2626",
                          }}
                          onClick={() => handleDelete(art.id)}
                          title="Eliminar Guía"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        padding: "5px 10px",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {isExpanded
                        ? "Ocultar Paso a Paso ▲"
                        : "Ver Paso a Paso ▼"}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      marginTop: "14px",
                      paddingTop: "14px",
                      borderTop: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      padding: "16px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      lineHeight: "1.6",
                      color: "#334155",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "12px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color: "#2563eb",
                        marginBottom: "10px",
                      }}
                    >
                      📋 Solución Paso a Paso:
                    </h4>
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: "inherit",
                      }}
                    >
                      {art.pasos_solucion}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalArticulos > 10 && (
            <div
              className="pagination-container"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                marginTop: "20px",
                padding: "10px 0",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                style={{
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  padding: "6px 12px",
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
                Página {page} de {Math.ceil(totalArticulos / 10)} (
                {totalArticulos} artículos)
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= Math.ceil(totalArticulos / 10)}
                onClick={() => setPage(page + 1)}
                style={{
                  cursor:
                    page >= Math.ceil(totalArticulos / 10)
                      ? "not-allowed"
                      : "pointer",
                  padding: "6px 12px",
                  fontSize: "12px",
                }}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal for Creating / Editing KB Article */}
      {showModal && (
        <div
          className="modal-backdrop fade-in"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15,23,42,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            className="modal-container glass-panel animate-slide-up"
            style={{
              width: "100%",
              maxWidth: "650px",
              background: "#ffffff",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#0f172a",
                }}
              >
                {isEditing
                  ? "✏️ Editar Guía en Base de Conocimientos"
                  : "Publicar Nueva Guía en Base de Conocimientos"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: "20px" }}>
              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Título del Problema / Solución *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Cómo configurar impresora HP en Windows 11..."
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Categoría *
                </label>
                <select
                  className="form-control"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  required
                >
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.nombre}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Instrucciones Paso a Paso (Solución) *
                </label>
                <textarea
                  className="form-control"
                  rows={8}
                  placeholder="Paso 1: Ir a Panel de Control&#10;Paso 2: Seleccionar Dispositivos e Impresoras&#10;Paso 3: Reiniciar la cola de impresión..."
                  value={pasosSolucion}
                  onChange={(e) => setPasosSolucion(e.target.value)}
                  required
                  style={{
                    resize: "vertical",
                    fontFamily: "inherit",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  pt: "10px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting
                    ? "Guardando..."
                    : isEditing
                      ? "Guardar Cambios"
                      : "Publicar Guía"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
