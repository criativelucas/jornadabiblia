import { useEffect, useState } from "react";
import { Flame, Shield, Layers, Star, Sword, Anchor, Music, Crown, Zap, Trophy, BookOpen, X, Lock, Check, Award, RefreshCw, Medal } from "lucide-react";
import { milestones } from "@/data/streakMilestones";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import WeeklyRanking from "@/components/WeeklyRanking";
import { useThemeContext } from "@/contexts/ThemeContext";
import { bibleBooks, getReadChaptersByBook } from "@/data/bibleBooks";
import QuizModal from "@/components/QuizModal";
import type { SectionId } from "./AppSidebar";

const iconMap: Record<string, React.ElementType> = { Flame, Shield, Layers, Star, Sword, Anchor, Music, Crown };

// ─── Achievement definitions ─────────────────────────────────────────────────
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
  bibleBooks.forEach((b) => {
    const key = `book_${b.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')}`;
    defs.push({ key, title: b.name, description: `Complete todos os ${b.chapters} capítulos de ${b.name}`, icon: BookOpen, color: '__ACCENT__', category: 'book' });
  });
  [10, 50, 100, 200, 500].forEach((n) => {
    defs.push({ key: `chapters_${n}`, title: `${n} Capítulos`, description: `Leia ${n} capítulos no total`, icon: Layers, color: '#60a5fa', category: 'chapters' });
  });
  [7, 14, 30, 60].forEach((n) => {
    defs.push({ key: `streak_${n}`, title: `${n} Dias Seguidos`, description: `Mantenha uma sequência de ${n} dias`, icon: Flame, color: '#f97316', category: 'streak' });
  });
  defs.push({ key: 'quiz_first', title: 'Primeiro Quiz', description: 'Complete seu primeiro quiz de livro', icon: Trophy, color: '#a78bfa', category: 'special' });
  defs.push({ key: 'plan_complete', title: 'Plano Completo', description: 'Conclua um plano de leitura inteiro', icon: Crown, color: '#fbbf24', category: 'special' });
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
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'ontem';
  if (diffDays < 30) return `há ${diffDays} dias`;
  return date.toLocaleDateString('pt-BR');
}

function getLockedIcon(key: string): React.ElementType {
  if (key.startsWith("book_")) return BookOpen;
  if (key.startsWith("streak_")) return Flame;
  if (key.startsWith("chapters_")) return Trophy;
  if (key === "quiz_first") return Star;
  if (key === "plan_complete") return Medal;
  return Lock;
}

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  streak: number;
  longestStreak: number;
  unlockedMilestones: number[];
  onNavigate?: (section: SectionId) => void;
  celebrationBook?: { name: string; category: string; chapters: number } | null;
  onCelebrationDismiss?: () => void;
  completedDays?: Set<string>;
  allDays?: string[];
  months?: string[][];
  onBookClick?: (bookName: string) => void;
}

type InternalTab = "trophies" | "medals";
type TrophyFilter = "all" | "AT" | "NT" | "done";

