import { useEffect, useState, useCallback } from "react";
import { Flame, Shield, Layers, Star, Sword, Anchor, Music, Crown, Zap, Trophy, CheckCircle2, BookOpen, X, Lock } from "lucide-react";
import { milestones } from "@/data/streakMilestones";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import WeeklyRanking from "@/components/WeeklyRanking";
import { useThemeContext } from "@/contexts/ThemeContext";
import { bibleBooks } from "@/data/bibleBooks";
import QuizModal from "@/components/QuizModal";
import type { SectionId } from "./AppSidebar";

const iconMap: Record<string, React.ElementType> = { Flame, Shield, Layers, Star, Sword, Anchor, Music, Crown };

// ─── All possible achievements ───────────────────────────────────────────────
interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  category: 'book' | 'chapters' | 'streak' | 'special';
}

function buildAllAchievements(): AchievementDef[] {
  const defs: AchievementDef[] = [];

  // Book achievements
  const bookKeyMap: Record<string, string> = {};
  bibleBooks.forEach((b) => {
    const key = `book_${b.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')}`;
    bookKeyMap[b.name] = key;
    defs.push({
      key,
      title: b.name,
      description: `Complete todos os ${b.chapters} capítulos de ${b.name}`,
      icon: BookOpen,
      color: '__ACCENT__',
      category: 'book',
    });
  });

  // Chapter milestones
  [10, 50, 100, 200, 500].forEach((n) => {
    defs.push({
      key: `chapters_${n}`,
      title: `${n} Capítulos`,
      description: `Leia ${n} capítulos no total`,
      icon: Layers,
      color: '#60a5fa',
      category: 'chapters',
    });
  });

  // Streak milestones
  [7, 14, 30, 60].forEach((n) => {
    defs.push({
      key: `streak_${n}`,
      title: `${n} Dias Seguidos`,
      description: `Mantenha uma sequência de ${n} dias`,
      icon: Flame,
      color: '#f97316',
      category: 'streak',
    });
  });

  // Special
  defs.push({
    key: 'quiz_first',
    title: 'Primeiro Quiz',
    description: 'Complete seu primeiro quiz de livro',
    icon: Trophy,
    color: '#a78bfa',
    category: 'special',
  });
  defs.push({
    key: 'plan_complete',
    title: 'Plano Completo',
    description: 'Conclua um plano de leitura inteiro',
    icon: Crown,
    color: '#fbbf24',
    category: 'special',
  });

  return defs;
}

const ALL_ACHIEVEMENTS = buildAllAchievements();

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'ontem';
  if (diffDays < 30) return `há ${diffDays} dias`;
  return date.toLocaleDateString('pt-BR');
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  streak: number;
  longestStreak: number;
  unlockedMilestones: number[];
  onNavigate?: (section: SectionId) => void;
  celebrationBook?: { name: string; category: string; chapters: number } | null;
  onCelebrationDismiss?: () => void;
}

