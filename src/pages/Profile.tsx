import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Flame,
  BookOpen,
  Trophy,
  Calendar,
  Lock,
  Camera,
  Bell,
  BellOff,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useThemeContext, ThemeToggle, Eyebrow } from "@/contexts/ThemeContext";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProfileData {
  id: string;
  user_id: string;
  display_name: string;
  streak: number;
  longest_streak: number;
  avatar_url?: string | null;
  reminder_enabled?: boolean;
  reminder_time?: string;
  [key: string]: unknown;
}
interface DayReading {
  read_date: string;
}
interface QuizResult {
  bonus_points: number;
  completed_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const REMINDER_TIMES = [
  "05:00","05:30","06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30","10:00","12:00","18:00","19:00","20:00","21:00","22:00",
];
function reminderMessage(time: string) {
  const h = parseInt(time);
  if (h < 12) return "☀️ Bom dia! Que tal começar o dia na Palavra?";
  if (h < 18) return "📖 Pausa para a leitura bíblica de hoje.";
  return "🌙 Antes de dormir, um capítulo te espera.";
}
function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
}
function getLast30Days() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });
}
const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ─── CropModal ────────────────────────────────────────────────────────────────
function CropModal({
  src,
  onConfirm,
  onCancel,
}: {
  src: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const { T } = useThemeContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const SIZE = 280;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    // Clamp offset so image always covers the circle
    const maxOffX = Math.max(0, (w - SIZE) / 2);
    const maxOffY = Math.max(0, (h - SIZE) / 2);
    const cx = Math.max(-maxOffX, Math.min(maxOffX, offset.x));
    const cy = Math.max(-maxOffY, Math.min(maxOffY, offset.y));
    ctx.drawImage(img, cx + SIZE / 2 - w / 2, cy + SIZE / 2 - h / 2, w, h);
    ctx.restore();
  }, [scale, offset]);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      imgRef.current = img;
      // Cover: ensure image fills the circle
      const fitScale = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
      setBaseScale(fitScale);
      setScale(fitScale);
      setOffset({ x: 0, y: 0 });
    };
  }, [src]);

  useEffect(() => { draw(); }, [draw]);

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    dragging.current = true;
    const p = "touches" in e ? e.touches[0] : e;
    lastPos.current = { x: p.clientX, y: p.clientY };
  };
  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging.current || !imgRef.current) return;
    const p = "touches" in e ? e.touches[0] : e;
    const dx = p.clientX - lastPos.current.x;
    const dy = p.clientY - lastPos.current.y;
    const w = imgRef.current.naturalWidth * scale;
    const h = imgRef.current.naturalHeight * scale;
    const maxOffsetX = Math.max(0, (w - SIZE) / 2);
    const maxOffsetY = Math.max(0, (h - SIZE) / 2);
    setOffset((prev) => ({
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, prev.x + dx)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, prev.y + dy)),
    }));
    lastPos.current = { x: p.clientX, y: p.clientY };
  };
  const onUp = () => { dragging.current = false; };
  const confirm = () => {
    canvasRef.current!.toBlob((b) => { if (b) onConfirm(b); }, "image/jpeg", 0.92);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.82)" }}>
      <div className="p-6 flex flex-col items-center gap-4 mx-4 w-full max-w-sm" style={{ borderRadius: "1.25rem", background: T.card, border: `1px solid ${T.border}`, boxShadow: `0 2px 40px ${T.shadow}` }}>
        <div className="w-full flex items-center justify-between">
          <h3 className="font-bold text-base" style={{ color: T.textPrimary }}>Ajustar foto</h3>
          <span className="text-xs" style={{ color: T.textMuted }}>Arraste para reposicionar</span>
        </div>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="rounded-full cursor-grab active:cursor-grabbing touch-none"
          style={{ width: SIZE, height: SIZE, border: `3px solid ${T.accent}`, boxShadow: `0 0 24px ${T.accentGlow}` }}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        />
        <div className="w-full flex items-center gap-3">
          <span className="text-xs font-bold" style={{ color: T.textMuted }}>−</span>
          <input
            type="range"
            min={baseScale}
            max={baseScale * 3}
            step={baseScale * 0.02}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="flex-1"
            style={{ accentColor: T.accent }}
          />
          <span className="text-xs font-bold" style={{ color: T.textMuted }}>+</span>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel} className="flex-1 py-3 rounded-full text-sm font-semibold" style={{ border: `1.5px solid ${T.border}`, color: T.textMuted, background: "transparent" }}>
            Cancelar
          </button>
          <button onClick={confirm} className="flex-1 py-3 rounded-full text-sm font-bold" style={{ background: T.accent, color: T.page }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { T, isDark } = useThemeContext();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chartMode, setChartMode] = useState<"week" | "month">("week");
  const [readingDays, setReadingDays] = useState<string[]>([]);
  const [totalChapters, setTotalChapters] = useState(0);
  const [quizPoints, setQuizPoints] = useState(0);

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [savingReminder, setSavingReminder] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (p) {
        const prof = p as unknown as ProfileData;
        setProfile(prof);
        setDisplayName(prof.display_name ?? "");
        setAvatarUrl(prof.avatar_url ?? null);
        setReminderEnabled(prof.reminder_enabled === true);
        setReminderTime((prof as Record<string, unknown>).reminder_time as string ?? "20:00");
      }
      const { data: days } = await supabase.from("completed_days").select("read_date").eq("user_id", user.id).not("read_date", "is", null);
      if (days) {
        setReadingDays((days as DayReading[]).map((d) => d.read_date));
        setTotalChapters(days.length);
      }
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const { data: qr } = await supabase.from("quiz_results").select("bonus_points, completed_at").eq("user_id", user.id).gte("completed_at", monday.toISOString());
      if (qr) setQuizPoints((qr as QuizResult[]).reduce((s, r) => s + (r.bonus_points ?? 0), 0));
    })();
  }, [user]);

  const chartData = useMemo(() => {
    const days = chartMode === "week" ? getLast7Days() : getLast30Days();
    const set = new Set(readingDays);
    return days.map((date) => {
      const d = new Date(date);
      return { date, label: chartMode === "week" ? DAY_LABELS[d.getDay()] : d.getDate().toString(), read: set.has(date) };
    });
  }, [chartMode, readingDays]);
  const readCount = chartData.filter((d) => d.read).length;
  const totalDays = chartData.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const handleCropConfirm = async (blob: Blob) => {
    if (!user) return;
    setCropSrc(null);
    setUploading(true);
    try {
      const path = `${user.id}/avatar.jpg`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: publicUrl } as unknown as Record<string, unknown>).eq("user_id", user.id);
      setAvatarUrl(publicUrl);
      toast.success("Foto atualizada!");
    } catch {
      toast.error("Falha ao enviar foto.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
    toast.success("Nome salvo!");
  };

  const handleToggleReminder = async () => {
    if (!user) return;
    const newVal = !reminderEnabled;
    setReminderEnabled(newVal);
    setSavingReminder(true);
    await supabase.from("profiles").update({ reminder_enabled: newVal } as unknown as Record<string, unknown>).eq("user_id", user.id);
    setSavingReminder(false);
    toast.success(newVal ? "Lembrete ativado!" : "Lembrete desativado.");
  };
  const handleSaveTime = async (t: string) => {
    if (!user) return;
    setReminderTime(t);
    await supabase.from("profiles").update({ reminder_time: t } as unknown as Record<string, unknown>).eq("user_id", user.id);
    toast.success(`Horário salvo: ${t}`);
  };

  // LEVEL 1 — highlight card with clip-path
  const clipCard = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: "1.25rem",
    clipPath: "polygon(0 0, calc(100% - 1rem) 0, 100% 1rem, 100% 100%, 0 100%)",
  };
  // LEVEL 2 — grid/list card
  const gridCard = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: "0.875rem",
  };

  return (
    <div className="min-h-screen pb-28 relative overflow-x-hidden transition-colors duration-500" style={{ background: T.page }}>
      {isDark && (
        <div className="pointer-events-none fixed inset-0 z-10" style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.02) 2px,rgba(0,0,0,0.02) 4px)" }} />
      )}

      {cropSrc && <CropModal src={cropSrc} onConfirm={handleCropConfirm} onCancel={() => setCropSrc(null)} />}

      {/* ── Header ─────────────────────────────────────── */}
      <div className="relative px-5 pt-12 pb-8 overflow-hidden">
        {isDark && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 110% at 15% -10%, ${T.accentGlow} 0%, transparent 65%)` }} />
        )}
        <div className="relative flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 hover:opacity-70 transition-opacity" style={{ color: T.textMuted }}>
            <ArrowLeft size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
          </button>
          <ThemeToggle />
        </div>
        <div className="relative">
          <Eyebrow accent>Jornada Bíblica</Eyebrow>
          <h1 className="text-4xl font-black mt-1 transition-colors duration-500" style={{ color: T.textPrimary, letterSpacing: "-0.04em" }}>
            Meu Perfil
          </h1>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-4 relative z-0">
        {/* ── Avatar + name ──────────────────────────────── */}
        <div className="relative p-6 flex flex-col items-center gap-5 transition-colors duration-500" style={{ ...clipCard, clipPath: "polygon(0 0, calc(100% - 1.75rem) 0, 100% 1.75rem, 100% 100%, 0 100%)" }}>
          <div className="absolute top-0 right-0 pointer-events-none" style={{ width: "2rem", height: "2rem", borderTop: `1.5px solid ${T.accent}`, borderRight: `1.5px solid ${T.accent}` }} />

          <div className="relative">
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="relative group block">
              <div className="w-24 h-24 rounded-full overflow-hidden" style={{ border: `3px solid ${T.accent}`, boxShadow: `0 0 28px ${T.accentGlow}` }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" onError={() => setAvatarUrl(null)} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-black" style={{ background: T.accentDim, color: T.accent }}>
                    {displayName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.55)" }}>
                {uploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={20} color="white" />}
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {profile && (
            <div className="flex items-center gap-1.5 rounded-full px-4 py-1.5" style={{ background: T.accentDim, border: `1px solid ${T.borderAc}` }}>
              <Flame size={13} color={T.accent} />
              <span className="text-xs font-bold" style={{ color: T.accent }}>{profile.streak} dias seguidos</span>
            </div>
          )}

          <div className="w-full">
            <Eyebrow>Nome de exibição</Eyebrow>
            <div className="flex gap-2 mt-2">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none transition-all"
                style={{ background: T.card2, color: T.textPrimary, border: `1.5px solid ${T.border}` }}
                onFocus={(e) => (e.target.style.borderColor = T.accent)}
                onBlur={(e) => (e.target.style.borderColor = T.border)}
                placeholder="Seu nome"
              />
              <button onClick={handleSaveName} className="rounded-2xl px-5 text-sm font-bold hover:opacity-90 transition-opacity" style={{ background: T.accent, color: T.page }}>
                Salvar
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-5 flex flex-col gap-1 transition-colors duration-500" style={{ background: T.accent, borderRadius: "1.5rem", clipPath: "polygon(0 0, calc(100% - 1.25rem) 0, 100% 1.25rem, 100% 100%, 0 100%)" }}>
            <BookOpen size={18} color={T.page} />
            <p className="text-4xl font-black mt-1" style={{ color: T.page, letterSpacing: "-0.05em", lineHeight: 1 }}>{totalChapters}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: `${T.page}99` }}>dias com leitura</p>
          </div>
          <div className="p-5 flex flex-col gap-1 transition-colors duration-500" style={clipCard}>
            <Flame size={18} color={T.accent} />
            <p className="text-4xl font-black mt-1" style={{ color: T.accent, letterSpacing: "-0.05em", lineHeight: 1 }}>{profile?.longest_streak ?? 0}</p>
            <Eyebrow>maior sequência</Eyebrow>
          </div>
        </div>

        {/* ── Weekly points ─────────────────────────────── */}
        <div className="p-5 relative overflow-hidden transition-colors duration-500" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "1.5rem" }}>
          {isDark && (
            <div className="absolute top-0 right-0 pointer-events-none" style={{ width: "200px", height: "200px", background: `radial-gradient(circle, ${T.accentGlow} 0%, transparent 70%)`, transform: "translate(30%,-30%)" }} />
          )}
          <div className="relative flex items-center justify-between">
            <div>
              <Eyebrow accent>Pontuação semanal</Eyebrow>
              <p className="text-5xl font-black mt-2" style={{ color: T.textPrimary, letterSpacing: "-0.05em", lineHeight: 1 }}>
                {(readCount * 10 + quizPoints).toLocaleString()}
              </p>
              <p className="text-xs mt-2" style={{ color: T.textMuted }}>
                <span style={{ color: T.accent }}>{readCount * 10}</span> leitura ·{" "}
                <span style={{ color: T.accent }}>{quizPoints}</span> quiz
              </p>
            </div>
            <Trophy size={44} color={T.accent} style={{ opacity: 0.2 }} />
          </div>
        </div>

        {/* ── Chart ─────────────────────────────────────── */}
        <div className="p-5 transition-colors duration-500" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "1.5rem" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} color={T.accent} />
              <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Leituras</span>
            </div>
            <div className="flex rounded-full p-0.5" style={{ background: T.card2 }}>
              {(["week", "month"] as const).map((m) => (
                <button key={m} onClick={() => setChartMode(m)} className="px-3 py-1 rounded-full text-xs font-bold transition-all" style={chartMode === m ? { background: T.accent, color: T.page } : { color: T.textMuted }}>
                  {m === "week" ? "Semana" : "Mês"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-1 h-20">
            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end rounded-t overflow-hidden" style={{ background: T.card2 }}>
                  <div className="w-full rounded-t transition-all duration-500" style={{ height: d.read ? "100%" : "18%", background: d.read ? T.accent : T.card2 }} />
                </div>
                {chartMode === "week" && <span className="text-[9px] font-medium" style={{ color: T.textMuted }}>{d.label}</span>}
                {chartMode === "month" && parseInt(d.label) % 5 === 0 && <span className="text-[9px] font-medium" style={{ color: T.textMuted }}>{d.label}</span>}
              </div>
            ))}
          </div>
          <div className="mt-3 h-0.5 rounded-full overflow-hidden" style={{ background: T.card2 }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(readCount / totalDays) * 100}%`, background: T.accent }} />
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: T.textMuted }}>
            <span style={{ color: T.accent }}>{readCount}</span> de {totalDays} dias com leitura
          </p>
        </div>

        {/* ── Notification ──────────────────────────────── */}
        <div className="p-5 transition-colors duration-500" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "1.5rem" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: reminderEnabled ? T.accentDim : T.card2 }}>
                {reminderEnabled ? <Bell size={17} color={T.accent} /> : <BellOff size={17} color={T.textMuted} />}
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: T.textPrimary }}>Lembrete de leitura</p>
                <p className="text-xs" style={{ color: T.textMuted }}>
                  {reminderEnabled ? `Ativo · todos os dias às ${reminderTime}` : "Desativado — toque para ativar"}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleReminder}
              disabled={savingReminder}
              aria-checked={reminderEnabled}
              className="relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none"
              style={{ background: reminderEnabled ? T.accent : T.card2, border: `1.5px solid ${reminderEnabled ? T.accent : T.border}` }}
            >
              <span className="inline-block w-5 h-5 mt-0.5 rounded-full bg-white shadow transform transition-transform duration-200" style={{ transform: reminderEnabled ? "translateX(1.5rem)" : "translateX(0.125rem)" }} />
            </button>
          </div>
          {reminderEnabled && (
            <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
              <Eyebrow>Escolha o melhor horário</Eyebrow>
              <div className="flex flex-wrap gap-2 mt-3">
                {REMINDER_TIMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => handleSaveTime(t)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={
                      reminderTime === t
                        ? { background: T.accent, color: T.page }
                        : { background: "transparent", color: T.textMuted, border: `1px solid ${T.border}` }
                    }
                  >
                    {reminderTime === t && <Check size={9} className="inline mr-1" />}
                    {t}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-start gap-3 p-3 rounded-2xl" style={{ background: T.card2, border: `1px solid ${T.borderAc}` }}>
                <Bell size={13} color={T.accent} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold" style={{ color: T.textPrimary }}>Prévia da notificação</p>
                  <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>{reminderMessage(reminderTime)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Locked placeholder ────────────────────────── */}
        <div className="p-5 mb-4 transition-colors duration-500" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "1.5rem" }}>
          <div className="flex items-center gap-2">
            <Lock size={13} color={T.textDim} />
            <span className="text-sm font-bold" style={{ color: T.textMuted }}>Conquistas em breve</span>
          </div>
        </div>
      </div>
    </div>
  );
}