const AchievementsTab = ({ streak, longestStreak, unlockedMilestones, onNavigate, celebrationBook, onCelebrationDismiss, completedDays, allDays: planDays, months: planMonths, onBookClick }: Props) => {
  const { user } = useAuth();
  const { T } = useThemeContext();

  const [activeTab, setActiveTab] = useState<InternalTab>("trophies");
  const [trophyFilter, setTrophyFilter] = useState<TrophyFilter>("all");
  const [readDates, setReadDates] = useState<Set<string>>(new Set());
  const [percentile, setPercentile] = useState<number | null>(null);
  const [loadingHeatmap, setLoadingHeatmap] = useState(true);
  const [unlockedKeys, setUnlockedKeys] = useState<Map<string, string>>(new Map());
  const [loadingAchievements, setLoadingAchievements] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showQuiz, setShowQuiz] = useState<string | null>(null);

  // Celebration card auto-dismiss
  useEffect(() => {
    if (celebrationBook) {
      setShowCelebration(true);
      const timer = setTimeout(() => { setShowCelebration(false); onCelebrationDismiss?.(); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [celebrationBook]);

  // Fetch data
  useEffect(() => {
    if (!user) { setLoadingHeatmap(false); setLoadingAchievements(false); return; }
    const fetchData = async () => {
      const { data: daysData } = await supabase.from("completed_days").select("read_date").eq("user_id", user.id);
      if (daysData) setReadDates(new Set(daysData.map((r) => (r as Record<string, unknown>).read_date as string).filter(Boolean)));
      const { data: rankingData } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => Promise<{ data: Array<{ user_id: string; weekly_points: number }> | null }> } })
        .from("weekly_ranking").select("user_id, weekly_points");
      if (rankingData && rankingData.length > 0) {
        const myEntry = rankingData.find((r) => r.user_id === user.id);
        const myPoints = myEntry?.weekly_points ?? 0;
        const below = rankingData.filter((r) => (r.weekly_points ?? 0) < myPoints).length;
        setPercentile(Math.round((below / rankingData.length) * 100));
      }
      setLoadingHeatmap(false);
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

  // Heatmap data
  const heatmapDays = getLast365Days();
  const weeks = getWeeks(heatmapDays);
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

  // Trophies data
  const readChapters = completedDays && planDays && planMonths
    ? getReadChaptersByBook(completedDays, planDays, planMonths)
    : new Map<string, Set<number>>();
  const getBookProgress = (bookName: string) => readChapters.get(bookName)?.size || 0;
  const completedBooks = bibleBooks.filter((b) => getBookProgress(b.name) >= b.chapters);

  const filteredBooks = bibleBooks.filter((b) => {
    if (trophyFilter === "AT") return b.testament === "AT";
    if (trophyFilter === "NT") return b.testament === "NT";
    if (trophyFilter === "done") return getBookProgress(b.name) >= b.chapters;
    return true;
  });

  const trophyFilters: { id: TrophyFilter; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "AT", label: "AT" },
    { id: "NT", label: "NT" },
    { id: "done", label: "Concluídos" },
  ];

  // Style constants
  const gridCard = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: "0.875rem",
  };

  // Heatmap color scale
  function getHeatColor(day: string): string {
    if (!readDates.has(day)) return T.card2;
    // Count reads in that week for intensity — simplified: just use accent
    return T.accent;
  }

  if (showQuiz) {
    return <QuizModal bookName={showQuiz} onClose={() => setShowQuiz(null)} />;
  }

  return (
    <div className="space-y-5">
      {/* Celebration card */}
      {showCelebration && celebrationBook && (
        <div
          className="p-5 relative animate-fade-in-down transition-all duration-300"
          style={{ background: T.accentDim, border: `2px solid ${T.borderAc}`, borderRadius: "1.25rem", clipPath: "polygon(0 0, calc(100% - 1rem) 0, 100% 1rem, 100% 100%, 0 100%)" }}
        >
          <button onClick={() => { setShowCelebration(false); onCelebrationDismiss?.(); }} className="absolute top-3 right-3 p-1 transition-all hover:opacity-70" style={{ color: T.textMuted }}>
            <X size={16} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 flex items-center justify-center" style={{ borderRadius: "9999px", background: `${T.accent}20` }}>
              <BookOpen className="w-8 h-8" style={{ color: T.accent }} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: T.accent }}>
                <BookOpen size={12} /> Livro Concluído!
              </p>
              <p className="text-lg font-black" style={{ color: T.textPrimary }}>{celebrationBook.name}</p>
              <p className="text-xs" style={{ color: T.textMuted }}>{celebrationBook.category} · {celebrationBook.chapters} capítulos</p>
            </div>
          </div>
          <button
            onClick={() => { setShowCelebration(false); setShowQuiz(celebrationBook.name); }}
            className="mt-3 w-full py-2.5 text-sm font-bold transition-all duration-300 hover:opacity-90"
            style={{ borderRadius: "9999px", background: T.accent, color: T.page }}
          >
            Fazer Quiz do Livro
          </button>
        </div>
      )}

      {/* ── Internal tab pills ───────────────────────────────── */}
      <div className="flex gap-2">
        {([
          { id: "trophies" as InternalTab, label: "Troféus", Icon: Trophy },
          { id: "medals" as InternalTab, label: "Medalhas", Icon: Award },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition-all duration-200"
            style={{
              borderRadius: "9999px",
              ...(activeTab === tab.id
                ? { background: T.accent, color: T.page }
                : { background: T.card2, color: T.textMuted, border: `1px solid ${T.border}` }
              ),
            }}
          >
            <tab.Icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── TAB: TROFÉUS (livros) ─────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "trophies" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black flex items-center gap-2" style={{ color: T.textPrimary, letterSpacing: "-0.03em" }}>
              <Trophy className="w-5 h-5" style={{ color: T.accent }} />
              Troféus
            </h3>
            <span className="font-black text-lg" style={{ color: T.accent }}>
              {completedBooks.length}
              <span className="font-normal text-sm" style={{ color: T.textMuted }}>/66</span>
            </span>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {trophyFilters.map((f) => (
              <button
                key={f.id}
                onClick={() => setTrophyFilter(f.id)}
                className="flex-shrink-0 px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-300"
                style={{
                  borderRadius: "9999px",
                  ...(trophyFilter === f.id
                    ? { background: T.accent, color: T.page }
                    : { background: T.card2, color: T.textMuted, border: `1px solid ${T.border}` }
                  ),
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Empty state */}
          {trophyFilter === "done" && completedBooks.length === 0 ? (
            <div className="p-8 text-center" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "1.25rem", clipPath: "polygon(0 0, calc(100% - 1rem) 0, 100% 1rem, 100% 100%, 0 100%)" }}>
              <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: T.textDim }} />
              <p className="text-sm mb-4" style={{ color: T.textMuted }}>Nenhum livro concluído ainda.</p>
              {onNavigate && (
                <button onClick={() => onNavigate("plans")} className="px-5 py-2.5 text-sm font-bold hover:opacity-90 transition-all duration-300" style={{ borderRadius: "9999px", background: T.accent, color: T.page }}>
                  Começar pelo Gênesis →
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
              {filteredBooks.map((book) => {
                const read = getBookProgress(book.name);
                const isDone = read >= book.chapters;
                const progress = Math.min(100, (read / book.chapters) * 100);
                return (
                  <button
                    key={book.name}
                    onClick={() => isDone && onBookClick?.(book.name)}
                    className="relative text-center transition-all duration-300"
                    style={{
                      borderRadius: "0.875rem",
                      overflow: "hidden",
                      background: isDone ? T.accentDim : T.card,
                      border: `1px solid ${isDone ? T.borderAc : T.border}`,
                      cursor: isDone ? "pointer" : "default",
                      display: "flex",
                      flexDirection: "column",
                      minHeight: "120px",
                    }}
                  >
                    {isDone && (
                      <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem", width: "1.25rem", height: "1.25rem", borderRadius: "9999px", background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={10} color={T.page} />
                      </div>
                    )}
                    <div style={{ padding: "1rem", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <BookOpen size={28} color={isDone ? T.accent : T.textDim} />
                      <p className="text-[10px] font-medium mt-1.5 truncate w-full" style={{ color: T.textPrimary }}>{book.name}</p>
                      <p className="text-[9px]" style={{ color: T.textMuted }}>{read}/{book.chapters}</p>
                      <span style={{ borderRadius: "9999px", padding: "2px 8px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: T.card2, color: T.textMuted, border: `1px solid ${T.border}`, marginTop: "0.375rem", display: "inline-block" }}>
                        {book.testament}
                      </span>
                    </div>
                    {!isDone && (
                      <div style={{ height: "3px", background: T.card2 }}>
                        <div style={{ height: "100%", width: `${progress}%`, background: T.accent, transition: "width 0.5s" }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── TAB: MEDALHAS (achievements, ranking, heatmap) ─────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "medals" && (
        <div className="space-y-6">
          {/* Ranking */}
          <div style={{ borderRadius: "0.875rem", padding: "1.25rem", background: T.card, border: `1px solid ${T.border}` }}>
            {/* Header do ranking */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Trophy size={16} color={T.accent} />
                <span style={{ fontWeight: 900, fontSize: "15px", color: T.textPrimary, letterSpacing: "-0.02em" }}>
                  Ranking da Semana
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <RefreshCw size={11} color={T.textMuted} />
                <span style={{ fontSize: "10px", color: T.textMuted }}>reseta segunda-feira</span>
              </div>
            </div>

            {/* Legenda de pontos */}
            <div style={{
              display: "flex", gap: "1rem", marginBottom: "1rem",
              padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
              background: T.card2,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <BookOpen size={11} color={T.textMuted} />
                <span style={{ fontSize: "10px", color: T.textMuted, fontWeight: 600 }}>capítulo = 10 pts</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Zap size={11} color={T.textMuted} />
                <span style={{ fontSize: "10px", color: T.textMuted, fontWeight: 600 }}>quiz certo = 25 pts</span>
              </div>
            </div>

            <WeeklyRanking />
          </div>

          {/* Percentil */}
          {percentile !== null && percentile > 0 && (
            <div className="p-4 text-center" style={{ ...gridCard, background: T.accentDim, border: `1px solid ${T.borderAc}` }}>
              <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>
                Você está melhor que <span style={{ color: T.accent }}>{percentile}%</span> dos leitores essa semana
              </p>
            </div>
          )}

          {/* Unified Streak/Record Card */}
          <div style={{
            borderRadius: "0.875rem",
            background: T.card, border: `1px solid ${T.border}`,
            display: "grid", gridTemplateColumns: "1fr auto 1fr",
            overflow: "hidden",
          }}>
            {/* Sequência atual */}
            <div style={{ padding: "1.25rem", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", marginBottom: "4px" }}>
                <Flame size={14} color={T.accent} />
                <span style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Sequência
                </span>
              </div>
              {loadingHeatmap ? <Skeleton className="skeleton-shimmer h-10 w-16 mx-auto mt-1" /> : (
                <>
                  <p style={{ fontSize: "2.5rem", fontWeight: 900, color: T.accent, letterSpacing: "-0.05em", lineHeight: 1 }}>
                    {streak}
                  </p>
                  <p style={{ fontSize: "11px", color: T.textMuted, marginTop: "2px" }}>dias seguidos</p>
                </>
              )}
            </div>

            {/* Divisor */}
            <div style={{ width: "1px", background: T.border, margin: "1rem 0" }} />

            {/* Recorde */}
            <div style={{ padding: "1.25rem", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", marginBottom: "4px" }}>
                <Trophy size={14} color={T.textMuted} />
                <span style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Recorde
                </span>
              </div>
              {loadingHeatmap ? <Skeleton className="skeleton-shimmer h-10 w-16 mx-auto mt-1" /> : (
                <>
                  <p style={{ fontSize: "2.5rem", fontWeight: 900, color: T.textPrimary, letterSpacing: "-0.05em", lineHeight: 1 }}>
                    {longestStreak}
                  </p>
                  <p style={{ fontSize: "11px", color: T.textMuted, marginTop: "2px" }}>dias seguidos</p>
                </>
              )}
            </div>
          </div>

          {/* Heatmap */}
          <div className="p-4" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "0.875rem" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: T.textMuted }}>Leituras no ano</p>
              <p className="text-xs" style={{ color: T.textMuted }}>
                {loadingHeatmap ? "..." : <><span className="font-semibold" style={{ color: T.textPrimary }}>{totalRead}</span> dias lidos</>}
              </p>
            </div>
            {loadingHeatmap ? (
              <div className="space-y-1.5 overflow-hidden">
                <div className="flex gap-0.5">{[...Array(12)].map((_, i) => <Skeleton key={i} className="skeleton-shimmer h-2.5 flex-1 rounded" />)}</div>
                <div className="flex gap-0.5">{[...Array(53)].map((_, wi) => <div key={wi} className="flex flex-col gap-0.5">{[...Array(7)].map((_, di) => <Skeleton key={di} className="skeleton-shimmer rounded-[2px]" style={{ width: 11, height: 11 }} />)}</div>)}</div>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-hide">
                <div style={{ minWidth: `${weeks.length * 13}px` }}>
                  <div className="flex mb-1" style={{ gap: "2px" }}>
                    {weeks.map((_, wi) => {
                      const mp = monthPositions.find((m) => m.weekIndex === wi);
                      return <div key={wi} style={{ width: "11px", flexShrink: 0 }}>{mp && <span className="text-[8px] whitespace-nowrap" style={{ color: T.textMuted, display: "block", transform: "translateX(-2px)" }}>{mp.label}</span>}</div>;
                    })}
                  </div>
                  <div className="flex" style={{ gap: "2px" }}>
                    {weeks.map((week, wi) => (
                      <div key={wi} className="flex flex-col" style={{ gap: "2px" }}>
                        {week.map((day, di) => {
                          if (!day) return <div key={di} style={{ width: 11, height: 11 }} />;
                          const isRead = readDates.has(day);
                          const isToday = day === heatmapDays[heatmapDays.length - 1];
                          return (
                            <div
                              key={di}
                              title={`${day}${isRead ? " ✓" : ""}`}
                              style={{
                                width: 11, height: 11, borderRadius: 2,
                                backgroundColor: isRead ? T.accent : T.card2,
                                opacity: isRead ? 1 : 0.5,
                                outline: isToday ? `1px solid ${T.accent}` : "none",
                                outlineOffset: "1px",
                                border: `1px solid ${T.border}`,
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  {/* Legend */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end", marginTop: "8px" }}>
                    <span style={{ fontSize: "10px", color: T.textMuted }}>Menos</span>
                    {[
                      T.card2,
                      T.accentDim,
                      `${T.accent}55`,
                      `${T.accent}99`,
                      T.accent,
                    ].map((bg, i) => (
                      <div key={i} style={{
                        width: "12px", height: "12px", borderRadius: "3px",
                        background: bg,
                        border: `1px solid ${T.border}`,
                      }} />
                    ))}
                    <span style={{ fontSize: "10px", color: T.textMuted }}>Mais</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Unlocked achievements */}
          {unlockedList.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: T.textMuted }}>Desbloqueadas ({unlockedList.length})</p>
              <div className="grid grid-cols-2 gap-3">
                {unlockedList.map((a) => {
                  const Icon = a.icon;
                  const achievedAt = unlockedKeys.get(a.key);
                  return (
                    <div key={a.key} className="p-4 transition-all duration-300" style={{ ...gridCard, background: T.accentDim, border: `1px solid ${T.borderAc}` }}>
                      <Icon className="w-7 h-7 mb-2" style={{ color: a.color === '__ACCENT__' ? T.accent : a.color }} />
                      <p className="text-sm font-bold" style={{ color: T.textPrimary }}>{a.title}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>{achievedAt ? timeAgo(achievedAt) : ''}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Locked achievements */}
          {lockedList.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
                <Lock size={13} color={T.textDim} />
                <span style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Bloqueadas
                </span>
                <span style={{
                  fontSize: "10px", fontWeight: 700, color: T.textMuted,
                  background: T.card2, borderRadius: "9999px",
                  padding: "1px 6px", marginLeft: "2px",
                }}>
                  {lockedList.length}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.625rem" }}>
                {lockedList.slice(0, 20).map((a) => {
                  const LockedIcon = getLockedIcon(a.key);
                  return (
                    <div key={a.key} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                      opacity: 0.35,
                      filter: "grayscale(1)",
                    }}>
                      <div style={{
                        width: "48px", height: "48px",
                        borderRadius: "14px",
                        background: T.card2, border: `1px solid ${T.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <LockedIcon size={20} color={T.textMuted} />
                      </div>
                      <span style={{
                        fontSize: "9px", fontWeight: 700, color: T.textMuted,
                        textAlign: "center", lineHeight: 1.2,
                        overflow: "hidden", textOverflow: "ellipsis",
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                        maxWidth: "56px",
                      }}>
                        {a.title}
                      </span>
                    </div>
                  );
                })}
              </div>
              {lockedList.length > 20 && <p className="text-xs text-center mt-2" style={{ color: T.textMuted }}>+{lockedList.length - 20} conquistas restantes</p>}
            </div>
          )}

          {/* Próximos marcos */}
          {streak > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: T.textMuted }}>Próximos marcos</p>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {milestones.filter((m) => !unlockedMilestones.includes(m.dias)).slice(0, 4).map((m) => {
                  const progress = Math.min(100, (streak / m.dias) * 100);
                  const Icon = iconMap[m.icon] || Star;
                  return (
                    <div key={m.dias} className="flex-shrink-0 w-24 p-3 text-center" style={gridCard}>
                      <Icon className="w-6 h-6 mx-auto mb-1" style={{ color: T.textDim }} />
                      <p className="text-xs font-bold" style={{ color: T.textPrimary }}>{m.dias} dias</p>
                      <div className="h-1.5 w-full overflow-hidden mt-2" style={{ borderRadius: "9999px", background: T.card2 }}>
                        <div className="h-full transition-all" style={{ borderRadius: "9999px", width: `${progress}%`, background: T.accent }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AchievementsTab;