const AchievementsTab = ({ streak, longestStreak, unlockedMilestones, onNavigate, celebrationBook, onCelebrationDismiss }: Props) => {
  const { user } = useAuth();
  const { T } = useThemeContext();
  const [readDates, setReadDates] = useState<Set<string>>(new Set());
  const [percentile, setPercentile] = useState<number | null>(null);
  const [loadingHeatmap, setLoadingHeatmap] = useState(true);
  const [unlockedKeys, setUnlockedKeys] = useState<Map<string, string>>(new Map()); // key → achieved_at
  const [loadingAchievements, setLoadingAchievements] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showQuiz, setShowQuiz] = useState<string | null>(null);

  // Show celebration card for 5s
  useEffect(() => {
    if (celebrationBook) {
      setShowCelebration(true);
      const timer = setTimeout(() => {
        setShowCelebration(false);
        onCelebrationDismiss?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [celebrationBook]);

  useEffect(() => {
    if (!user) { setLoadingHeatmap(false); setLoadingAchievements(false); return; }
    const fetchData = async () => {
      // Fetch read dates
      const { data: daysData } = await supabase.from("completed_days").select("read_date").eq("user_id", user.id);
      if (daysData) {
        setReadDates(new Set(daysData.map((r) => (r as Record<string, unknown>).read_date as string).filter(Boolean)));
      }
      // Fetch ranking percentile
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

      // Fetch achievements from DB
      const { data: achData } = await supabase.from("achievements").select("achievement_key, achieved_at").eq("user_id", user.id);
      if (achData) {
        const map = new Map<string, string>();
        achData.forEach((a) => map.set(a.achievement_key, a.achieved_at || ''));
        setUnlockedKeys(map);
      }
      setLoadingAchievements(false);
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

  const unlockedList = ALL_ACHIEVEMENTS.filter((a) => unlockedKeys.has(a.key));
  const lockedList = ALL_ACHIEVEMENTS.filter((a) => !unlockedKeys.has(a.key));

  const clipCard = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: "1.5rem",
    clipPath: "polygon(0 0, calc(100% - 1.25rem) 0, 100% 1.25rem, 100% 100%, 0 100%)",
  };

  if (showQuiz) {
    return <QuizModal bookName={showQuiz} onClose={() => setShowQuiz(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Celebration card */}
      {showCelebration && celebrationBook && (
        <div
          className="p-5 relative animate-fade-in-down transition-all"
          style={{
            background: T.accentDim,
            border: `2px solid ${T.borderAc}`,
            borderRadius: "1.5rem",
            clipPath: "polygon(0 0, calc(100% - 1.25rem) 0, 100% 1.25rem, 100% 100%, 0 100%)",
          }}
        >
          <button
            onClick={() => { setShowCelebration(false); onCelebrationDismiss?.(); }}
            className="absolute top-3 right-3 p-1 rounded-full transition-all hover:opacity-70"
            style={{ color: T.textMuted }}
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${T.accent}20` }}>
              <BookOpen className="w-8 h-8" style={{ color: T.accent }} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: T.accent }}>📖 Livro Concluído!</p>
              <p className="text-lg font-black" style={{ color: T.textPrimary }}>{celebrationBook.name}</p>
              <p className="text-xs" style={{ color: T.textMuted }}>{celebrationBook.category} · {celebrationBook.chapters} capítulos</p>
            </div>
          </div>
          <button
            onClick={() => { setShowCelebration(false); setShowQuiz(celebrationBook.name); }}
            className="mt-3 w-full py-2.5 rounded-full text-sm font-bold transition-all hover:opacity-90"
            style={{ background: T.accent, color: T.page }}
          >
            Fazer Quiz do Livro 🧠
          </button>
        </div>
      )}

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

      {/* ── Unlocked achievements ─────────────────────── */}
      {unlockedList.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: T.textMuted }}>
            Desbloqueadas ({unlockedList.length})
          </p>
          <div className="grid grid-cols-2 gap-3">
            {unlockedList.map((a) => {
              const Icon = a.icon;
              const achievedAt = unlockedKeys.get(a.key);
              return (
                <div
                  key={a.key}
                  className="p-4 transition-all duration-300"
                  style={{
                    background: T.accentDim,
                    border: `1px solid ${T.borderAc}`,
                    borderRadius: "1.25rem",
                    clipPath: "polygon(0 0, calc(100% - 1rem) 0, 100% 1rem, 100% 100%, 0 100%)",
                  }}
                >
                  <Icon className="w-7 h-7 mb-2" style={{ color: a.color === '__ACCENT__' ? T.accent : a.color }} />
                  <p className="text-sm font-bold" style={{ color: T.textPrimary }}>{a.title}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>
                    {achievedAt ? timeAgo(achievedAt) : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Locked achievements ──────────────────────── */}
      {lockedList.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: T.textMuted }}>
            Bloqueadas
          </p>
          <div className="grid grid-cols-4 gap-2">
            {lockedList.slice(0, 20).map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.key}
                  className="p-3 text-center opacity-30 grayscale transition-all"
                  style={{
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: "1rem",
                  }}
                >
                  <Lock className="w-5 h-5 mx-auto mb-1" style={{ color: T.textDim }} />
                  <p className="text-[9px] font-medium truncate" style={{ color: T.textMuted }}>{a.title}</p>
                  <p className="text-[8px] mt-0.5 leading-tight" style={{ color: T.textDim }}>{a.description.slice(0, 30)}…</p>
                </div>
              );
            })}
          </div>
          {lockedList.length > 20 && (
            <p className="text-xs text-center mt-2" style={{ color: T.textMuted }}>
              +{lockedList.length - 20} conquistas restantes
            </p>
          )}
        </div>
      )}

      {/* Próximos marcos (streak) */}
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
    </div>
  );
};

export default AchievementsTab;
