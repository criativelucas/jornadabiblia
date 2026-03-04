import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { bibleBooks, getReadChaptersByBook } from "@/data/bibleBooks";
import { milestones } from "@/data/streakMilestones";
import { getMonths, planOptions, generateCustomDays, type CustomPlanConfig } from "@/data/planData";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowLeft, Flame, BookOpen, Trophy, Calendar, Lock } from "lucide-react";

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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
  const [profile, setProfile] = useState<any>(null);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  const [monthlyData, setMonthlyData] = useState<{ name: string; chapters: number }[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (prof) setProfile(prof);

      const { data: days } = await supabase
        .from("completed_days")
        .select("month_index, day_index, read_date, plan_id")
        .eq("user_id", user.id);

      if (days) {
        const plan = (prof as any)?.selected_plan || "6months";
        const planDays = new Set(
          days.filter((d) => d.plan_id === plan).map((d) => `${d.month_index}-${d.day_index}`),
        );
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
      }
    };
    load();
  }, [user]);

  const selectedPlan = profile?.selected_plan || "6months";
  const currentPlan = planOptions.find((p) => p.id === selectedPlan) || planOptions[1];

  const activeDays = useMemo(() => {
    if (selectedPlan === "custom" && profile?.custom_plan_config) {
      return generateCustomDays(profile.custom_plan_config as CustomPlanConfig);
    }
    return currentPlan.days;
  }, [selectedPlan, profile, currentPlan]);

  const activeTargetMonths = selectedPlan === "custom"
    ? Math.max(1, Math.ceil(activeDays.length / 30))
    : currentPlan.targetMonths;

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

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back */}
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {(profile.display_name || "?").charAt(0).toUpperCase()}
            </span>
          </div>
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

        {/* Monthly chart */}
        <div className="mb-8 p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Capítulos por mês</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="chapters" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Badges */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-foreground mb-3">Conquistas</h3>
          <div className="grid grid-cols-4 gap-2">
            {milestones.map((m) => {
              const unlocked = unlockedMilestones.includes(m.dias);
              const Icon = iconMap[m.icon] || Trophy;
              return (
                <div
                  key={m.dias}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    unlocked ? "bg-card border-border" : "bg-muted/30 border-border opacity-50"
                  }`}
                  title={unlocked ? m.titulo : `Complete ${m.dias} dias para desbloquear`}
                >
                  <div className="relative">
                    <Icon
                      className={`w-6 h-6 mx-auto mb-1 ${unlocked ? "" : "blur-[1px] grayscale"}`}
                      style={{ color: unlocked ? m.cor : undefined }}
                    />
                    {!unlocked && <Lock className="w-3 h-3 absolute top-0 right-1/4 text-muted-foreground" />}
                  </div>
                  <p className="text-[9px] text-muted-foreground truncate">{m.titulo}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
