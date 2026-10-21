import React, { useState, useEffect, useRef } from "react";
import "./EmojiStickerPicker.css";

interface CustomSticker {
  id: string;
  name: string;
  dataUrl: string;
}

interface EmojiStickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSendSticker: (stickerDataUrl: string, stickerName: string) => Promise<void>;
}

// Preset sticker definitions for TI/Office memes
interface StickerDef {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
}

const PRESET_STICKER_DEFS: StickerDef[] = [
  { id: "this_is_fine", emoji: "🔥☕", title: "TODO BIEN", subtitle: "This is Fine", color: "#ef4444" },
  { id: "local_works", emoji: "💻🤷‍♂️", title: "EN MI LOCAL", subtitle: "Sí Funciona", color: "#6366f1" },
  { id: "deploy_friday", emoji: "🚀😱", title: "DEPLOY VIERNES", subtitle: "¡Cuidado Prod!", color: "#f59e0b" },
  { id: "lgtm", emoji: "✨👍", title: "LGTM", subtitle: "Aprobado 100%", color: "#10b981" },
  { id: "feature_not_bug", emoji: "🐛💡", title: "ES FEATURE", subtitle: "No es un Bug", color: "#8b5cf6" },
  { id: "dont_touch_prod", emoji: "⛔💥", title: "NO TOQUES", subtitle: "Producción", color: "#dc2626" },
  { id: "hacker_cat", emoji: "🐱💻", title: "HACKER CAT", subtitle: "Acceso Root", color: "#06b6d4" },
  { id: "coffee_emergency", emoji: "☕⚡", title: "CAFÉ URGENTE", subtitle: "Cargando Batería", color: "#b45309" },
  { id: "brain_iq", emoji: "🧠✨", title: "9999 IQ", subtitle: "Solución Maestra", color: "#ec4899" },
  { id: "server_down", emoji: "💀🔥", title: "SERVER DOWN", subtitle: "F en el Chat", color: "#475569" },
  { id: "open_ticket", emoji: "🎫🏃‍♂️", title: "ABRE TICKET", subtitle: "Por Favor", color: "#3b82f6" },
  { id: "deploy_success", emoji: "🎉🥳", title: "DEPLOY ÉXITO", subtitle: "Cero Errores", color: "#059669" },
  { id: "praying_db", emoji: "🙏☁️", title: "QUE NO FALLE", subtitle: "Amén", color: "#64748b" },
  { id: "senior_mode", emoji: "🕶️😎", title: "SENIOR MODE", subtitle: "Bajo Control", color: "#0f766e" },
  { id: "waiting_build", emoji: "⏳😴", title: "ESPERANDO", subtitle: "La Build", color: "#71717a" },
  { id: "smo_team", emoji: "🏆⭐", title: "SMO IT CORE", subtitle: "Equipo Top", color: "#d97706" },
];

const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: "Caritas",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰",
      "😍", "🤩", "😘", "😗", "😚", "😙", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭",
      "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔",
      "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯",
      "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "🥺",
      "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫",
      "🥱", "😤", "😡", "😠", "🤬", "💀", "💩", "🤡", "👻", "👽", "🤖",
    ],
  },
  {
    name: "Gestos",
    emojis: [
      "👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅",
      "🤳", "💪", "👈", "👉", "👆", "👇", "☝️", "✌️", "🤞", "🖖", "🤘", "🤙", "🖐", "✋",
      "👌", "🤌", "🤏", "👀", "👁️", "👂", "👃", "🧠", "❤️‍🔥", "💯",
    ],
  },
  {
    name: "TI & Dev",
    emojis: [
      "💻", "🖥️", "⌨️", "🖱️", "🖨️", "📱", "💾", "💿", "📼", "📷", "📹", "🎥", "🔍", "🔎",
      "💡", "🔦", "📁", "📂", "📄", "📃", "📊", "📈", "📉", "📋", "📌", "📍", "📎", "📏",
      "📐", "✂️", "🔒", "🔓", "🔑", "🛠️", "⚙️", "⚡", "🚀", "☕", "🐛", "🕷️", "🤖", "🧠",
      "🦾", "📡", "📶", "🔋", "🔌", "⏳", "⌛", "⏰", "⌚", "📢", "🔔", "🎫", "🏢", "🗄️", "💼",
    ],
  },
  {
    name: "Símbolos",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓",
      "💗", "💖", "💘", "💝", "✨", "🌟", "💫", "💥", "🔥", "💯", "💢", "💬", "💭", "🗯️",
      "✅", "❌", "⭕", "🛑", "⚠️", "⛔", "🚫", "❓", "❗", "🆗", "🆕", "🆙", "🆒", "0️⃣",
      "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣",
    ],
  },
  {
    name: "Animales",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸",
      "🐵", "🐔", "🐧", "🐦", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛",
      "🦋", "🐌", "🐞", "🐜", "🐢", "🐍", "🐙", "🦑", "🦐", "🦀", "🐡", "🐠", "🐟", "🐬",
    ],
  },
];

