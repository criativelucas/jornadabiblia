import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { bibleBooks, getReadChaptersByBook } from "@/data/bibleBooks";
import { milestones } from "@/data/milestones";
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
  X as XIcon,
} from "lucide-react";
import { toast } from "sonner";

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
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function getLast30Days() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ─── CropModal ───────────────────────────────────────────────────────────────
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
      const fitScale = Math.min(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
      setScale(fitScale);
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
    const canvas = canvasRef.current!;
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 flex flex-col items-center gap-4 shadow-2xl mx-4 w-full max-w-sm">
        <h3 className="font-bold text-lg text-gray-900">Ajustar foto</h3>
        <p className="text-sm text-gray-500">Arraste para reposicionar</p>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="rounded-full cursor-grab active:cursor-grabbing touch-none border-4 border-lime-300"
          style={{ width: SIZE, height: SIZE }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={onMouseDown}
          onTouchMove={onMouseMove}
          onTouchEnd={onMouseUp}
        />
        <div className="w-full flex items-center gap-3">
          <span className="text-xs text-gray-400">−</span>
          <input
            type="range"
            min={0.3}
            max={3}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="flex-1 accent-lime-400"
          />
          <span className="text-xs text-gray-400">+</span>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-full border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-full bg-lime-400 text-gray-900 font-bold text-sm hover:bg-lime-500 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chart state
  const [chartMode, setChartMode] = useState<"week" | "month">("week");
  const [readingDays, setReadingDays] = useState<string[]>([]);

  // Achievements state
  const [completedBooks, setCompletedBooks] = useState<string[]>([]);
  const [totalChapters, setTotalChapters] = useState(0);
  const [quizPoints, setQuizPoints] = useState(0);

  // Notification state
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [savingReminder, setSavingReminder] = useState(false);

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    (async () => {
      // Profile
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (p) {
        const prof = p as unknown as Profile;
        setProfile(prof);
        setDisplayName(prof.display_name ?? "");
        setAvatarUrl(prof.avatar_url ?? null);
        setReminderEnabled(prof.reminder_enabled ?? false);
        setReminderTime(prof.reminder_time ?? "20:00");
      }

      // Reading days
      const { data: days } = await supabase
        .from("completed_days")
        .select("read_date")
        .eq("user_id", user.id)
        .not("read_date", "is", null);
      if (days) setReadingDays((days as DayReading[]).map((d) => d.read_date));

      // Chapters read
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

      // Quiz points
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const { data: qr } = await supabase
        .from("quiz_results")
        .select("bonus_points, completed_at")
        .eq("user_id", user.id)
        .gte("completed_at", monday.toISOString());
      if (qr) {
        const pts = (qr as QuizResult[]).reduce((s, r) => s + (r.bonus_points ?? 0), 0);
        setQuizPoints(pts);
      }
    })();
  }, [user]);

  // ── Chart data ──────────────────────────────────────────────────────────────
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

  // ── Avatar upload ────────────────────────────────────────────────────────────
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
      const ext = "jpg";
      const path = `${user.id}/avatar.${ext}`;
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

  // ── Save name ────────────────────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
    toast.success("Nome salvo!");
  };

  // ── Save reminder ────────────────────────────────────────────────────────────
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

  // ── Achievements ─────────────────────────────────────────────────────────────
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
    <div className="min-h-screen pb-28" style={{ background: "#f0f0ea" }}>
      {/* Crop modal */}
      {cropSrc && <CropModal src={cropSrc} onConfirm={handleCropConfirm} onCancel={() => setCropSrc(null)} />}

      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Voltar</span>
        </button>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Perfil</h1>
      </div>

      <div className="px-5 flex flex-col gap-4">
        {/* ── Avatar + name card ── */}
        <div className="bg-white rounded-3xl shadow-sm p-6 flex flex-col items-center gap-5">
          {/* Avatar */}
          <div className="relative">
            <button onClick={() => fileInputRef.current?.click()} className="relative group block" disabled={uploading}>
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-lime-300 shadow-md">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                    onError={() => setAvatarUrl(null)}
                  />
                ) : (
                  <div className="w-full h-full bg-lime-100 flex items-center justify-center text-3xl font-black text-lime-600">
                    {displayName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera size={20} className="text-white" />
                )}
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Streak badge */}
          {profile && (
            <div className="flex items-center gap-1.5 bg-lime-400 rounded-full px-4 py-1.5 shadow-sm">
              <Flame size={15} className="text-gray-900" />
              <span className="text-sm font-bold text-gray-900">{profile.streak} dias seguidos</span>
            </div>
          )}

          {/* Name input */}
          <div className="w-full">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
              Nome de exibição
            </label>
            <div className="flex gap-2">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 text-sm text-gray-900 border border-gray-100 focus:outline-none focus:border-lime-300 transition-colors"
                placeholder="Seu nome"
              />
              <button
                onClick={handleSaveName}
                className="bg-lime-400 hover:bg-lime-500 text-gray-900 font-bold text-sm rounded-2xl px-5 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>

        {/* ── Unlocked badges ── */}
        {unlockedMilestones.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm p-5">
            <h2 className="text-base font-black text-gray-900 mb-3 flex items-center gap-2">
              <Trophy size={16} className="text-lime-500" />
              Conquistas desbloqueadas
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {unlockedMilestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 bg-lime-50 border border-lime-100 rounded-2xl p-3">
                  <span className="text-2xl">{m.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{m.title}</p>
                    <p className="text-xs text-gray-400 truncate">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Progress card — lime */}
          <div className="bg-lime-400 rounded-3xl shadow-sm p-5">
            <BookOpen size={20} className="text-gray-900 mb-2" />
            <p className="text-3xl font-black text-gray-900">{totalChapters}</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">capítulos lidos</p>
          </div>
          {/* Streak card — dark */}
          <div className="bg-gray-900 rounded-3xl shadow-sm p-5">
            <Flame size={20} className="text-lime-400 mb-2" />
            <p className="text-3xl font-black text-white">{profile?.longest_streak ?? 0}</p>
            <p className="text-xs font-semibold text-gray-400 mt-0.5">maior sequência</p>
          </div>
        </div>

        {/* ── Reading chart ── */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Calendar size={16} className="text-lime-500" />
              Leituras
            </h2>
            {/* Toggle */}
            <div className="flex bg-gray-100 rounded-full p-0.5">
              {(["week", "month"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setChartMode(m)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    chartMode === m ? "bg-lime-400 text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  {m === "week" ? "Semana" : "Mês"}
                </button>
              ))}
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-1.5 h-24">
            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end rounded-t-lg overflow-hidden bg-gray-100">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      d.read ? "bg-lime-400" : "bg-gray-100"
                    }`}
                    style={{ height: d.read ? "100%" : "20%" }}
                  />
                </div>
                {chartMode === "week" && <span className="text-[9px] text-gray-400 font-medium">{d.label}</span>}
                {chartMode === "month" && parseInt(d.label) % 5 === 0 && (
                  <span className="text-[9px] text-gray-400 font-medium">{d.label}</span>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-3 text-center">
            {readCount} de {totalDays} dias com leitura
          </p>
        </div>

        {/* ── Weekly points ── */}
        <div className="bg-gray-900 rounded-3xl shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pontos esta semana</p>
            <p className="text-3xl font-black text-white mt-1">{(readCount * 10 + quizPoints).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {readCount * 10} leitura · {quizPoints} quiz
            </p>
          </div>
          <Trophy size={40} className="text-lime-400 opacity-60" />
        </div>

        {/* ── Notification card ── */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  reminderEnabled ? "bg-lime-100" : "bg-gray-100"
                }`}
              >
                {reminderEnabled ? (
                  <Bell size={18} className="text-lime-600" />
                ) : (
                  <BellOff size={18} className="text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Lembrete de leitura</p>
                <p className="text-xs text-gray-400">
                  {reminderEnabled ? `Todos os dias às ${reminderTime}` : "Desativado"}
                </p>
              </div>
            </div>

            {/* Toggle switch */}
            <button
              onClick={handleToggleReminder}
              disabled={savingReminder}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                reminderEnabled ? "bg-lime-400" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                  reminderEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Time picker — expands when enabled */}
          {reminderEnabled && (
            <div className="mt-4 border-t border-gray-50 pt-4">
              <p className="text-xs font-semibold text-gray-400 mb-3">Escolha o melhor horário</p>
              <div className="flex flex-wrap gap-2">
                {REMINDER_TIMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => handleSaveTime(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      reminderTime === t
                        ? "bg-lime-400 border-lime-400 text-gray-900"
                        : "border-gray-200 text-gray-500 hover:border-lime-300"
                    }`}
                  >
                    {reminderTime === t && <Check size={10} className="inline mr-1" />}
                    {t}
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div className="mt-4 bg-gray-50 rounded-2xl p-3 flex items-start gap-3">
                <Bell size={14} className="text-lime-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-700">Prévia da notificação</p>
                  <p className="text-xs text-gray-500 mt-0.5">{reminderMessage(reminderTime)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Locked badges ── */}
        {lockedMilestones.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm p-5 mb-4">
            <h2 className="text-base font-black text-gray-900 mb-3 flex items-center gap-2">
              <Lock size={16} className="text-gray-300" />
              <span className="text-gray-400">Ainda por conquistar</span>
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {lockedMilestones.map((m) => (
                <div key={m.id} className="flex flex-col items-center gap-1 opacity-40 grayscale">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-xl">
                    {m.icon}
                  </div>
                  <p className="text-[9px] text-gray-400 text-center leading-tight">{m.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
