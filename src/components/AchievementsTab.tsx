import { useEffect, useState } from "react";
import { Flame, Shield, Layers, Star, Sword, Anchor, Music, Crown, Zap, Trophy, CheckCircle2 } from "lucide-react";
import { milestones } from "@/data/streakMilestones";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { SectionId } from "./AppSidebar";

const iconMap: Record<string, React.ElementType> = { Flame, Shield, Layers, Star, Sword, Anchor, Music, Crown };

interface Props {
  streak: number;
  longestStreak: number;
  unlockedMilestones: number[];
  onNavigate?: (section: SectionId) => void;
}

// ─── Heatmap helpers ───────────────────────────────────────────────────────────
function getLast365Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return days;
}

function getWeeks(days: string[], readSet: Set<string>) {
  // Pad start so first day aligns to its weekday (0=Sun)
  const firstDate = new Date(days[0]);
  const startPad = firstDate.getDay(); // 0–6
  const paddedDays: (string | null)[] = [...Array(startPad).fill(null), ...days];
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7));
  }
  return weeks;
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// ──────────────────────────────────────────────────────────────────────────────

const AchievementsTab = ({ streak, longestStreak, unlockedMilestones, onNavigate }: Props) => {
  const { user } = useAuth();
  const [readDates, setReadDates] = useState<Set<string>>(new Set());
  const [percentile, setPercentile] = useState<number | null>(null);
  const [loadingHeatmap, setLoadingHeatmap] = useState(true);

  // Fetch read dates and percentile
  useEffect(() => {
    if (!user) {
      setLoadingHeatmap(false);
      return;
    }

    const fetchData = async () => {
      // Read dates: from completed_days created_at timestamps
      const { data: daysData } = await supabase.from("completed_days").select("created_at").eq("user_id", user.id);

      if (daysData) {
        const dates = new Set(
          daysData.map((r) => {
            const d = new Date(r.created_at);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          }),
        );
        setReadDates(dates);
      }

      // Percentile: count users with streak <= current user's streak
      if (streak > 0) {
        const { count: totalCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });

        const { count: belowCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .lte("streak", streak);

        if (totalCount && belowCount && totalCount > 1) {
          const pct = Math.round((belowCount / totalCount) * 100);
          setPercentile(pct);
        }
      }

      setLoadingHeatmap(false);
    };

    fetchData();
  }, [user, streak]);

  const allDays = getLast365Days();
  const weeks = getWeeks(allDays, readDates);
  const totalRead = readDates.size;

  // Month label positions (week index where each month starts)
  const monthPositions: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstReal = week.find((d) => d !== null);
    if (firstReal) {
      const m = new Date(firstReal).getMonth();
      if (m !== lastMonth) {
        monthPositions.push({ label: MONTH_LABELS[m], weekIndex: wi });
        lastMonth = m;
      }
    }
  });

  if (unlockedMilestones.length === 0 && streak === 0 && totalRead === 0) {
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-2xl bg-card border border-border text-center">
          <Zap className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Nenhuma conquista ainda.</p>
          {onNavigate && (
            <button
              onClick={() => onNavigate("plans")}
              className="px-5 py-2.5 rounded-[10px] bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
            >
              Marcar leitura de hoje →
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-5 rounded-2xl bg-card border border-border">
          <p className="text-xs text-muted-foreground font-medium mb-1">Sequência atual</p>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" fill="currentColor" />
            <span className="text-2xl font-bold text-foreground">{streak}</span>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border">
          <p className="text-xs text-muted-foreground font-medium mb-1">Maior sequência</p>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-2xl font-bold text-foreground">{longestStreak}</span>
          </div>
        </div>
      </div>

      {/* ── Percentil ────────────────────────────────────────────────── */}
      {percentile !== null && percentile >= 10 && (
        <div className="p-4 rounded-2xl bg-primary/[0.07] border border-primary/20 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Você está no top <span className="text-primary">{100 - percentile}%</span> mais dedicados
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sua sequência de {streak} dias supera {percentile}% dos usuários
            </p>
          </div>
        </div>
      )}

      {/* ── Heatmap anual ────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Leituras no ano</p>
          <p className="text-xs text-muted-foreground">
            {loadingHeatmap ? (
              "..."
            ) : (
              <>
                <span className="text-foreground font-semibold">{totalRead}</span> dias lidos
              </>
            )}
          </p>
        </div>

        {loadingHeatmap ? (
          <div className="h-24 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <div style={{ minWidth: `${weeks.length * 13}px` }}>
              {/* Month labels */}
              <div className="flex mb-1" style={{ gap: "2px" }}>
                {weeks.map((_, wi) => {
                  const mp = monthPositions.find((m) => m.weekIndex === wi);
                  return (
                    <div key={wi} style={{ width: "11px", flexShrink: 0 }}>
                      {mp && (
                        <span
                          className="text-[8px] text-muted-foreground whitespace-nowrap"
                          style={{ display: "block", transform: "translateX(-2px)" }}
                        >
                          {mp.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Grid */}
              <div className="flex" style={{ gap: "2px" }}>
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col" style={{ gap: "2px" }}>
                    {week.map((day, di) => {
                      if (!day) return <div key={di} style={{ width: 11, height: 11 }} />;
                      const read = readDates.has(day);
                      const isToday = day === allDays[allDays.length - 1];
                      return (
                        <div
                          key={di}
                          title={`${day}${read ? " ✓" : ""}`}
                          style={{
                            width: 11,
                            height: 11,
                            borderRadius: 2,
                            backgroundColor: read ? "hsl(var(--primary))" : "hsl(var(--muted))",
                            opacity: read ? 1 : 0.5,
                            outline: isToday ? "1px solid hsl(var(--primary))" : "none",
                            outlineOffset: "1px",
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-2 mt-2 justify-end">
                <span className="text-[9px] text-muted-foreground">Menos</span>
                {[0.15, 0.4, 0.7, 1].map((op, i) => (
                  <div
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      backgroundColor: op < 0.3 ? "hsl(var(--muted))" : "hsl(var(--primary))",
                      opacity: op,
                    }}
                  />
                ))}
                <span className="text-[9px] text-muted-foreground">Mais</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Próximos marcos ──────────────────────────────────────────── */}
      {streak > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Próximos marcos</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {milestones
              .filter((m) => !unlockedMilestones.includes(m.dias))
              .slice(0, 4)
              .map((m) => {
                const progress = Math.min(100, (streak / m.dias) * 100);
                const Icon = iconMap[m.icon] || Star;
                return (
                  <div
                    key={m.dias}
                    className="flex-shrink-0 w-24 p-3 rounded-2xl bg-card border border-border text-center"
                  >
                    <Icon className="w-6 h-6 mx-auto mb-1 text-muted-foreground/40" />
                    <p className="text-xs font-bold text-foreground">{m.dias} dias</p>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Lista de conquistas ───────────────────────────────────────── */}
      <div className="space-y-2">
        {milestones.map((m) => {
          const unlocked = unlockedMilestones.includes(m.dias);
          const progress = Math.min(100, (streak / m.dias) * 100);
          const Icon = iconMap[m.icon] || Star;
          return (
            <div
              key={m.dias}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${unlocked ? "bg-card border-border" : "bg-card/50 border-border"}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${unlocked ? "" : "opacity-30"}`}
                style={{ backgroundColor: unlocked ? `${m.cor}20` : undefined }}
              >
                <Icon className="w-5 h-5" style={{ color: unlocked ? m.cor : undefined }} />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold text-sm ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                    {m.titulo}
                  </p>
                  {unlocked && <CheckCircle2 className="w-4 h-4 text-lime" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{m.descricao}</p>
                {!unlocked && (
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
              {!unlocked && (
                <span className="text-xs text-muted-foreground font-mono">
                  {streak}/{m.dias}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsTab;
