import { useEffect, useState } from "react";
import { Flame, Shield, Layers, Star, Sword, Anchor, Music, Crown, Zap, Trophy, CheckCircle2 } from "lucide-react";
import { milestones } from "@/data/streakMilestones";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton, RankingSkeleton } from "@/components/ui/skeleton";
import WeeklyRanking from "@/components/WeeklyRanking";
import { useThemeContext } from "@/contexts/ThemeContext";
import type { SectionId } from "./AppSidebar";

const iconMap: Record<string, React.ElementType> = { Flame, Shield, Layers, Star, Sword, Anchor, Music, Crown };

interface Props {
  streak: number;
  longestStreak: number;
  unlockedMilestones: number[];
  onNavigate?: (section: SectionId) => void;
}

function getLast365Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return days;
}

function getWeeks(days: string[]) {
  const firstDate = new Date(days[0]);
  const startPad = firstDate.getDay();
  const padded: (string | null)[] = [...Array(startPad).fill(null), ...days];
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
  return weeks;
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const AchievementsTab = ({ streak, longestStreak, unlockedMilestones, onNavigate }: Props) => {
  const { user } = useAuth();
  const { T } = useThemeContext();
  const [readDates, setReadDates] = useState<Set<string>>(new Set());
  const [percentile, setPercentile] = useState<number | null>(null);
  const [loadingHeatmap, setLoadingHeatmap] = useState(true);

  useEffect(() => {
    if (!user) { setLoadingHeatmap(false); return; }
    const fetchData = async () => {
      const { data: daysData } = await supabase.from("completed_days").select("read_date").eq("user_id", user.id);
      if (daysData) {
        setReadDates(new Set(daysData.map((r) => (r as Record<string, unknown>).read_date as string).filter(Boolean)));
      }
      const { data: rankingData } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => Promise<{ data: Array<{ user_id: string; weekly_points: number }> | null }> } })
        .from("weekly_ranking")
        .select("user_id, weekly_points");
      if (rankingData && rankingData.length > 0) {
        const myEntry = rankingData.find((r) => r.user_id === user.id);
        const myPoints = myEntry?.weekly_points ?? 0;
        const below = rankingData.filter((r) => (r.weekly_points ?? 0) < myPoints).length;
        setPercentile(Math.round((below / rankingData.length) * 100));
      }
      setLoadingHeatmap(false);
    };
    fetchData();
  }, [user, streak]);

  const allDays = getLast365Days();
  const weeks = getWeeks(allDays);
  const totalRead = readDates.size;

  const monthPositions: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstReal = week.find((d) => d !== null);
    if (firstReal) {
      const m = new Date(firstReal).getMonth();
      if (m !== lastMonth) { monthPositions.push({ label: MONTH_LABELS[m], weekIndex: wi }); lastMonth = m; }
    }
  });

  const clipCard = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: "1.5rem",
    clipPath: "polygon(0 0, calc(100% - 1.25rem) 0, 100% 1.25rem, 100% 100%, 0 100%)",
  };

  if (unlockedMilestones.length === 0 && streak === 0 && totalRead === 0 && !loadingHeatmap) {
    return (
      <div className="space-y-6">
        <div className="p-8 text-center" style={clipCard}>
          <Zap className="w-10 h-10 mx-auto mb-3" style={{ color: T.textDim }} />
          <p className="text-sm mb-4" style={{ color: T.textMuted }}>Nenhuma conquista ainda.</p>
          {onNavigate && (
            <button onClick={() => onNavigate("plans")} className="px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:opacity-90" style={{ background: T.accent, color: T.page }}>
              Marcar leitura de hoje →
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ranking */}
      <div className="p-4" style={clipCard}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4" style={{ color: T.accent }} />
            <h3 className="text-sm font-bold" style={{ color: T.textPrimary }}>Ranking da Semana</h3>
          </div>
          <span className="text-[10px]" style={{ color: T.textMuted }}>🔄 reseta segunda-feira</span>
        </div>
        <WeeklyRanking />
      </div>

      {/* Percentil */}
      {percentile !== null && percentile > 0 && (
        <div className="p-4 rounded-2xl text-center" style={{ background: T.accentDim, border: `1px solid ${T.borderAc}` }}>
          <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>
            Você está melhor que <span style={{ color: T.accent }}>{percentile}%</span> dos leitores essa semana
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-5" style={clipCard}>
          <p className="text-xs font-medium mb-1" style={{ color: T.textMuted }}>Sequência atual</p>
          {loadingHeatmap ? (
            <Skeleton className="skeleton-shimmer h-8 w-16 mt-1" />
          ) : (
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" fill="currentColor" />
              <span className="text-2xl font-black" style={{ color: T.textPrimary, letterSpacing: "-0.04em" }}>{streak}</span>
            </div>
          )}
        </div>
        <div className="p-5" style={clipCard}>
          <p className="text-xs font-medium mb-1" style={{ color: T.textMuted }}>Maior sequência</p>
          {loadingHeatmap ? (
            <Skeleton className="skeleton-shimmer h-8 w-16 mt-1" />
          ) : (
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" style={{ color: T.accent }} />
              <span className="text-2xl font-black" style={{ color: T.textPrimary, letterSpacing: "-0.04em" }}>{longestStreak}</span>
            </div>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="p-4" style={clipCard}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: T.textMuted }}>Leituras no ano</p>
          <p className="text-xs" style={{ color: T.textMuted }}>
            {loadingHeatmap ? "..." : <><span className="font-semibold" style={{ color: T.textPrimary }}>{totalRead}</span> dias lidos</>}
          </p>
        </div>
        {loadingHeatmap ? (
          <div className="space-y-1.5 overflow-hidden">
            <div className="flex gap-0.5">
              {[...Array(12)].map((_, i) => <Skeleton key={i} className="skeleton-shimmer h-2.5 flex-1 rounded" />)}
            </div>
            <div className="flex gap-0.5">
              {[...Array(53)].map((_, wi) => (
                <div key={wi} className="flex flex-col gap-0.5">
                  {[...Array(7)].map((_, di) => <Skeleton key={di} className="skeleton-shimmer rounded-[2px]" style={{ width: 11, height: 11 }} />)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <div style={{ minWidth: `${weeks.length * 13}px` }}>
              <div className="flex mb-1" style={{ gap: "2px" }}>
                {weeks.map((_, wi) => {
                  const mp = monthPositions.find((m) => m.weekIndex === wi);
                  return (
                    <div key={wi} style={{ width: "11px", flexShrink: 0 }}>
                      {mp && <span className="text-[8px] whitespace-nowrap" style={{ color: T.textMuted, display: "block", transform: "translateX(-2px)" }}>{mp.label}</span>}
                    </div>
                  );
                })}
              </div>
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
                            width: 11, height: 11, borderRadius: 2,
                            backgroundColor: read ? T.accent : T.card2,
                            opacity: read ? 1 : 0.5,
                            outline: isToday ? `1px solid ${T.accent}` : "none",
                            outlineOffset: "1px",
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2 justify-end">
                <span className="text-[9px]" style={{ color: T.textMuted }}>Menos</span>
                {[0.15, 0.4, 0.7, 1].map((op, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: op < 0.3 ? T.card2 : T.accent, opacity: op }} />
                ))}
                <span className="text-[9px]" style={{ color: T.textMuted }}>Mais</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Próximos marcos */}
      {streak > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: T.textMuted }}>Próximos marcos</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {milestones.filter((m) => !unlockedMilestones.includes(m.dias)).slice(0, 4).map((m) => {
              const progress = Math.min(100, (streak / m.dias) * 100);
              const Icon = iconMap[m.icon] || Star;
              return (
                <div key={m.dias} className="flex-shrink-0 w-24 p-3 text-center" style={clipCard}>
                  <Icon className="w-6 h-6 mx-auto mb-1" style={{ color: T.textDim }} />
                  <p className="text-xs font-bold" style={{ color: T.textPrimary }}>{m.dias} dias</p>
                  <div className="h-1.5 w-full rounded-full overflow-hidden mt-2" style={{ background: T.card2 }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: T.accent }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de conquistas */}
      <div className="space-y-2">
        {milestones.map((m) => {
          const unlocked = unlockedMilestones.includes(m.dias);
          const progress = Math.min(100, (streak / m.dias) * 100);
          const Icon = iconMap[m.icon] || Star;
          return (
            <div
              key={m.dias}
              className="flex items-center gap-4 p-4 transition-all"
              style={{
                ...clipCard,
                opacity: unlocked ? 1 : 0.7,
                background: unlocked ? T.accentDim : T.card,
                border: `1px solid ${unlocked ? T.borderAc : T.border}`,
              }}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!unlocked ? "grayscale opacity-30" : ""}`}
                style={{ backgroundColor: unlocked ? `${m.cor}20` : undefined }}
              >
                <Icon className="w-5 h-5" style={{ color: unlocked ? m.cor : undefined }} />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm" style={{ color: unlocked ? T.textPrimary : T.textMuted }}>{m.titulo}</p>
                  {unlocked && <CheckCircle2 className="w-4 h-4" style={{ color: T.accent }} />}
                </div>
                <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>{m.descricao}</p>
                {!unlocked && (
                  <div className="h-1.5 w-full rounded-full overflow-hidden mt-2" style={{ background: T.card2 }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: T.accent }} />
                  </div>
                )}
              </div>
              {!unlocked && <span className="text-xs font-mono" style={{ color: T.textMuted }}>{streak}/{m.dias}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsTab;
