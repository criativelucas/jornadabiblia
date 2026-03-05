import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { bibleBooks, getReadChaptersByBook } from "@/data/bibleBooks";
import { milestones } from "@/data/streakMilestones";
import { getMonths, planOptions, generateCustomDays, type CustomPlanConfig } from "@/data/planData";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowLeft, Flame, BookOpen, Trophy, Calendar, Lock, Camera } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const WEEK_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const iconMap: Record<string, React.ElementType> = {
  Flame,
  Shield: Trophy,
  Layers: Trophy,
  Star: Trophy,
  Sword: Trophy,
  Anchor: Trophy,
  Music: Trophy,
  Crown: Trophy,
};

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<any>(null);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  const [monthlyData, setMonthlyData] = useState<{ name: string; chapters: number }[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ name: string; chapters: number }[]>([]);
  const [chartView, setChartView] = useState<"Semana" | "Mês">("Mês");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (prof) {
        setProfile(prof);
        setAvatarUrl(prof.avatar_url || null);
      }

      const { data: days } = await supabase
        .from("completed_days")
        .select("month_index, day_index, read_date, plan_id")
        .eq("user_id", user.id);

      if (days) {
        const plan = (prof as any)?.selected_plan || "6months";
        const planDays = new Set(days.filter((d) => d.plan_id === plan).map((d) => `${d.month_index}-${d.day_index}`));
        setCompletedDays(planDays);

        // Monthly chart data (last 6 months)
        const now = new Date();
        const monthCounts = new Map<string, number>();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthCounts.set(key, 0);
        }
        for (const day of days) {
          if (day.read_date) {
            const monthKey = day.read_date.substring(0, 7);
            if (monthCounts.has(monthKey)) {
              monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
            }
          }
        }
        setMonthlyData(
          [...monthCounts.entries()].map(([key, count]) => ({
            name: MONTH_NAMES[parseInt(key.split("-")[1]) - 1],
            chapters: count,
          })),
        );

        // Weekly chart data (last 7 days)
        const last7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split("T")[0];
        });
        const byDate = new Map<string, number>();
        for (const day of days) {
          if (day.read_date) {
            byDate.set(day.read_date, (byDate.get(day.read_date) || 0) + 1);
          }
        }
        setWeeklyData(
          last7.map((date) => ({
            name: WEEK_NAMES[new Date(date + "T12:00:00").getDay()],
            chapters: byDate.get(date) || 0,
          })),
        );
      }
    };
    load();
  }, [user]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    try {
      await supabase.storage.from("avatars").upload(`public/${user.id}.jpg`, file, { upsert: true });
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(`public/${user.id}.jpg`);
      const newUrl = urlData.publicUrl + `?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: newUrl }).eq("user_id", user.id);
      setAvatarUrl(newUrl);
    } finally {
      setAvatarUploading(false);
    }
  };

  const selectedPlan = profile?.selected_plan || "6months";
  const currentPlan = planOptions.find((p) => p.id === selectedPlan) || planOptions[1];

  const activeDays = useMemo(() => {
    if (selectedPlan === "custom" && profile?.custom_plan_config) {
      return generateCustomDays(profile.custom_plan_config as CustomPlanConfig);
    }
    return currentPlan.days;
  }, [selectedPlan, profile, currentPlan]);

  const activeTargetMonths =
    selectedPlan === "custom" ? Math.max(1, Math.ceil(activeDays.length / 30)) : currentPlan.targetMonths;

  const months = useMemo(() => getMonths(activeDays, activeTargetMonths), [activeDays, activeTargetMonths]);
  const readChapters = useMemo(
    () => getReadChaptersByBook(completedDays, activeDays, months),
    [completedDays, activeDays, months],
  );

  const completedBooks = useMemo(
    () => bibleBooks.filter((b) => (readChapters.get(b.name)?.size || 0) >= b.chapters),
    [readChapters],
  );

  const totalChaptersRead = useMemo(() => {
    let total = 0;
    readChapters.forEach((set) => (total += set.size));
    return total;
  }, [readChapters]);

  const unlockedMilestones = profile?.unlocked_milestones || [];
  const unlockedList = milestones.filter((m) => unlockedMilestones.includes(m.dias));
  const lockedList = milestones.filter((m) => !unlockedMilestones.includes(m.dias));

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Skeleton className="h-4 w-16 mb-6" />
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-52 rounded-2xl mb-8" />
          <div className="grid grid-cols-4 gap-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {/* Avatar clicável */}
          <div className="relative cursor-pointer group" onClick={handleAvatarClick}>
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {(profile.display_name || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {/* Overlay câmera */}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1.5">
              <Camera className="w-4 h-4 text-white" />
            </div>
            {/* Spinner durante upload */}
            {avatarUploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

          <div>
            <h1 className="text-xl font-bold text-foreground">{profile.display_name || "Leitor"}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {profile.streak > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <Flame className="w-4 h-4 text-orange-500" fill="currentColor" />
                <span className="text-sm font-bold text-orange-500">{profile.streak} dias seguidos</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="p-4 rounded-2xl bg-card border border-border text-center">
            <BookOpen className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold text-foreground">{totalChaptersRead}</p>
            <p className="text-[10px] text-muted-foreground">capítulos lidos</p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border text-center">
            <Trophy className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold text-foreground">{completedBooks.length}</p>
            <p className="text-[10px] text-muted-foreground">livros concluídos</p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border text-center">
            <Flame className="w-5 h-5 mx-auto text-orange-500 mb-1" />
            <p className="text-xl font-bold text-foreground">{profile.longest_streak}</p>
            <p className="text-[10px] text-muted-foreground">maior sequência</p>
          </div>
        </div>

        {/* Chart com toggle Semana / Mês */}
        <div className="mb-8 p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Capítulos por {chartView === "Semana" ? "semana" : "mês"}
              </h3>
            </div>
            {/* Toggle pill */}
            <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
              {(["Semana", "Mês"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setChartView(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    chartView === tab
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartView === "Mês" ? monthlyData : weeklyData}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="chapters" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Badges conquistadas */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">🏆 Conquistas desbloqueadas</h3>
            <span className="text-xs text-muted-foreground">
              {unlockedList.length} de {milestones.length}
            </span>
          </div>

          {unlockedList.length === 0 ? (
            <div className="p-6 rounded-2xl border border-border bg-muted/20 text-center">
              <p className="text-sm text-muted-foreground">🌱 Sua primeira conquista está chegando. Continue lendo!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {unlockedList.map((m) => {
                const Icon = iconMap[m.icon] || Trophy;
                return (
                  <div
                    key={m.dias}
                    className="p-4 rounded-2xl border border-primary/30 bg-primary/10 text-center relative"
                  >
                    <Icon className="w-8 h-8 mx-auto mb-2" style={{ color: m.cor }} />
                    <p className="text-xs font-semibold text-foreground truncate">{m.titulo}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{m.dias} dias</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Badges bloqueadas */}
        {lockedList.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-muted-foreground mb-3">🔒 Ainda por conquistar</h3>
            <div className="grid grid-cols-4 gap-2">
              {lockedList.map((m) => {
                const Icon = iconMap[m.icon] || Trophy;
                return (
                  <div
                    key={m.dias}
                    className="p-3 rounded-2xl border border-border bg-muted/30 text-center opacity-50"
                    title={`Complete ${m.dias} dias para desbloquear`}
                  >
                    <div className="relative">
                      <Icon className="w-6 h-6 mx-auto mb-1 grayscale blur-[1px]" />
                      <Lock className="w-3 h-3 absolute top-0 right-1/4 text-muted-foreground" />
                    </div>
                    <p className="text-[9px] text-muted-foreground truncate">{m.titulo}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
