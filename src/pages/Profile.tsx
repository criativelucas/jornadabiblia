import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { bibleBooks, getReadChaptersByBook } from "@/data/bibleBooks";
import { milestones } from "@/data/milestones";
import { ArrowLeft, Flame, BookOpen, Trophy, Calendar, Lock, Camera, Bell, BellOff, Check } from "lucide-react";
import { toast } from "sonner";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  emerald: "#00c896",
  emeraldDim: "rgba(0,200,150,0.12)",
  emeraldGlow: "rgba(0,200,150,0.18)",
  page: "#0d0d0d",
  card: "#141414",
  card2: "#1a1a1a",
  border: "rgba(255,255,255,0.06)",
  borderEm: "rgba(0,200,150,0.25)",
  textPrimary: "#e8f5f0",
  textMuted: "#6b8070",
  textDim: "#3a4a40",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
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
  "05:00",
  "05:30",
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "12:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

function reminderMessage(time: string) {
  const h = parseInt(time);
  if (h < 12) return "☀️ Bom dia! Que tal começar o dia na Palavra?";
  if (h < 18) return "📖 Pausa para a leitura bíblica de hoje.";
  return "🌙 Antes de dormir, um capítulo te espera.";
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
}
function getLast30Days() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
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
    ctx.drawImage(img, offset.x + SIZE / 2 - w / 2, offset.y + SIZE / 2 - h / 2, w, h);
    ctx.restore();
  }, [scale, offset]);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      imgRef.current = img;
      setScale(Math.min(SIZE / img.naturalWidth, SIZE / img.naturalHeight));
      draw();
    };
  }, [src]);
  useEffect(() => {
    draw();
  }, [draw]);

  const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    dragging.current = true;
    const pos = "touches" in e ? e.touches[0] : e;
    lastPos.current = { x: pos.clientX, y: pos.clientY };
  };
  const onMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging.current) return;
    const pos = "touches" in e ? e.touches[0] : e;
    setOffset((prev) => ({
      x: prev.x + (pos.clientX - lastPos.current.x),
      y: prev.y + (pos.clientY - lastPos.current.y),
    }));
    lastPos.current = { x: pos.clientX, y: pos.clientY };
  };
  const onMouseUp = () => {
    dragging.current = false;
  };
  const handleConfirm = () => {
    canvasRef.current!.toBlob(
      (b) => {
        if (b) onConfirm(b);
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.85)" }}
    >
      <div
        className="rounded-3xl p-6 flex flex-col items-center gap-4 shadow-2xl mx-4 w-full max-w-sm"
        style={{ background: T.card, border: `1px solid ${T.border}` }}
      >
        <div className="w-full flex items-center justify-between">
          <h3 className="font-bold text-base" style={{ color: T.textPrimary }}>
            Ajustar foto
          </h3>
          <span className="text-xs font-medium" style={{ color: T.textMuted }}>
            Arraste para reposicionar
          </span>
        </div>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="rounded-full cursor-grab active:cursor-grabbing touch-none"
          style={{
            width: SIZE,
            height: SIZE,
            border: `3px solid ${T.emerald}`,
            boxShadow: `0 0 28px ${T.emeraldGlow}`,
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={onMouseDown}
          onTouchMove={onMouseMove}
          onTouchEnd={onMouseUp}
        />
        <div className="w-full flex items-center gap-3">
          <span className="text-xs font-bold" style={{ color: T.textMuted }}>
            −
          </span>
          <input
            type="range"
            min={0.3}
            max={3}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="flex-1"
            style={{ accentColor: T.emerald }}
          />
          <span className="text-xs font-bold" style={{ color: T.textMuted }}>
            +
          </span>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-full text-sm font-semibold"
            style={{ border: `1.5px solid ${T.border}`, color: T.textMuted, background: "transparent" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-full text-sm font-bold"
            style={{ background: T.emerald, color: T.page }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Eyebrow ──────────────────────────────────────────────────────────────────
function Eyebrow({ children, emerald }: { children: React.ReactNode; emerald?: boolean }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: emerald ? T.emerald : T.textMuted }}>
      {children}
    </p>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Force dark background on body/html — overrides any parent layout
  useEffect(() => {
    const prev = document.body.style.background;
    const prevHtml = document.documentElement.style.background;
    document.body.style.background = T.page;
    document.body.style.minHeight = "100vh";
    document.documentElement.style.background = T.page;
    return () => {
      document.body.style.background = prev;
      document.body.style.minHeight = "";
      document.documentElement.style.background = prevHtml;
    };
  }, []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chartMode, setChartMode] = useState<"week" | "month">("week");
  const [readingDays, setReadingDays] = useState<string[]>([]);
  const [completedBooks, setCompletedBooks] = useState<string[]>([]);
  const [totalChapters, setTotalChapters] = useState(0);
  const [quizPoints, setQuizPoints] = useState(0);

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [savingReminder, setSavingReminder] = useState(false);

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (p) {
        const prof = p as unknown as Profile;
        setProfile(prof);
        setDisplayName(prof.display_name ?? "");
        setAvatarUrl(prof.avatar_url ?? null);
        setReminderEnabled(prof.reminder_enabled ?? false);
        setReminderTime(prof.reminder_time ?? "20:00");
      }
      const { data: days } = await supabase
        .from("completed_days")
        .select("read_date")
        .eq("user_id", user.id)
        .not("read_date", "is", null);
      if (days) setReadingDays((days as DayReading[]).map((d) => d.read_date));

      const readByBook = getReadChaptersByBook(user.id);
      let total = 0;
      const completed: string[] = [];
      bibleBooks.forEach((book) => {
        const count = readByBook[book.name]?.size ?? 0;
        total += count;
        if (count >= book.chapters) completed.push(book.name);
      });
      setTotalChapters(total);
      setCompletedBooks(completed);

      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const { data: qr } = await supabase
        .from("quiz_results")
        .select("bonus_points, completed_at")
        .eq("user_id", user.id)
        .gte("completed_at", monday.toISOString());
      if (qr) setQuizPoints((qr as QuizResult[]).reduce((s, r) => s + (r.bonus_points ?? 0), 0));
    })();
  }, [user]);

  // ── Chart ───────────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const days = chartMode === "week" ? getLast7Days() : getLast30Days();
    const set = new Set(readingDays);
    return days.map((date) => {
      const d = new Date(date);
      return {
        date,
        label: chartMode === "week" ? DAY_LABELS[d.getDay()] : d.getDate().toString(),
        read: set.has(date),
      };
    });
  }, [chartMode, readingDays]);
  const readCount = chartData.filter((d) => d.read).length;
  const totalDays = chartData.length;

  // ── Avatar ──────────────────────────────────────────────────────────────────
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
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl } as unknown as Record<string, unknown>)
        .eq("user_id", user.id);
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
    await supabase
      .from("profiles")
      .update({ reminder_enabled: newVal } as unknown as Record<string, unknown>)
      .eq("user_id", user.id);
    setSavingReminder(false);
    toast.success(newVal ? "Lembrete ativado!" : "Lembrete desativado.");
  };

  const handleSaveTime = async (t: string) => {
    if (!user) return;
    setReminderTime(t);
    await supabase
      .from("profiles")
      .update({ reminder_time: t } as unknown as Record<string, unknown>)
      .eq("user_id", user.id);
    toast.success(`Horário salvo: ${t}`);
  };

  // ── Milestones ──────────────────────────────────────────────────────────────
  const unlockedMilestones = milestones.filter((m) =>
    m.type === "book"
      ? completedBooks.includes(m.book ?? "")
      : m.type === "chapters"
        ? totalChapters >= (m.threshold ?? 0)
        : false,
  );
  const lockedMilestones = milestones.filter((m) => !unlockedMilestones.includes(m));

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen pb-28 relative overflow-x-hidden"
      style={{ background: T.page, backgroundColor: T.page, isolation: "isolate" }}
    >
      {/* Scan-line texture */}
      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.02) 2px,rgba(0,0,0,0.02) 4px)",
        }}
      />

      {cropSrc && <CropModal src={cropSrc} onConfirm={handleCropConfirm} onCancel={() => setCropSrc(null)} />}

      {/* ── Hero header ──────────────────────────────────────────────────────── */}
      <div className="relative px-5 pt-12 pb-8 overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: "180px",
            background: `radial-gradient(ellipse 70% 110% at 15% -10%, ${T.emeraldGlow} 0%, transparent 70%)`,
          }}
        />
        <button
          onClick={() => navigate(-1)}
          className="relative flex items-center gap-2 mb-8 hover:opacity-70 transition-opacity"
          style={{ color: T.textMuted }}
        >
          <ArrowLeft size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
        </button>
        <div className="relative">
          <Eyebrow emerald>Jornada Bíblica</Eyebrow>
          <h1 className="text-4xl font-black mt-1" style={{ color: T.textPrimary, letterSpacing: "-0.04em" }}>
            Meu Perfil
          </h1>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-4 relative z-0">
        {/* ── Avatar + name ─────────────────────────────────────────────────── */}
        <div
          className="relative p-6 flex flex-col items-center gap-5"
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: "1.5rem",
            clipPath: "polygon(0 0, calc(100% - 1.75rem) 0, 100% 1.75rem, 100% 100%, 0 100%)",
          }}
        >
          {/* Notch corner accent */}
          <div
            className="absolute top-0 right-0 pointer-events-none"
            style={{
              width: "2rem",
              height: "2rem",
              borderTop: `1.5px solid ${T.emerald}`,
              borderRight: `1.5px solid ${T.emerald}`,
            }}
          />

          <div className="relative">
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="relative group block">
              <div
                className="w-24 h-24 rounded-full overflow-hidden"
                style={{
                  border: `3px solid ${T.emerald}`,
                  boxShadow: `0 0 28px ${T.emeraldGlow}`,
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                    onError={() => setAvatarUrl(null)}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-3xl font-black"
                    style={{ background: T.emeraldDim, color: T.emerald }}
                  >
                    {displayName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.6)" }}
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera size={20} color="white" />
                )}
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {profile && (
            <div
              className="flex items-center gap-1.5 rounded-full px-4 py-1.5"
              style={{ background: T.emeraldDim, border: `1px solid ${T.borderEm}` }}
            >
              <Flame size={13} color={T.emerald} />
              <span className="text-xs font-bold" style={{ color: T.emerald }}>
                {profile.streak} dias seguidos
              </span>
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
                onFocus={(e) => (e.target.style.borderColor = T.emerald)}
                onBlur={(e) => (e.target.style.borderColor = T.border)}
                placeholder="Seu nome"
              />
              <button
                onClick={handleSaveName}
                className="rounded-2xl px-5 text-sm font-bold transition-all hover:opacity-90"
                style={{ background: T.emerald, color: T.page }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="p-5 flex flex-col gap-1"
            style={{
              background: T.emerald,
              borderRadius: "1.5rem",
              clipPath: "polygon(0 0, calc(100% - 1.25rem) 0, 100% 1.25rem, 100% 100%, 0 100%)",
            }}
          >
            <BookOpen size={18} color={T.page} />
            <p className="text-4xl font-black mt-1" style={{ color: T.page, letterSpacing: "-0.05em", lineHeight: 1 }}>
              {totalChapters}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "rgba(0,0,0,0.55)" }}>
              capítulos lidos
            </p>
          </div>
          <div
            className="p-5 flex flex-col gap-1"
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: "1.5rem",
              clipPath: "polygon(0 0, calc(100% - 1.25rem) 0, 100% 1.25rem, 100% 100%, 0 100%)",
            }}
          >
            <Flame size={18} color={T.emerald} />
            <p
              className="text-4xl font-black mt-1"
              style={{ color: T.emerald, letterSpacing: "-0.05em", lineHeight: 1 }}
            >
              {profile?.longest_streak ?? 0}
            </p>
            <Eyebrow>maior sequência</Eyebrow>
          </div>
        </div>

        {/* ── Weekly points ─────────────────────────────────────────────────── */}
        <div
          className="p-5 relative overflow-hidden"
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: "1.5rem",
          }}
        >
          <div
            className="absolute top-0 right-0 pointer-events-none"
            style={{
              width: "200px",
              height: "200px",
              background: `radial-gradient(circle, ${T.emeraldGlow} 0%, transparent 70%)`,
              transform: "translate(30%,-30%)",
            }}
          />
          <div className="relative flex items-center justify-between">
            <div>
              <Eyebrow emerald>Pontuação semanal</Eyebrow>
              <p
                className="text-5xl font-black mt-2"
                style={{ color: T.textPrimary, letterSpacing: "-0.05em", lineHeight: 1 }}
              >
                {(readCount * 10 + quizPoints).toLocaleString()}
              </p>
              <p className="text-xs mt-2" style={{ color: T.textMuted }}>
                <span style={{ color: T.emerald }}>{readCount * 10}</span> leitura ·{" "}
                <span style={{ color: T.emerald }}>{quizPoints}</span> quiz
              </p>
            </div>
            <Trophy size={44} color={T.emerald} style={{ opacity: 0.18 }} />
          </div>
        </div>

        {/* ── Chart ─────────────────────────────────────────────────────────── */}
        <div className="p-5" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "1.5rem" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} color={T.emerald} />
              <span className="text-sm font-bold" style={{ color: T.textPrimary }}>
                Leituras
              </span>
            </div>
            <div className="flex rounded-full p-0.5" style={{ background: T.card2 }}>
              {(["week", "month"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setChartMode(m)}
                  className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                  style={chartMode === m ? { background: T.emerald, color: T.page } : { color: T.textMuted }}
                >
                  {m === "week" ? "Semana" : "Mês"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end gap-1 h-20">
            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end rounded-t overflow-hidden" style={{ background: T.card2 }}>
                  <div
                    className="w-full rounded-t transition-all duration-500"
                    style={{ height: d.read ? "100%" : "18%", background: d.read ? T.emerald : T.card2 }}
                  />
                </div>
                {chartMode === "week" && (
                  <span className="text-[9px] font-medium" style={{ color: T.textMuted }}>
                    {d.label}
                  </span>
                )}
                {chartMode === "month" && parseInt(d.label) % 5 === 0 && (
                  <span className="text-[9px] font-medium" style={{ color: T.textMuted }}>
                    {d.label}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 h-0.5 rounded-full overflow-hidden" style={{ background: T.card2 }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(readCount / totalDays) * 100}%`, background: T.emerald }}
            />
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: T.textMuted }}>
            <span style={{ color: T.emerald }}>{readCount}</span> de {totalDays} dias com leitura
          </p>
        </div>

        {/* ── Unlocked badges ───────────────────────────────────────────────── */}
        {unlockedMilestones.length > 0 && (
          <div className="p-5" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "1.5rem" }}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={14} color={T.emerald} />
              <span className="text-sm font-bold" style={{ color: T.textPrimary }}>
                Conquistas
              </span>
              <span
                className="text-xs font-bold rounded-full px-2 py-0.5 ml-auto"
                style={{ background: T.emeraldDim, color: T.emerald }}
              >
                {unlockedMilestones.length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {unlockedMilestones.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: T.card2, border: `1px solid ${T.borderEm}` }}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: T.textPrimary }}>
                      {m.title}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: T.textMuted }}>
                      {m.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Notification ──────────────────────────────────────────────────── */}
        <div className="p-5" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "1.5rem" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: reminderEnabled ? T.emeraldDim : T.card2 }}
              >
                {reminderEnabled ? <Bell size={17} color={T.emerald} /> : <BellOff size={17} color={T.textMuted} />}
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: T.textPrimary }}>
                  Lembrete de leitura
                </p>
                <p className="text-xs" style={{ color: T.textMuted }}>
                  {reminderEnabled ? `Todos os dias às ${reminderTime}` : "Desativado"}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleReminder}
              disabled={savingReminder}
              className="relative rounded-full transition-all duration-300"
              style={{
                width: "3rem",
                height: "1.5rem",
                background: reminderEnabled ? T.emerald : T.card2,
                border: `1.5px solid ${reminderEnabled ? T.emerald : T.border}`,
              }}
            >
              <span
                className="absolute top-0.5 rounded-full bg-white shadow transition-all duration-300"
                style={{ width: "1rem", height: "1rem", left: reminderEnabled ? "calc(100% - 1.25rem)" : "0.2rem" }}
              />
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
                        ? { background: T.emerald, color: T.page, border: "none" }
                        : { background: "transparent", color: T.textMuted, border: `1px solid ${T.border}` }
                    }
                  >
                    {reminderTime === t && <Check size={9} className="inline mr-1" />}
                    {t}
                  </button>
                ))}
              </div>

              <div
                className="mt-4 flex items-start gap-3 p-3 rounded-2xl"
                style={{ background: T.card2, border: `1px solid ${T.borderEm}` }}
              >
                <Bell size={13} color={T.emerald} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold" style={{ color: T.textPrimary }}>
                    Prévia da notificação
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
                    {reminderMessage(reminderTime)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Locked badges ─────────────────────────────────────────────────── */}
        {lockedMilestones.length > 0 && (
          <div
            className="p-5 mb-4"
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "1.5rem" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Lock size={13} color={T.textDim} />
              <span className="text-sm font-bold" style={{ color: T.textMuted }}>
                Ainda por conquistar
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {lockedMilestones.map((m) => (
                <div key={m.id} className="flex flex-col items-center gap-1.5" style={{ opacity: 0.3 }}>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl grayscale"
                    style={{ background: T.card2 }}
                  >
                    {m.icon}
                  </div>
                  <p className="text-[9px] text-center leading-tight" style={{ color: T.textMuted }}>
                    {m.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
