import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Flame,
  BookOpen,
  Calendar,
  Camera,
  Bell,
  BellOff,
  Check,
  Loader,
  LogOut,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { useThemeContext, ThemeToggle } from "@/contexts/ThemeContext";

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
interface DayReading { read_date: string; }
interface QuizResult { bonus_points: number; completed_at: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TOTAL_BIBLE_CHAPTERS = 1189;

const TIME_GROUPS = [
  { label: "Manhã", times: ["05:00","05:30","06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30","10:00"] },
  { label: "Tarde", times: ["12:00","18:00"] },
  { label: "Noite", times: ["19:00","20:00","21:00","22:00"] },
];

function reminderMessage(time: string) {
  const h = parseInt(time);
  if (h < 12) return "Bom dia! Que tal começar o dia na Palavra?";
  if (h < 18) return "Pausa para a leitura bíblica de hoje.";
  return "Antes de dormir, um capítulo te espera.";
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getToday() { return new Date().toISOString().split("T")[0]; }

function getLevel(streak: number): string {
  if (streak === 0) return "✦ Iniciante";
  if (streak < 7) return "✦ Semente";
  if (streak < 14) return "✦✦ Muda";
  if (streak < 30) return "✦✦ Crescendo";
  if (streak < 60) return "✦✦✦ Raízes";
  if (streak < 100) return "✦✦✦ Árvore";
  return "✦✦✦✦ Floresta";
}

// ─── CropModal ────────────────────────────────────────────────────────────────
function CropModal({ src, onConfirm, onCancel }: { src: string; onConfirm: (blob: Blob) => void; onCancel: () => void }) {
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
          ref={canvasRef} width={SIZE} height={SIZE}
          className="rounded-full cursor-grab active:cursor-grabbing touch-none"
          style={{ width: SIZE, height: SIZE, border: `3px solid ${T.accent}`, boxShadow: `0 0 24px ${T.accentGlow}` }}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        />
        <div className="w-full flex items-center gap-3">
          <span className="text-xs font-bold" style={{ color: T.textMuted }}>−</span>
          <input type="range" min={baseScale} max={baseScale * 3} step={baseScale * 0.02} value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))} className="flex-1" style={{ accentColor: T.accent }} />
          <span className="text-xs font-bold" style={{ color: T.textMuted }}>+</span>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel} className="flex-1 py-3 rounded-full text-sm font-semibold" style={{ border: `1.5px solid ${T.border}`, color: T.textMuted, background: "transparent" }}>Cancelar</button>
          <button onClick={confirm} className="flex-1 py-3 rounded-full text-sm font-bold" style={{ background: T.accent, color: T.page }}>Confirmar</button>
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

  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);

  const [chartMode, setChartMode] = useState<"week" | "month">("week");
  const [readingDays, setReadingDays] = useState<string[]>([]);
  const [readCountByDate, setReadCountByDate] = useState<Record<string, number>>({});
  const [totalChapters, setTotalChapters] = useState(0);

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [savingReminder, setSavingReminder] = useState(false);

  const [soundOn, setSoundOn] = useState(
    localStorage.getItem('soundEnabled') !== 'false'
  );

  const today = getToday();
  const bibleProgress = totalChapters / TOTAL_BIBLE_CHAPTERS;

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
        const dates = (days as DayReading[]).map((d) => d.read_date);
        setReadingDays(dates);
        setTotalChapters(days.length);
        // Count chapters per date
        const counts: Record<string, number> = {};
        dates.forEach((d) => { counts[d] = (counts[d] ?? 0) + 1; });
        setReadCountByDate(counts);
      }
    })();
  }, [user]);

  // Auto-save name with debounce
  useEffect(() => {
    if (!user || !profile || displayName === profile.display_name) return;
    setSavedName(false);
    const timer = setTimeout(async () => {
      setSavingName(true);
      await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
      setSavingName(false);
      setSavedName(true);
      setTimeout(() => setSavedName(false), 2000);
    }, 800);
    return () => clearTimeout(timer);
  }, [displayName, user, profile]);

  // Week chart data with proportional counts
  const weekData = useMemo(() => {
    const days = getLast7Days();
    return days.map((date) => {
      const d = new Date(date + "T12:00:00");
      return { date, label: DAY_LABELS[d.getDay()], count: readCountByDate[date] ?? 0 };
    });
  }, [readCountByDate]);

  const maxWeekCount = useMemo(() => Math.max(...weekData.map(d => d.count), 1), [weekData]);

  // Month calendar data
  const monthCalendar = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const readSet = new Set(readingDays);
    return { year, month, firstDay, daysInMonth, readSet };
  }, [readingDays]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const gridCard = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: "0.875rem",
  };

  const streak = profile?.streak ?? 0;
  const longestStreak = profile?.longest_streak ?? 0;
  const progressRadius = 38;
  const progressCircumference = 2 * Math.PI * progressRadius;
  const progressOffset = progressCircumference * (1 - bibleProgress);

  return (
    <div className="min-h-screen pb-28 relative overflow-x-hidden transition-colors duration-500 page-enter" style={{ background: T.page }}>
      {isDark && (
        <div className="pointer-events-none fixed inset-0 z-10" style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.02) 2px,rgba(0,0,0,0.02) 4px)" }} />
      )}

      {cropSrc && <CropModal src={cropSrc} onConfirm={handleCropConfirm} onCancel={() => setCropSrc(null)} />}

      {/* ── HERO SECTION ──────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: T.card, borderBottom: `1px solid ${T.border}` }}>
        {/* Glow background */}
        {isDark && (
          <div className="absolute pointer-events-none" style={{
            width: "200px", height: "200px", top: "-60px", right: "-40px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${T.accentGlow} 0%, transparent 70%)`,
            filter: "blur(40px)",
          }} />
        )}

        {/* Back + Theme */}
        <div className="px-5 pt-12 pb-2 flex items-center justify-between relative z-20">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 hover:opacity-70 transition-opacity" style={{ color: T.textMuted }}>
            <ArrowLeft size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
          </button>
          <ThemeToggle />
        </div>

        {/* Avatar + Info */}
        <div className="px-5 pb-6 flex items-center gap-5 relative z-20">
          {/* Avatar with progress ring */}
          <div className="relative shrink-0">
            <svg width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r={progressRadius} fill="none" stroke={T.card2} strokeWidth="4" />
              <circle
                cx="44" cy="44" r={progressRadius} fill="none"
                stroke={T.accent} strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={progressCircumference}
                strokeDashoffset={progressOffset}
                transform="rotate(-90 44 44)"
                style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.65,0.05,0,1)" }}
              />
            </svg>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute group block"
              style={{ top: "8px", left: "8px", width: "72px", height: "72px" }}
            >
              <div className="w-full h-full rounded-full overflow-hidden" style={{ border: `2px solid ${T.accent}` }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" onError={() => setAvatarUrl(null)} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.accentDim}, ${T.card2})` }}>
                    <span style={{ fontSize: "1.75rem", fontWeight: 900, color: T.accent }}>
                      {displayName?.[0]?.toUpperCase() ?? "J"}
                    </span>
                  </div>
                )}
              </div>
              {/* Camera overlay on hover */}
              <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.5)" }}>
                {uploading ? <Loader size={16} color="white" className="animate-spin" /> : <Camera size={16} color="white" />}
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Name + Streak */}
          <div className="flex-1 min-w-0">
            {/* Inline editable name */}
            <div className="relative">
              <input
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setSavedName(false); }}
                style={{
                  fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.04em",
                  color: T.textPrimary,
                  background: "transparent", border: "none", outline: "none",
                  width: "100%", padding: 0,
                  borderBottom: `1px solid ${savingName ? T.accent : savedName ? T.accent : "transparent"}`,
                  transition: "border-color 0.2s",
                }}
                placeholder="Seu nome"
              />
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                {savingName && <Loader size={12} style={{ color: T.textMuted }} className="animate-spin" />}
                {savedName && <Check size={12} style={{ color: T.accent }} />}
              </div>
            </div>

            {/* Streak pill + Level */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: T.accentDim, border: `1px solid ${T.borderAc}` }}>
                <Flame size={12} color={T.accent} />
                <span style={{ fontSize: "12px", fontWeight: 900, color: T.accent }}>{streak} dias</span>
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, letterSpacing: "0.04em" }}>
                {getLevel(streak)}
              </span>
            </div>
          </div>
        </div>

        {/* Bible progress bar */}
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Progresso na Bíblia</span>
            <span style={{ fontSize: "10px", fontWeight: 900, color: T.accent }}>{Math.round(bibleProgress * 100)}%</span>
          </div>
          <div style={{ height: "5px", borderRadius: "9999px", background: T.card2, overflow: "hidden" }}>
            <div className="progress-shimmer" style={{ height: "100%", width: `${bibleProgress * 100}%`, background: T.accent, borderRadius: "9999px", transition: "width 0.8s ease" }} />
          </div>
          <p style={{ fontSize: "10px", color: T.textDim, marginTop: "4px" }}>
            {totalChapters} capítulos lidos de {TOTAL_BIBLE_CHAPTERS}
          </p>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-4 mt-4 relative z-0">
        {/* ── STATS — 3 unique numbers ─────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: `${Math.round(bibleProgress * 100)}%`, label: "da Bíblia", color: T.accent },
            { value: totalChapters.toString(), label: "capítulos", color: T.textPrimary },
            { value: longestStreak.toString(), label: "recorde 🔥", color: T.textPrimary },
          ].map((s, i) => (
            <div key={i} className="p-4 flex flex-col items-center gap-1" style={gridCard}>
              <span style={{ fontSize: "1.75rem", fontWeight: 900, color: s.color, letterSpacing: "-0.04em", lineHeight: 1 }}>
                {s.value}
              </span>
              <span style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Chart ─────────────────────────────────────── */}
        <div className="p-5 transition-colors duration-500" style={gridCard}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} color={T.accent} />
              <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Leituras</span>
            </div>
            <div className="flex gap-2">
              {(["week", "month"] as const).map((m) => (
                <button key={m} onClick={() => setChartMode(m)}
                  style={{
                    padding: "6px 16px", borderRadius: "9999px",
                    fontWeight: 700, fontSize: "12px",
                    background: chartMode === m ? T.accent : T.card2,
                    color: chartMode === m ? T.page : T.textMuted,
                    border: `1px solid ${chartMode === m ? T.accent : T.border}`,
                    transition: "all 0.2s",
                  }}
                >
                  {m === "week" ? "Semana" : "Mês"}
                </button>
              ))}
            </div>
          </div>

          {/* WEEK mode — proportional bars */}
          {chartMode === "week" && (
            <div style={{ display: "flex", gap: "6px", height: "80px", alignItems: "flex-end" }}>
              {weekData.map((d, i) => {
                const isToday = d.date === today;
                const heightPct = d.count > 0 ? Math.max(20, (d.count / maxWeekCount) * 100) : 10;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    {/* Count label */}
                    {d.count > 0 && (
                      <span style={{ fontSize: "9px", fontWeight: 900, color: T.accent, lineHeight: 1 }}>{d.count}</span>
                    )}
                    <div style={{ width: "100%", flex: 1, display: "flex", alignItems: "flex-end" }}>
                      <div style={{
                        width: "100%", borderRadius: "4px 4px 0 0",
                        height: `${heightPct}%`,
                        background: isToday ? T.accent : d.count > 0 ? `${T.accent}99` : T.card2,
                        transition: "height 0.5s cubic-bezier(0.65,0.05,0,1)",
                        position: "relative",
                      }}>
                        {isToday && (
                          <div style={{ position: "absolute", top: "-6px", left: "50%", transform: "translateX(-50%)", width: "6px", height: "6px", borderRadius: "9999px", background: T.accent }} />
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: "9px", fontWeight: isToday ? 900 : 600, color: isToday ? T.accent : T.textMuted, textTransform: "uppercase" }}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* MONTH mode — calendar grid */}
          {chartMode === "month" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px", marginBottom: "4px" }}>
                {["D","S","T","Q","Q","S","S"].map((d, i) => (
                  <div key={i} style={{ textAlign: "center", fontSize: "9px", fontWeight: 700, color: T.textDim }}>{d}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px" }}>
                {Array.from({ length: monthCalendar.firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: monthCalendar.daysInMonth }, (_, i) => i + 1).map(day => {
                  const dateStr = `${monthCalendar.year}-${String(monthCalendar.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const read = monthCalendar.readSet.has(dateStr);
                  const isToday = dateStr === today;
                  return (
                    <div key={day} style={{
                      aspectRatio: "1",
                      borderRadius: "6px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "10px", fontWeight: 700,
                      background: isToday ? T.accent : read ? T.accentDim : T.card2,
                      color: isToday ? T.page : read ? T.accent : T.textDim,
                      border: `1px solid ${isToday ? T.accent : read ? T.borderAc : "transparent"}`,
                    }}>
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Sound toggle ──────────────────────────────── */}
        <div className="p-5 transition-colors duration-500" style={gridCard}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: soundOn ? T.accentDim : T.card2 }}>
                {soundOn ? <Volume2 size={17} color={T.accent} /> : <VolumeX size={17} color={T.textMuted} />}
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: T.textPrimary }}>Sons e vibração</p>
                <p className="text-xs" style={{ color: T.textMuted }}>
                  {soundOn ? "Ativo — feedback sonoro e tátil" : "Desativado"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                localStorage.setItem('soundEnabled', String(next));
              }}
              aria-checked={soundOn}
              className="relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none"
              style={{ background: soundOn ? T.accent : T.card2, border: `1.5px solid ${soundOn ? T.accent : T.border}` }}
            >
              <span className="inline-block w-5 h-5 mt-0.5 rounded-full bg-white shadow transform transition-transform duration-200" style={{ transform: soundOn ? "translateX(1.5rem)" : "translateX(0.125rem)" }} />
            </button>
          </div>
        </div>

        {/* ── Notification ──────────────────────────────── */}
        <div className="p-5 transition-colors duration-500" style={gridCard}>
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
              {TIME_GROUPS.map(group => (
                <div key={group.label} className="mb-3">
                  <p style={{ color: T.textDim, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
                    {group.label}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {group.times.map(t => (
                      <button key={t} onClick={() => handleSaveTime(t)}
                        style={{
                          borderRadius: "9999px", padding: "5px 12px",
                          fontSize: "12px", fontWeight: 700,
                          background: reminderTime === t ? T.accent : T.card2,
                          color: reminderTime === t ? T.page : T.textMuted,
                          border: `1px solid ${reminderTime === t ? T.accent : T.border}`,
                          transition: "all 0.15s",
                        }}
                      >
                        {reminderTime === t && "✓ "}{t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="mt-2 flex items-start gap-3 p-3" style={{ borderRadius: "0.875rem", background: T.card2, border: `1px solid ${T.borderAc}` }}>
                <Bell size={13} color={T.accent} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold" style={{ color: T.textPrimary }}>Prévia da notificação</p>
                  <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>{reminderMessage(reminderTime)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Logout ────────────────────────────────────── */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 py-3 rounded-full transition-all mb-4"
          style={{ border: `1.5px solid ${T.border}`, color: T.textMuted, background: "transparent" }}
        >
          <LogOut size={14} />
          <span className="text-sm font-semibold">Sair da conta</span>
        </button>
      </div>
    </div>
  );
}