// Helper: Render preset sticker onto canvas
const renderPresetStickerDataUrl = (def: StickerDef): string => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Outer sticker outline (WhatsApp style white border)
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  ctx.beginPath();
  ctx.roundRect(14, 14, 228, 228, 36);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  // Inner gradient badge
  const grad = ctx.createLinearGradient(20, 20, 236, 236);
  grad.addColorStop(0, def.color);
  grad.addColorStop(1, "#18182b");
  ctx.beginPath();
  ctx.roundRect(20, 20, 216, 216, 30);
  ctx.fillStyle = grad;
  ctx.fill();

  // Emoji
  ctx.font = "76px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(def.emoji, 128, 105);

  // Title
  ctx.font = "bold 21px 'Impact', 'Segoe UI Black', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 4;
  ctx.strokeText(def.title, 128, 172);
  ctx.fillText(def.title, 128, 172);

  // Subtitle
  if (def.subtitle) {
    ctx.font = "bold 13px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(def.subtitle, 128, 204);
  }

  return canvas.toDataURL("image/png");
};

export const EmojiStickerPicker: React.FC<EmojiStickerPickerProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  onSendSticker,
}) => {
  const [activeTab, setActiveTab] = useState<"emojis" | "stickers" | "maker">("emojis");

  // Emojis state
  const [searchEmoji, setSearchEmoji] = useState("");
  const [selectedCat, setSelectedCat] = useState("Todos");

  // Stickers state
  const [presetStickers, setPresetStickers] = useState<{ def: StickerDef; dataUrl: string }[]>([]);
  const [customStickers, setCustomStickers] = useState<CustomSticker[]>([]);

  // Maker state
  const [makerImg, setMakerImg] = useState<HTMLImageElement | null>(null);
  const [makerTopText, setMakerTopText] = useState("");
  const [makerBottomText, setMakerBottomText] = useState("");
  const [makerShape, setMakerShape] = useState<"round" | "circle">("round");
  const [makerStampEmoji, setMakerStampEmoji] = useState<string>("😎");
  const [isSendingSticker, setIsSendingSticker] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load custom stickers from localStorage & generate presets
  useEffect(() => {
    // Generate presets once
    const presets = PRESET_STICKER_DEFS.map((def) => ({
      def,
      dataUrl: renderPresetStickerDataUrl(def),
    }));
    setPresetStickers(presets);

    // Load custom stickers
    try {
      const stored = localStorage.getItem("smo_custom_stickers");
      if (stored) {
        setCustomStickers(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error reading custom stickers from localStorage", e);
    }
  }, []);

  // Real-time canvas render for sticker maker
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 300;
    ctx.clearRect(0, 0, 300, 300);

    // Draw sticker shape with white outline
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    ctx.beginPath();
    if (makerShape === "circle") {
      ctx.arc(150, 150, 135, 0, Math.PI * 2);
    } else {
      ctx.roundRect(15, 15, 270, 270, 36);
    }
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    // Clip image inside
    ctx.save();
    ctx.beginPath();
    if (makerShape === "circle") {
      ctx.arc(150, 150, 127, 0, Math.PI * 2);
    } else {
      ctx.roundRect(22, 22, 256, 256, 28);
    }
    ctx.clip();

    if (makerImg) {
      // Draw image covering the canvas area
      const hRatio = 256 / makerImg.width;
      const vRatio = 256 / makerImg.height;
      const ratio = Math.max(hRatio, vRatio);
      const centerShiftX = (256 - makerImg.width * ratio) / 2 + 22;
      const centerShiftY = (256 - makerImg.height * ratio) / 2 + 22;

      ctx.drawImage(
        makerImg,
        0,
        0,
        makerImg.width,
        makerImg.height,
        centerShiftX,
        centerShiftY,
        makerImg.width * ratio,
        makerImg.height * ratio
      );
    } else {
      // Placeholder background
      const grad = ctx.createLinearGradient(0, 0, 300, 300);
      grad.addColorStop(0, "#4f46e5");
      grad.addColorStop(1, "#06b6d4");
      ctx.fillStyle = grad;
      ctx.fill();

      // Placeholder icon text
      ctx.font = "60px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(makerStampEmoji || "📸", 150, 140);
    }
    ctx.restore();

    // Stamp Emoji in corner
    if (makerStampEmoji && makerImg) {
      ctx.font = "40px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(makerStampEmoji, 270, 70);
    }

    // Top text (Impact meme style)
    if (makerTopText.trim()) {
      ctx.font = "bold 26px 'Impact', 'Segoe UI Black', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 5;
      ctx.strokeText(makerTopText.toUpperCase(), 150, 60);
      ctx.fillText(makerTopText.toUpperCase(), 150, 60);
    }

    // Bottom text
    if (makerBottomText.trim()) {
      ctx.font = "bold 26px 'Impact', 'Segoe UI Black', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 5;
      ctx.strokeText(makerBottomText.toUpperCase(), 150, 260);
      ctx.fillText(makerBottomText.toUpperCase(), 150, 260);
    }
  }, [makerImg, makerTopText, makerBottomText, makerShape, makerStampEmoji]);

  if (!isOpen) return null;

  // Filter emojis
  const allFilteredEmojis = () => {
    let list: string[] = [];
    if (selectedCat === "Todos") {
      EMOJI_CATEGORIES.forEach((c) => (list = list.concat(c.emojis)));
    } else {
      const found = EMOJI_CATEGORIES.find((c) => c.name === selectedCat);
      list = found ? found.emojis : [];
    }

    if (searchEmoji.trim()) {
      // Direct emoji match or category inclusion
      const q = searchEmoji.toLowerCase();
      list = list.filter((e) => e.includes(q));
    }
    return list;
  };

  // Image file handler for Sticker Maker
  const handleMakerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setMakerImg(img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Send created sticker
  const handleSendCreatedSticker = async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    try {
      setIsSendingSticker(true);
      const dataUrl = canvas.toDataURL("image/png");
      const name = (makerTopText || makerBottomText || "mi_sticker")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 20);

      await onSendSticker(dataUrl, `sticker_${name}`);
      onClose();
    } catch (err) {
      console.error("Error sending created sticker", err);
    } finally {
      setIsSendingSticker(false);
    }
  };

  // Save created sticker to personal gallery
  const handleSaveToMyStickers = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const newSticker: CustomSticker = {
      id: "cust_" + Date.now(),
      name: makerTopText || makerBottomText || "Sticker Creado",
      dataUrl,
    };

    const updated = [newSticker, ...customStickers];
    setCustomStickers(updated);
    try {
      localStorage.setItem("smo_custom_stickers", JSON.stringify(updated));
    } catch (e) {}

    setActiveTab("stickers");
  };

  // Delete custom sticker
  const handleDeleteCustomSticker = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = customStickers.filter((s) => s.id !== id);
    setCustomStickers(updated);
    try {
      localStorage.setItem("smo_custom_stickers", JSON.stringify(updated));
    } catch (e) {}
  };

  return (
    <div className="emoji-sticker-picker-popover" onClick={(e) => e.stopPropagation()}>
      {/* Header with Navigation Tabs */}
      <div className="picker-header">
        <div className="picker-tabs">
          <button
            type="button"
            className={`picker-tab-btn ${activeTab === "emojis" ? "active" : ""}`}
            onClick={() => setActiveTab("emojis")}
          >
            <span>😀</span> Emojis
          </button>
          <button
            type="button"
            className={`picker-tab-btn ${activeTab === "stickers" ? "active" : ""}`}
            onClick={() => setActiveTab("stickers")}
          >
            <span>🏷️</span> Stickers
          </button>
          <button
            type="button"
            className={`picker-tab-btn ${activeTab === "maker" ? "active" : ""}`}
            onClick={() => setActiveTab("maker")}
          >
            <span>✨</span> Crear
          </button>
        </div>
        <button
          type="button"
          className="picker-close-btn"
          onClick={onClose}
          title="Cerrar selector"
        >
          ×
        </button>
      </div>

      <div className="picker-body">
        {/* TAB 1: EMOJIS */}
        {activeTab === "emojis" && (
          <>
            <div className="emoji-search-box">
              <input
                type="text"
                className="emoji-search-input"
                placeholder="Buscar emoji..."
                value={searchEmoji}
                onChange={(e) => setSearchEmoji(e.target.value)}
              />
            </div>

            <div className="emoji-categories-pills">
              {["Todos", ...EMOJI_CATEGORIES.map((c) => c.name)].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`category-pill-btn ${selectedCat === cat ? "active" : ""}`}
                  onClick={() => setSelectedCat(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="emojis-grid-scroll">
              {allFilteredEmojis().map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  type="button"
                  className="emoji-cell-btn"
                  onClick={() => onSelectEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}

        {/* TAB 2: STICKERS */}
        {activeTab === "stickers" && (
          <div className="stickers-scroll-area">
            {/* Custom Created Stickers */}
            {customStickers.length > 0 && (
              <div>
                <div className="stickers-section-title">
                  <span>Mis Stickers Guardados</span>
                  <span style={{ fontSize: "10px", color: "var(--color-primary)" }}>
                    ({customStickers.length})
                  </span>
                </div>
                <div className="stickers-grid">
                  {customStickers.map((sticker) => (
                    <button
                      key={sticker.id}
                      type="button"
                      className="sticker-item-btn"
                      onClick={() => onSendSticker(sticker.dataUrl, `sticker_${sticker.name}`)}
                      title={`Enviar "${sticker.name}"`}
                    >
                      <img
                        src={sticker.dataUrl}
                        alt={sticker.name}
                        className="sticker-thumb-img"
                      />
                      <span className="sticker-label-txt">{sticker.name}</span>
                      <button
                        type="button"
                        className="sticker-delete-badge"
                        title="Eliminar de favoritos"
                        onClick={(e) => handleDeleteCustomSticker(e, sticker.id)}
                      >
                        ×
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Built-in Stickers Pack */}
            <div>
              <div className="stickers-section-title">
                <span>Pack SMO IT Memes</span>
                <span style={{ fontSize: "9px", background: "var(--overlay-03)", padding: "2px 6px", borderRadius: "4px" }}>
                  16 Stickers
                </span>
              </div>
              <div className="stickers-grid">
                {presetStickers.map(({ def, dataUrl }) => (
                  <button
                    key={def.id}
                    type="button"
                    className="sticker-item-btn"
                    onClick={() => onSendSticker(dataUrl, `sticker_${def.id}`)}
                    title={`Enviar ${def.title}`}
                  >
                    <img
                      src={dataUrl}
                      alt={def.title}
                      className="sticker-thumb-img"
                    />
                    <span className="sticker-label-txt">{def.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STICKER MAKER */}
        {activeTab === "maker" && (
          <div className="sticker-maker-container">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleMakerImageUpload}
            />

            {/* Live Canvas Preview */}
            <div
              className="maker-canvas-preview-wrap"
              onClick={() => fileInputRef.current?.click()}
              title="Haz clic para cambiar la foto"
            >
              <canvas
                ref={previewCanvasRef}
                className="maker-canvas-element"
              />
              {!makerImg && (
                <div className="maker-upload-cta mt-2">
                  <span style={{ fontSize: "18px" }}>📸</span>
                  <span>Haz clic aquí para subir una imagen</span>
                </div>
              )}
            </div>

            <div className="maker-controls-grid">
              {/* Text fields */}
              <div className="maker-input-group">
                <label>Texto Superior (Meme Top)</label>
                <input
                  type="text"
                  className="maker-text-input"
                  placeholder="Ej: CUANDO PROD..."
                  value={makerTopText}
                  onChange={(e) => setMakerTopText(e.target.value)}
                  maxLength={24}
                />
              </div>

              <div className="maker-input-group">
                <label>Texto Inferior (Meme Bottom)</label>
                <input
                  type="text"
                  className="maker-text-input"
                  placeholder="Ej: SE CAE EL VIERNES"
                  value={makerBottomText}
                  onChange={(e) => setMakerBottomText(e.target.value)}
                  maxLength={24}
                />
              </div>

              {/* Shape selection */}
              <div className="maker-input-group">
                <label>Forma del Sticker</label>
                <div className="maker-shape-options">
                  <button
                    type="button"
                    className={`shape-opt-btn ${makerShape === "round" ? "active" : ""}`}
                    onClick={() => setMakerShape("round")}
                  >
                    Cuadrado Suave
                  </button>
                  <button
                    type="button"
                    className={`shape-opt-btn ${makerShape === "circle" ? "active" : ""}`}
                    onClick={() => setMakerShape("circle")}
                  >
                    Círculo
                  </button>
                </div>
              </div>

              {/* Quick stamp emoji */}
              <div className="maker-input-group">
                <label>Estampa Emoji Decorativa</label>
                <div className="emoji-stamp-row">
                  {["😎", "🔥", "🚀", "👑", "💩", "🤡", "☕", "💀", "❤️", "⭐"].map(
                    (em) => (
                      <button
                        key={em}
                        type="button"
                        className={`emoji-stamp-btn ${makerStampEmoji === em ? "active" : ""}`}
                        onClick={() =>
                          setMakerStampEmoji(makerStampEmoji === em ? "" : em)
                        }
                      >
                        {em}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="maker-actions-row">
                <button
                  type="button"
                  className="btn-maker-save"
                  onClick={handleSaveToMyStickers}
                  disabled={!makerImg && !makerTopText}
                  title="Guardar en tu colección personal"
                >
                  💾 Guardar
                </button>
                <button
                  type="button"
                  className="btn-maker-send"
                  onClick={handleSendCreatedSticker}
                  disabled={isSendingSticker}
                  title="Enviar inmediatamente a la conversación"
                >
                  {isSendingSticker ? "Enviando..." : "🚀 Enviar Sticker"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
