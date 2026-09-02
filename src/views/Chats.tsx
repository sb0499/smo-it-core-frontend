import { showAlert, showConfirm } from "../utils/alerts";
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import {
  chatService,
  ChatCanal,
  ChatMensaje,
  ChatCanalMiembro,
} from "../services/chat.service";
import { projectService, User } from "../services/project.service";
import { API_BASE_URL, apiClient } from "../services/api";
import {
  generateChannelKey,
  encryptChannelKey,
  decryptChannelKey,
  encryptMessage,
  decryptMessage,
} from "../utils/crypto";
import "./Chats.css";

export const Chats: React.FC = () => {
  const { user, userPrivateKey } = useAuth();
  const [canales, setCanales] = useState<ChatCanal[]>([]);
  const [activeCanal, setActiveCanal] = useState<ChatCanal | null>(null);
  const [mensajes, setMensajes] = useState<ChatMensaje[]>([]);
  const [activeChannelKey, setActiveChannelKey] = useState<CryptoKey | null>(
    null,
  );
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New message / New channel forms
  const [newMsg, setNewMsg] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChanName, setNewChanName] = useState("");
  const [newChanPrivate, setNewChanPrivate] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Direct messaging state
  const [showDmSelect, setShowDmSelect] = useState(false);

  // File attachment state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manage members modal
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [channelMembers, setChannelMembers] = useState<ChatCanalMiembro[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const decryptedCacheRef = useRef<Map<number, string>>(new Map());

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const list = await chatService.getCanales();
      setCanales(list);

      const allUsers = await projectService.getUsuarios();
      setUsers(allUsers);

      // Select first channel by default if none selected
      if (list.length > 0 && !activeCanal) {
        handleSelectCanal(list[0]);
      }
    } catch (e) {
      console.error("Error fetching chats", e);
    } finally {
      setLoading(false);
    }
  };

  const decryptMessagesList = async (
    msgList: ChatMensaje[],
    channelKey: CryptoKey | null,
  ): Promise<ChatMensaje[]> => {
    return msgList.map((m) => ({ ...m, isEncrypted: !!channelKey }) as any);
  };

  const handleSelectCanal = async (canal: ChatCanal) => {
    decryptedCacheRef.current.clear();
    setActiveCanal(canal);
    let channelKey: CryptoKey | null = null;

    if (canal.encrypted_channel_key && userPrivateKey) {
      try {
        channelKey = await decryptChannelKey(
          canal.encrypted_channel_key,
          userPrivateKey,
        );
        setActiveChannelKey(channelKey);
      } catch (err) {
        console.error("Error decrypting channel key:", err);
        setActiveChannelKey(null);
      }
    } else {
      setActiveChannelKey(null);
    }

    try {
      const chatHistory = await chatService.getCanalMensajes(canal.id);
      const decryptedHistory = await decryptMessagesList(
        chatHistory,
        channelKey,
      );
      setMensajes(decryptedHistory);
      if (canal.is_private) {
        const members = await chatService.getCanalMiembros(canal.id);
        setChannelMembers(members);
      }
    } catch (e) {
      setMensajes([]);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // Dynamic message fetch loop
  useEffect(() => {
    if (!activeCanal) return;

    const interval = setInterval(async () => {
      try {
        const chatHistory = await chatService.getCanalMensajes(activeCanal.id);
        if (chatHistory.length !== mensajes.length) {
          const decryptedHistory = await decryptMessagesList(
            chatHistory,
            activeChannelKey,
          );
          setMensajes(decryptedHistory);
        }
      } catch (e) {
        // ignore
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeCanal, mensajes, activeChannelKey]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleStartDM = async (targetUserId: number) => {
    try {
      if (!user) return;

      let keysPayload: any = undefined;

      // Try to generate channel key and encrypt it for both users
      try {
        const [targetKeys, myKeys] = await Promise.all([
          apiClient.get<any>(`/usuarios/${targetUserId}/keys`),
          apiClient.get<any>(`/usuarios/${user.id}/keys`),
        ]);

        if (targetKeys?.public_key && myKeys?.public_key) {
          const channelKey = await generateChannelKey();
          const encryptedKeyForTarget = await encryptChannelKey(
            channelKey,
            targetKeys.public_key,
          );
          const encryptedKeyForMe = await encryptChannelKey(
            channelKey,
            myKeys.public_key,
          );

          keysPayload = {
            [user.id]: encryptedKeyForMe,
            [targetUserId]: encryptedKeyForTarget,
          };
        }
      } catch (keyErr) {
        console.warn(
          "Could not exchange keys for DM (user might not have logged in yet):",
          keyErr,
        );
      }

      const dmChan = await chatService.getOrCreateDMChannel(
        targetUserId,
        keysPayload,
      );
      setShowDmSelect(false);

      const list = await chatService.getCanales();
      setCanales(list);

      const updatedDmChan = list.find((c) => c.id === dmChan.id) || dmChan;
      handleSelectCanal(updatedDmChan);
    } catch (e: any) {
      showAlert("Error al iniciar chat directo: " + e.message);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMsg && !selectedFile) || !activeCanal) return;

    try {
      const sent = await chatService.addMensaje(
        activeCanal.id,
        newMsg,
        selectedFile || undefined,
      );

      // Keep it decrypted in local UI state
      const decryptedSent: ChatMensaje = {
        ...sent,
        mensaje: newMsg,
        usuario_nombre: user?.nombre || "Tú",
        usuario_rol: user?.rol,
      };
      (decryptedSent as any).isEncrypted = true;

      setMensajes((prev) => [...prev, decryptedSent]);
      setNewMsg("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      showAlert("Error enviando mensaje: " + err.message);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName || !user) return;

    try {
      setIsSubmitting(true);

      let keysPayload: any = undefined;

      if (newChanPrivate) {
        // Private channel: create and encrypt symmetric channel key
        try {
          const myKeys = await apiClient.get<any>(`/usuarios/${user.id}/keys`);
          if (myKeys?.public_key) {
            const channelKey = await generateChannelKey();
            const encryptedKeyForMe = await encryptChannelKey(
              channelKey,
              myKeys.public_key,
            );

            keysPayload = {
              [user.id]: encryptedKeyForMe,
            };

            for (const uId of selectedUsers) {
              try {
                const uKeys = await apiClient.get<any>(`/usuarios/${uId}/keys`);
                if (uKeys?.public_key) {
                  keysPayload[uId] = await encryptChannelKey(
                    channelKey,
                    uKeys.public_key,
                  );
                }
              } catch (err) {
                console.warn(`No public key found for user ${uId}:`, err);
              }
            }
          }
        } catch (cryptoErr) {
          console.error(
            "Crypto setup failed for private channel creation:",
            cryptoErr,
          );
        }
      }

      const created = await chatService.createCanal(
        newChanName,
        newChanPrivate,
        keysPayload,
      );

      setShowCreateModal(false);
      setNewChanName("");
      setNewChanPrivate(false);
      setSelectedUsers([]);

      // Re-fetch and select new
      const list = await chatService.getCanales();
      setCanales(list);
      handleSelectCanal(created);
    } catch (err: any) {
      showAlert("Error creando canal: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return "";
    if (role === "ADMIN") return "Admin";
    if (role === "SUPERVISOR") return "Supervisor";
    if (role === "TECNICO") return "Técnico";
    return "Sede";
  };

  const handleToggleMember = async (userId: number, isMember: boolean) => {
    if (!activeCanal) return;
    try {
      if (isMember) {
        await chatService.removerMiembro(activeCanal.id, userId);
      } else {
        let encKey: string | undefined = undefined;
        if (activeChannelKey) {
          try {
            const targetKeys = await apiClient.get<any>(
              `/usuarios/${userId}/keys`,
            );
            if (targetKeys?.public_key) {
              encKey = await encryptChannelKey(
                activeChannelKey,
                targetKeys.public_key,
              );
            }
          } catch (keyErr) {
            console.error(
              "Failed to encrypt channel key for new member:",
              keyErr,
            );
          }
        }
        await chatService.unirMiembro(activeCanal.id, userId, encKey);
      }
      const updated = await chatService.getCanalMiembros(activeCanal.id);
      setChannelMembers(updated);
    } catch (e: any) {
      showAlert("Error modificando miembro: " + e.message);
    }
  };

  // Parse project members for initials avatars display
  let memberIds: number[] = [];
  try {
    memberIds =
      activeCanal && activeCanal.creador_id ? [activeCanal.creador_id] : [];
  } catch (err) {}

  return (
    <div className="chats-container animate-fade">
      {/* Search/Filter or Select direct message dropdown modal */}
      {showDmSelect && (
        <div className="modal-overlay animate-fade">
          <div
            className="modal-container glass-panel animate-slide-up"
            style={{ maxWidth: "380px" }}
          >
            <div className="modal-header">
              <h2>Iniciar Conversación Directa</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowDmSelect(false)}
              >
                ×
              </button>
            </div>
            <div
              className="dm-users-list mt-3"
              style={{ maxHeight: "300px", overflowY: "auto" }}
            >
              {users.filter((u) => u.id !== user?.id).length === 0 ? (
                <p className="text-muted text-center">
                  No hay otros usuarios registrados.
                </p>
              ) : (
                users
                  .filter((u) => u.id !== user?.id)
                  .map((u) => (
                    <button
                      key={u.id}
                      className="dm-user-item-btn"
                      onClick={() => handleStartDM(u.id)}
                      style={{
                        display: "flex",
                        width: "100%",
                        padding: "10px 14px",
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px solid #f1f5f9",
                        textAlign: "left",
                        cursor: "pointer",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div className="msg-avatar" style={{ margin: 0 }}>
                        {u.nombre_completo.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>
                          {u.nombre_completo}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {u.rol}
                        </div>
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading">
          <div className="loader"></div>
          <p className="text-muted">
            Conectando con la central de mensajería...
          </p>
        </div>
      ) : (
        <div className="chat-layout glass-panel">
          {/* Left Sidebar: Channels & DMs */}
          <div className="channels-sidebar">
            <div className="sidebar-chat-header">
              <h4>Canales de Chat</h4>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  className="add-channel-btn"
                  onClick={() => setShowDmSelect(true)}
                  title="Nuevo Chat Directo"
                  style={{ fontSize: "10px" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="13"
                    height="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </button>
                <button
                  className="add-channel-btn"
                  onClick={() => setShowCreateModal(true)}
                  title="Crear Canal"
                  style={{ fontSize: "10px" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="13"
                    height="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>
            </div>

            <div className="channels-list">
              <div
                className="sidebar-section-title"
                style={{
                  fontSize: "9px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  color: "var(--color-text-dim)",
                  marginBottom: "6px",
                  letterSpacing: "0.05em",
                }}
              >
                Canales del Servidor
              </div>
              {canales.filter((c) => !c.is_dm).length === 0 ? (
                <p
                  className="text-muted font-xs text-center py-2"
                  style={{ fontSize: "11px" }}
                >
                  No hay canales públicos.
                </p>
              ) : (
                canales
                  .filter((c) => !c.is_dm)
                  .map((c) => (
                    <button
                      key={c.id}
                      className={`channel-item-btn ${activeCanal?.id === c.id ? "active" : ""}`}
                      onClick={() => handleSelectCanal(c)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        className="hash-symbol"
                        style={{ display: "inline-flex", alignItems: "center" }}
                      >
                        {c.is_private ? (
                          <svg
                            viewBox="0 0 24 24"
                            width="12"
                            height="12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect
                              x="3"
                              y="11"
                              width="18"
                              height="11"
                              rx="2"
                              ry="2"
                            ></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                        ) : (
                          "#"
                        )}
                      </span>
                      <span className="channel-name-txt">{c.nombre}</span>
                    </button>
                  ))
              )}

              <div
                className="sidebar-section-title"
                style={{
                  fontSize: "9px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  color: "var(--color-text-dim)",
                  margin: "16px 0 6px 0",
                  letterSpacing: "0.05em",
                }}
              >
                Mensajes Directos
              </div>
              {canales.filter((c) => c.is_dm).length === 0 ? (
                <p
                  className="text-muted font-xs text-center py-2"
                  style={{ fontSize: "11px" }}
                >
                  No hay chats activos.
                </p>
              ) : (
                canales
                  .filter((c) => c.is_dm)
                  .map((c) => (
                    <button
                      key={c.id}
                      className={`channel-item-btn ${activeCanal?.id === c.id ? "active" : ""}`}
                      onClick={() => handleSelectCanal(c)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        className="hash-symbol"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          color: "#10b981",
                        }}
                      >
                        ●
                      </span>
                      <span className="channel-name-txt">
                        {c.dm_destinatario_nombre || c.nombre || "Tú mismo"}
                      </span>
                    </button>
                  ))
              )}
            </div>
          </div>

          {/* Right Panel: Conversation Stream */}
          <div className="conversation-stream">
            {activeCanal ? (
              <>
                <div className="stream-header">
                  <span
                    className="active-channel-name"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{ display: "inline-flex", alignItems: "center" }}
                    >
                      {activeCanal.is_dm ? (
                        <span
                          style={{
                            color: "#10b981",
                            fontSize: "14px",
                            marginRight: "2px",
                          }}
                        >
                          ●
                        </span>
                      ) : activeCanal.is_private ? (
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          ></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      ) : (
                        "#"
                      )}
                    </span>
                    {activeCanal.is_dm
                      ? activeCanal.dm_destinatario_nombre || "Tú mismo"
                      : activeCanal.nombre}
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {!activeCanal.is_dm &&
                      activeCanal.is_private &&
                      (user?.rol === "ADMIN" ||
                        user?.rol === "SUPERVISOR" ||
                        activeCanal.creador_id === user?.id) && (
                        <button
                          className="refresh-chat-btn"
                          onClick={() => setShowMembersModal(true)}
                          title="Gestionar Miembros"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
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
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                        </button>
                      )}
                    <button
                      className="refresh-chat-btn"
                      onClick={() => handleSelectCanal(activeCanal)}
                      title="Recargar Chat"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
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
                    </button>
                  </div>
                </div>

                <div className="messages-timeline-box">
                  {/* Security Server-Side Encryption Banner */}
                  {(activeCanal.is_private || activeCanal.is_dm) && (
                    <div
                      style={{
                        margin: "8px 16px 16px 16px",
                        background: "rgba(16,185,129,0.06)",
                        border: "1px dashed rgba(16,185,129,0.2)",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        fontSize: "11.5px",
                        color: "#059669",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        style={{ flexShrink: 0 }}
                      >
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        ></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      <span>
                        <strong>Cifrado del Servidor Activo</strong>: Los mensajes y archivos en este chat están protegidos y se almacenan de forma segura en la base de datos de TISMO.
                      </span>
                    </div>
                  )}

                  {mensajes.length === 0 ? (
                    <div className="empty-chat text-center py-5">
                      <span
                        className="chat-welcome-icon"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "16px",
                          color: "var(--color-text-dim)",
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="48"
                          height="48"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                      </span>
                      <h4>
                        ¡Te damos la bienvenida a{" "}
                        {activeCanal.is_dm
                          ? activeCanal.dm_destinatario_nombre ||
                            "tu chat directo"
                          : `#${activeCanal.nombre}`}
                        !
                      </h4>
                      <p className="text-muted font-xs mt-1">
                        Este es el inicio de la conversación de este chat.
                      </p>
                    </div>
                  ) : (
                    mensajes.map((m) => (
                      <div
                        key={m.id}
                        className="message-bubble-row animate-slide-up"
                      >
                        <div className="msg-avatar">
                          {(m.usuario_nombre || "S").charAt(0).toUpperCase()}
                        </div>
                        <div className="msg-content-wrapper">
                          <div className="msg-meta">
                            <span className="msg-author-name">
                              {m.usuario_nombre}
                            </span>
                            <span
                              className={`msg-role-lbl role-${(m.usuario_rol || "usuario").toLowerCase()}`}
                            >
                              {getRoleLabel(m.usuario_rol)}
                            </span>
                            <span className="msg-time text-dim">
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {m.mensaje && (
                            <p
                              className="msg-content-text"
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "6px",
                                flexWrap: "wrap",
                              }}
                            >
                              {(m as any).isEncrypted ? (
                                <span
                                  title="Cifrado de extremo a extremo (E2EE)"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    color: "#10b981",
                                    background: "rgba(16,185,129,0.08)",
                                    padding: "2px 5px",
                                    borderRadius: "4px",
                                    fontSize: "9px",
                                    fontWeight: "bold",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                    marginTop: "2px",
                                  }}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    width="9"
                                    height="9"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    style={{ marginRight: "3px" }}
                                  >
                                    <rect
                                      x="3"
                                      y="11"
                                      width="18"
                                      height="11"
                                      rx="2"
                                      ry="2"
                                    ></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                  </svg>
                                  E2EE
                                </span>
                              ) : (
                                <span
                                  title="Mensaje sin cifrar"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    color: "var(--color-text-dim)",
                                    background: "var(--overlay-05)",
                                    padding: "2px 5px",
                                    borderRadius: "4px",
                                    fontSize: "9px",
                                    fontWeight: "bold",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                    marginTop: "2px",
                                  }}
                                >
                                  🔓 Abierto
                                </span>
                              )}
                              <span>{m.mensaje}</span>
                            </p>
                          )}

                          {m.archivo_ruta && (
                            <div
                              className="msg-attachment-box"
                              style={{
                                marginTop: "8px",
                                padding: "8px",
                                borderRadius: "8px",
                                background: "var(--overlay-02)",
                                border: "var(--border-glass)",
                                display: "inline-flex",
                                flexDirection: "column",
                                gap: "6px",
                                maxWidth: "280px",
                              }}
                            >
                              {m.archivo_mimetype?.startsWith("image/") ? (
                                <a
                                  href={
                                    API_BASE_URL.replace("/api/v1", "") +
                                    m.archivo_ruta
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src={
                                      API_BASE_URL.replace("/api/v1", "") +
                                      m.archivo_ruta
                                    }
                                    alt={m.archivo_nombre}
                                    style={{
                                      maxWidth: "100%",
                                      maxHeight: "180px",
                                      borderRadius: "6px",
                                      objectFit: "contain",
                                      cursor: "zoom-in",
                                    }}
                                  />
                                </a>
                              ) : (
                                <a
                                  href={
                                    API_BASE_URL.replace("/api/v1", "") +
                                    m.archivo_ruta
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    color: "var(--color-primary)",
                                    textDecoration: "none",
                                    fontSize: "11px",
                                    fontWeight: "bold",
                                  }}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    width="16"
                                    height="16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                  </svg>
                                  <span
                                    style={{
                                      textOverflow: "ellipsis",
                                      overflow: "hidden",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {m.archivo_nombre}
                                  </span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* File Attachment Preview */}
                {selectedFile && (
                  <div
                    className="selected-file-preview animate-fade"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "var(--overlay-02)",
                      border: "var(--border-glass)",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      margin: "0 16px 8px 16px",
                      fontSize: "11px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      <span
                        style={{
                          fontWeight: "600",
                          color: "var(--color-text-main)",
                        }}
                      >
                        {selectedFile.name}
                      </span>
                      <span style={{ color: "var(--color-text-dim)" }}>
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#ef4444",
                        fontWeight: "bold",
                      }}
                    >
                      Quitar
                    </button>
                  </div>
                )}

                {/* Send message text box */}
                <form
                  onSubmit={handleSendMessage}
                  className="message-composer-form"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary attach-file-btn"
                    onClick={triggerFileInput}
                    title="Adjuntar archivo"
                    style={{
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                  </button>
                  <input
                    type="text"
                    className="form-control composer-input"
                    placeholder={`Enviar mensaje a ${activeCanal.is_dm ? activeCanal.dm_destinatario_nombre || "chat directo" : "#" + activeCanal.nombre}...`}
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    required={!selectedFile}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-send-msg"
                  >
                    Enviar ➔
                  </button>
                </form>
              </>
            ) : (
              <div className="select-channel-placeholder">
                <span
                  className="placeholder-big-icon"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                    color: "var(--color-text-dim)",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="64"
                    height="64"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </span>
                <h3>Mesa de Canales TISMO</h3>
                <p className="text-muted">
                  Selecciona un canal de la barra lateral para empezar a
                  mensajear.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE CHANNEL MODAL */}
      {showCreateModal && (
        <div className="modal-overlay animate-fade">
          <div
            className="modal-container glass-panel animate-slide-up"
            style={{ maxWidth: "440px" }}
          >
            <div className="modal-header">
              <h2>Crear Nuevo Canal de Comunicación</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="modal-form">
              <div className="form-group">
                <label className="form-label">NOMBRE DEL CANAL</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: soporte-servidores"
                  value={newChanName}
                  onChange={(e) =>
                    setNewChanName(
                      e.target.value.toLowerCase().replace(/ /g, "-"),
                    )
                  }
                  required
                />
              </div>

              <div className="form-group row-align mt-2">
                <label className="checkbox-wrap-label">
                  <input
                    type="checkbox"
                    className="subtask-checkbox"
                    checked={newChanPrivate}
                    onChange={(e) => {
                      setNewChanPrivate(e.target.checked);
                      if (!e.target.checked) setSelectedUsers([]);
                    }}
                  />
                  <span className="checkbox-wrap-text font-sm ml-2">
                    Canal Privado (Solo invitados)
                  </span>
                </label>
              </div>

              {newChanPrivate && (
                <div className="form-group mt-3">
                  <label className="form-label">
                    SELECCIONAR MIEMBROS (Además de ti)
                  </label>
                  <div
                    style={{
                      maxHeight: "150px",
                      overflowY: "auto",
                      border: "1px solid #e5e7eb",
                      padding: "10px",
                      borderRadius: "8px",
                    }}
                  >
                    {users
                      .filter((u) => u.id !== user?.id)
                      .map((u) => (
                        <label
                          key={u.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "6px",
                            fontSize: "13px",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked)
                                setSelectedUsers([...selectedUsers, u.id]);
                              else
                                setSelectedUsers(
                                  selectedUsers.filter((id) => id !== u.id),
                                );
                            }}
                            style={{ marginRight: "8px" }}
                          />
                          {u.nombre_completo} ({u.rol})
                        </label>
                      ))}
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creando..." : "Crear Canal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MANAGE MEMBERS MODAL */}
      {showMembersModal && activeCanal && (
        <div className="modal-overlay animate-fade">
          <div
            className="modal-container glass-panel animate-slide-up"
            style={{ maxWidth: "440px" }}
          >
            <div className="modal-header">
              <h2>Miembros de {activeCanal.nombre}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowMembersModal(false)}
              >
                ×
              </button>
            </div>

            <div className="form-group mt-3">
              <label className="form-label">MIEMBROS DEL CANAL</label>
              <div
                style={{
                  maxHeight: "300px",
                  overflowY: "auto",
                  border: "1px solid #e5e7eb",
                  padding: "10px",
                  borderRadius: "8px",
                }}
              >
                {users.map((u) => {
                  const isMember = channelMembers.some(
                    (m) => m.usuario_id === u.id,
                  );
                  const isCreator = activeCanal.creador_id === u.id;

                  return (
                    <div
                      key={u.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                        padding: "4px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          fontSize: "13px",
                        }}
                      >
                        {u.nombre_completo} ({u.rol}){" "}
                        {isCreator && " (Creador)"}
                      </div>
                      {!isCreator && (
                        <button
                          className={`btn ${isMember ? "btn-secondary" : "btn-primary"}`}
                          style={{ padding: "2px 8px", fontSize: "11px" }}
                          onClick={() => handleToggleMember(u.id, isMember)}
                        >
                          {isMember ? "Quitar" : "Agregar"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-actions mt-3">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowMembersModal(false)}
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
