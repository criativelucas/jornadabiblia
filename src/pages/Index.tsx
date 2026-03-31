import { useState, useEffect, useMemo, startTransition } from "react";
import { Check, Award, ChevronDown, Calendar, LogIn, CheckCheck, Zap, BookOpen, Flame, Plus, X, ArrowRight, Trophy, Star, Medal, CheckCircle, TrendingUp } from "lucide-react";
import { playCheckSound } from "@/utils/sounds";
import { useSoundFeedback } from "@/hooks/useSoundFeedback";
import { PageTransition } from "@/components/PageTransition";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  planOptions,
  getMonths,
  generateCustomDays,
  CustomPlanConfig,
  BIBLE_BOOKS_DATA,
  getTotalChaptersForConfig } from
"@/data/planData";
import { milestones } from "@/data/streakMilestones";
import { bibleBooks, getReadChaptersByBook } from "@/data/bibleBooks";
import { MonthCardSkeleton } from "@/components/ui/skeleton";
import CommentSection from "@/components/CommentSection";
import BibleChat from "@/components/BibleChat";
import DailyCuriosity from "@/components/DailyCuriosity";
import AchievementsTab from "@/components/AchievementsTab";
import TrophiesTab from "@/components/TrophiesTab";
import PanoramaTab from "@/components/PanoramaTab";
import GalleryTab from "@/components/GalleryTab";
import RecoveryBanner from "@/components/RecoveryBanner";
import DailyVerseModal from "@/components/DailyVerseModal";
import MilestoneUnlockModal from "@/components/MilestoneUnlockModal";
import MindMapView from "@/components/MindMapView";
import ConfirmModal from "@/components/ConfirmModal";
import DynamicGreeting from "@/components/DynamicGreeting";
import StreakTree from "@/components/StreakTree";
import NextAchievement from "@/components/NextAchievement";
import BibleTab from "@/components/BibleTab";
import DiscoverTab from "@/components/DiscoverTab";

import AppSidebar, { type SectionId } from "@/components/AppSidebar";
import type { Milestone } from "@/data/streakMilestones";
import { toast } from "sonner";
import { useThemeContext, ThemeToggle } from "@/contexts/ThemeContext";

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const iconMap: Record<string, React.ElementType> = {
  Flame,
  Shield: Award,
  Layers: Award,
  Star: Award,
  Sword: Award,
  Anchor: Award,
  Music: Award,
  Crown: Award
};
const SCOPE_LABELS: Record<string, string> = {
  biblia: "Bíblia inteira",
  at: "Antigo Testamento",
  nt: "Novo Testamento",
  livros: "Livros específicos"
};

const Index = () => {
  const [selectedPlan, setSelectedPlan] = useState("6months");
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [activeSection, setActiveSection] = useState<SectionId>("home");
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [lastReadDate, setLastReadDate] = useState("");
  const [unlockedMilestones, setUnlockedMilestones] = useState<number[]>([]);
  const [planStartDate, setPlanStartDate] = useState("");
  const [showVerseModal, setShowVerseModal] = useState(false);
  const [pendingMilestone, setPendingMilestone] = useState<Milestone | null>(null);
  const [trophyQueue, setTrophyQueue] = useState<{name: string;category: string;chapters: number;}[]>([]);
  const [mindMapBook, setMindMapBook] = useState<string | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [showStreakRecoveryBanner, setShowStreakRecoveryBanner] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // ── Custom plan states ────────────────────────────────────────────
  const [customConfig, setCustomConfig] = useState<CustomPlanConfig | null>(null);
  const [customDays, setCustomDays] = useState<string[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [formScope, setFormScope] = useState<"biblia" | "at" | "nt" | "livros">("biblia");
  const [formBooks, setFormBooks] = useState<string[]>([]);
  const [formDuration, setFormDuration] = useState(365);
  const [formDurationUnit, setFormDurationUnit] = useState<"dias" | "semanas" | "meses">("dias");
  const [formStartDate, setFormStartDate] = useState(getTodayStr());

  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { T } = useThemeContext();
  const { playCheck, playStreak, playTrophy } = useSoundFeedback();

  // Handle PWA shortcuts
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shortcut = params.get('shortcut');
    if (shortcut === 'today') {
      setActiveSection('bible');
    }
    if (shortcut === 'achievements') {
      setActiveSection('achieve');
    }
    if (shortcut) {
      window.history.replaceState({}, '', '/');
    }
  }, []);
  // View Transitions API for smooth section switches
  const navigateTo = (section: SectionId) => {
    if (!(document as any).startViewTransition) {
      setActiveSection(section);
      return;
    }
    (document as any).startViewTransition(() => {
      setActiveSection(section);
    });
  };

  const currentPlan = planOptions.find((p) => p.id === selectedPlan) || planOptions[1];
  const activeDays = useMemo(
    () => selectedPlan === "custom" ? customDays : currentPlan.days,
    [selectedPlan, customDays, currentPlan]
  );
  const activeTargetMonths =
  selectedPlan === "custom" ? Math.max(1, Math.ceil(customDays.length / 30)) : currentPlan.targetMonths;

  const months = useMemo(() => getMonths(activeDays, activeTargetMonths), [activeDays, activeTargetMonths]);
  const totalDays = Math.max(activeDays.length, 1);
  const progressPercentage = Math.round(completedDays.size / totalDays * 100);
  const readChapters = useMemo(
    () => getReadChaptersByBook(completedDays, activeDays, months),
    [completedDays, activeDays, months]
  );
  const totalChaptersInPlan = useMemo(() => {
    if (selectedPlan === "custom" && customConfig) return getTotalChaptersForConfig(customConfig);
    return 1189;
  }, [selectedPlan, customConfig]);

  const planStatus = useMemo(() => {
    if (!planStartDate || activeDays.length === 0) return null;
    const start = new Date(planStartDate);
    const daysElapsed = Math.floor((new Date().getTime() - start.getTime()) / 86400000);
    const totalPlanDays = activeDays.length;
    const daysRemain = Math.max(1, totalPlanDays - daysElapsed);
    const chaptersRead = Math.round(completedDays.size / totalPlanDays * totalChaptersInPlan);
    const chaptersRemaining = Math.max(0, totalChaptersInPlan - chaptersRead);
    const expectedByNow = daysElapsed <= 0 ? 0 : Math.floor((daysElapsed / totalPlanDays) * totalChaptersInPlan);
    const chaptersLate = Math.max(0, expectedByNow - chaptersRead);
    const capsPerDay = Math.ceil(chaptersRemaining / daysRemain);
    const isFinished = daysElapsed >= totalPlanDays;
    const isComplete = chaptersRemaining <= 0;
    const isAhead = chaptersRead > expectedByNow;
    const isOnTrack = chaptersLate === 0;
    return { daysElapsed, totalPlanDays, daysRemain, chaptersRead, chaptersRemaining, expectedByNow, chaptersLate, capsPerDay, isFinished, isComplete, isAhead, isOnTrack };
  }, [completedDays, planStartDate, activeDays, totalChaptersInPlan]);

  // Keep recovery for backward compat (RecoveryBanner etc)
  const recovery = useMemo(() => {
    if (!planStatus || planStatus.chaptersLate < 15) return null;
    return { behind: planStatus.chaptersLate, newDaily: planStatus.capsPerDay, remaining: planStatus.daysRemain };
  }, [planStatus]);

  useEffect(() => {
    setSelectedMonth(0);
  }, [selectedPlan]);

  // Auto-navigate to achievements when a book trophy is earned
  useEffect(() => {
    if (trophyQueue.length > 0 && activeSection !== "achieve") {
      navigateTo("achieve");
    }
  }, [trophyQueue.length]);
  useEffect(() => {
    if (!user) {
      setCompletedDays(new Set());
      setStreak(0);
      setLongestStreak(0);
      setUnlockedMilestones([]);
      setDisplayName("");
      setLastReadDate("");
      setPlanStartDate("");
      setCustomConfig(null);
      setCustomDays([]);
      return;
    }
    const loadProfile = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (data) {
        const d = data as any;
        setDisplayName(d.display_name || "");
        setAvatarUrl(d.avatar_url || null);
        setStreak(d.streak || 0);
        setLongestStreak(d.longest_streak || 0);
        setLastReadDate(d.last_read_date || "");
        setUnlockedMilestones(d.unlocked_milestones || []);
        setPlanStartDate(d.plan_start_date || "");
        if (d.selected_plan) setSelectedPlan(d.selected_plan);
        if (d.selected_plan === "custom" && d.custom_plan_config) {
          const cfg = d.custom_plan_config as CustomPlanConfig;
          setCustomConfig(cfg);
          setCustomDays(generateCustomDays(cfg));
        }
        const today = getTodayStr();
        const yesterday = getYesterdayStr();
        // Check streak recovery eligibility
        if (d.last_read_date && d.last_read_date !== today && d.last_read_date !== yesterday && (d.streak || 0) > 0) {
          setShowStreakRecoveryBanner(true);
        }
        if (d.last_verse_shown_date !== today) {
          setShowVerseModal(true);
          await supabase.
          from("profiles").
          update({ last_verse_shown_date: today } as any).
          eq("user_id", user.id);
        }
      }
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadProgress = async () => {
      setProgressLoading(true);
      const { data } = await supabase.
      from("completed_days").
      select("month_index, day_index").
      eq("user_id", user.id).
      eq("plan_id", selectedPlan);
      if (data) setCompletedDays(new Set(data.map((d) => `${d.month_index}-${d.day_index}`)));
      setProgressLoading(false);
    };
    loadProgress();
  }, [user, selectedPlan]);

  const checkBookCompletion = (newCompleted: Set<string>) => {
    const newRead = getReadChaptersByBook(newCompleted, activeDays, months);
    const newTrophies: {name: string;category: string;chapters: number;}[] = [];
    for (const book of bibleBooks) {
      const prevRead = readChapters.get(book.name)?.size || 0;
      const newReadCount = newRead.get(book.name)?.size || 0;
      if (prevRead < book.chapters && newReadCount >= book.chapters)
      newTrophies.push({ name: book.name, category: book.category, chapters: book.chapters });
    }
    if (newTrophies.length > 0) setTrophyQueue((prev) => [...prev, ...newTrophies]);
  };

  const handlePlanChange = async (planId: string) => {
    if (planId === "custom") return;
    setSelectedPlan(planId);
    if (user) {
      const today = getTodayStr();
      await supabase.
      from("profiles").
      update({ selected_plan: planId, plan_start_date: planStartDate || today } as any).
      eq("user_id", user.id);
      if (!planStartDate) setPlanStartDate(today);
    }
  };

  const handleStartDateChange = async (val: string) => {
    setPlanStartDate(val);
    if (user)
    await supabase.
    from("profiles").
    update({ plan_start_date: val } as any).
    eq("user_id", user.id);
  };

  const handleActivateCustomPlan = async () => {
    if (formScope === "livros" && formBooks.length === 0) {
      toast.error("Selecione ao menos um livro.");
      return;
    }
    const durationInDays =
    formDurationUnit === "semanas" ?
    formDuration * 7 :
    formDurationUnit === "meses" ?
    formDuration * 30 :
    formDuration;
    const config: CustomPlanConfig = {
      scope: formScope,
      selectedBooks: formScope === "livros" ? formBooks : [],
      durationDays: durationInDays,
      startDate: formStartDate
    };
    const days = generateCustomDays(config);
    setCustomConfig(config);
    setCustomDays(days);
    setSelectedPlan("custom");
    setPlanStartDate(formStartDate);
    setShowCustomForm(false);
    setSelectedMonth(0);
    if (user) {
      await supabase.
      from("profiles").
      update({
        selected_plan: "custom",
        plan_start_date: formStartDate,
        custom_plan_config: config as any
      } as any).
      eq("user_id", user.id);
    }
    const totalCh = getTotalChaptersForConfig(config);
    toast.success(`Plano criado! Meta: ${Math.ceil(totalCh / Math.max(durationInDays, 1))} capítulos/dia`);
  };

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "danger" | "default";
    onConfirm: () => void;
  } | null>(null);

  const toggleDay = async (monthIndex: number, dayIndex: number) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const dayId = `${monthIndex}-${dayIndex}`;
    const prev = new Set(completedDays);
    const newCompleted = new Set(completedDays);
    const today = getTodayStr();
    const yesterday = getYesterdayStr();

    if (newCompleted.has(dayId)) {
      newCompleted.delete(dayId);
      setCompletedDays(newCompleted);
      try {
        await supabase.
        from("completed_days").
        delete().
        eq("user_id", user.id).
        eq("month_index", monthIndex).
        eq("day_index", dayIndex).
        eq("plan_id", selectedPlan);
      } catch {
        setCompletedDays(prev);
        toast.error("Erro ao salvar. Tente novamente.");
      }
    } else {
      newCompleted.add(dayId);
      setCompletedDays(newCompleted);
      playCheck();
      try {
        await supabase.from("completed_days").insert({
          user_id: user.id,
          month_index: monthIndex,
          day_index: dayIndex,
          plan_id: selectedPlan,
          read_date: getTodayStr()
        } as any);
        let newStreak = streak;
        let newLongest = longestStreak;
        let newUnlocked = [...unlockedMilestones];
        if (lastReadDate !== today) {
          newStreak = lastReadDate === yesterday ? streak + 1 : 1;
          if (newStreak > newLongest) newLongest = newStreak;
          let newMilestone: Milestone | null = null;
          for (const m of milestones) {
            if (newStreak >= m.dias && !newUnlocked.includes(m.dias)) {
              newUnlocked.push(m.dias);
              newMilestone = m;
            }
          }
          setStreak(newStreak);
          setLongestStreak(newLongest);
          setLastReadDate(today);
          setUnlockedMilestones(newUnlocked);
          await supabase.
          from("profiles").
          update({
            streak: newStreak,
            longest_streak: newLongest,
            last_read_date: today,
            unlocked_milestones: newUnlocked,
            plan_start_date: planStartDate || today
          } as any).
          eq("user_id", user.id);
          if (!planStartDate) setPlanStartDate(today);
          if (newMilestone) setPendingMilestone(newMilestone);
        }
        checkBookCompletion(newCompleted);
      } catch {
        setCompletedDays(prev);
        toast.error("Erro ao salvar. Tente novamente.");
      }
    }
  };

  const markMonthComplete = (monthIndex: number) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const month = months[monthIndex];
    if (!month) return;
    const unread = month.map((_, i) => i).filter((i) => !completedDays.has(`${monthIndex}-${i}`));
    if (unread.length === 0) return;
    setConfirmModal({
      title: "Concluir mês?",
      message: `Marcar todos os ${unread.length} dias restantes deste mês como lidos?`,
      confirmLabel: "Marcar todos",
      variant: "default",
      onConfirm: async () => {
        setConfirmModal(null);
        const newCompleted = new Set(completedDays);
        const inserts = unread.map((i) => ({
          user_id: user!.id,
          month_index: monthIndex,
          day_index: i,
          plan_id: selectedPlan,
          read_date: getTodayStr()
        }));
        await supabase.from("completed_days").insert(inserts as any);
        unread.forEach((i) => newCompleted.add(`${monthIndex}-${i}`));
        const today = getTodayStr();
        const yesterday = getYesterdayStr();
        if (lastReadDate !== today) {
          const newStreak = lastReadDate === yesterday ? streak + 1 : 1;
          const newLongest = Math.max(newStreak, longestStreak);
          setStreak(newStreak);
          setLongestStreak(newLongest);
          setLastReadDate(today);
          await supabase.
          from("profiles").
          update({
            streak: newStreak,
            longest_streak: newLongest,
            last_read_date: today,
            plan_start_date: planStartDate || today
          } as any).
          eq("user_id", user!.id);
        }
        checkBookCompletion(newCompleted);
        setCompletedDays(newCompleted);
        toast.success(`Mês ${monthIndex + 1} marcado como lido!`);
      }
    });
  };

  const toggleExpand = (dayId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDay(expandedDay === dayId ? null : dayId);
  };
  const isMonthCompleted = (mi: number) => months[mi]?.every((_, i) => completedDays.has(`${mi}-${i}`));
  const getMonthProgress = (mi: number) => {
    const total = months[mi]?.length || 1;
    const done = months[mi]?.filter((_, i) => completedDays.has(`${mi}-${i}`)).length || 0;
    return Math.round(done / total * 100);
  };

  const recentAchievements = useMemo(() => {
    const achievements: {type: "streak" | "book";label: string;key: string;}[] = [];
    [...milestones]
      .filter((m) => unlockedMilestones.includes(m.dias))
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 5)
      .forEach((m) => achievements.push({ type: "streak", label: m.titulo, key: `streak_${m.dias}` }));
    bibleBooks
      .filter((b) => (readChapters.get(b.name)?.size || 0) >= b.chapters)
      .slice(-5)
      .forEach((b) => {
        if (achievements.length < 5)
          achievements.push({ type: "book", label: b.name, key: `book_${b.id}` });
      });
    return achievements.slice(0, 5);
  }, [unlockedMilestones, readChapters]);

  const readToday = lastReadDate === getTodayStr();

  const nextTrophy = useMemo(() => {
    return bibleBooks
      .map(book => {
        const read = readChapters.get(book.name)?.size ?? 0;
        const percent = Math.round((read / book.chapters) * 100);
        return { ...book, read, percent, remaining: book.chapters - read };
      })
      .filter(b => b.percent > 0 && b.percent < 100)
      .sort((a, b) => b.percent - a.percent)[0] ?? null;
  }, [readChapters]);

  const heroState = useMemo(() => {
    if (readToday) return "done" as const;
    return "pending" as const;
  }, [readToday]);

  

  const dailyGoal = useMemo(() => {
    if (!planStartDate || activeDays.length === 0) return null;
    const elapsed = Math.floor((new Date().getTime() - new Date(planStartDate).getTime()) / 86400000);
    const remaining = activeDays.length - elapsed;
    if (remaining <= 0) return null;
    const chaptersRead = Math.round(completedDays.size / activeDays.length * totalChaptersInPlan);
    return Math.ceil((totalChaptersInPlan - chaptersRead) / remaining);
  }, [completedDays, planStartDate, activeDays, totalChaptersInPlan]);

  const daysRemaining = useMemo(() => {
    if (!planStartDate || activeDays.length === 0) return null;
    const elapsed = Math.floor((new Date().getTime() - new Date(planStartDate).getTime()) / 86400000);
    const rem = activeDays.length - elapsed;
    return rem < 0 ? 0 : rem;
  }, [planStartDate, activeDays]);

  const formPreview = useMemo(() => {
    const days =
    formDurationUnit === "semanas" ?
    formDuration * 7 :
    formDurationUnit === "meses" ?
    formDuration * 30 :
    formDuration;
    const total =
    formScope === "at" ?
    929 :
    formScope === "nt" ?
    260 :
    formScope === "livros" ?
    BIBLE_BOOKS_DATA.filter((b) => formBooks.includes(b.name)).reduce((s, b) => s + b.chapters, 0) :
    1189;
    return { days, total, perDay: Math.ceil(total / Math.max(days, 1)) };
  }, [formDuration, formDurationUnit, formScope, formBooks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>);

  }

  const sectionTitle: Record<SectionId, string> = {
    home: "Início",
    bible: "Bíblia",
    plans: "Planos",
    achieve: "Conquistas",
    discover: "Descobertas",
    profile: "Perfil",
  };
  const planLabel =
  selectedPlan === "custom" && customConfig ? `Meu Plano · ${SCOPE_LABELS[customConfig.scope]}` : currentPlan.label;

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: "var(--jb-page, hsl(var(--background)))", color: "hsl(var(--foreground))" }}>
      {confirmModal &&
      <ConfirmModal
        isOpen
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(null)} />

      }
      {showVerseModal && <DailyVerseModal onClose={() => setShowVerseModal(false)} />}
      {pendingMilestone && trophyQueue.length === 0 &&
      <MilestoneUnlockModal milestone={pendingMilestone} onClose={() => setPendingMilestone(null)} />
      }
      <AppSidebar
        activeSection={activeSection}
        onNavigate={(s) => {
          navigateTo(s);
          setMindMapBook(null);
        }}
        streak={streak}
        displayName={displayName}
        avatarUrl={avatarUrl} />
      

      <main className="lg:ml-16 pb-20 lg:pb-0 min-h-screen">
        {/* Mobile header */}
        <header
          className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4"
          style={{ height: "3rem", background: T.page, borderBottom: `1px solid ${T.border}` }}
        >
          <span className="font-black text-base" style={{ color: T.textPrimary, letterSpacing: "-0.03em" }}>
            Jornada Bíblica
          </span>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1" style={{ padding: "4px 10px", borderRadius: "9999px", background: T.accentDim, border: `1px solid ${T.borderAc}` }}>
                <Flame size={12} style={{ color: T.accent }} />
                <span style={{ fontSize: "11px", fontWeight: 700, color: T.accent }}>{streak}</span>
              </div>
            )}
            {avatarUrl ? (
              <div style={{ width: "28px", height: "28px", borderRadius: "9999px", overflow: "hidden", border: `1.5px solid ${T.accent}` }} onClick={() => navigate("/profile")}>
                <img src={avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
              </div>
            ) : user ? (
              <div
                style={{ width: "28px", height: "28px", borderRadius: "9999px", overflow: "hidden", background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, fontWeight: 700, fontSize: "11px", border: `1.5px solid ${T.accent}`, cursor: "pointer" }}
                onClick={() => navigate("/profile")}
              >
                {displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
            ) : (
              <button onClick={() => navigate("/auth")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold" style={{ borderRadius: "9999px", background: T.accent, color: T.page }}>
                <LogIn size={12} /> Entrar
              </button>
            )}
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">

          {mindMapBook && user &&
          <div className="mb-6">
              <button onClick={() => setMindMapBook(null)} className="text-xs text-primary mb-3 hover:underline">
                ← Voltar
              </button>
              <MindMapView bookName={mindMapBook} userId={user.id} />
            </div>
          }

          {!mindMapBook &&
          <PageTransition transitionKey={activeSection}>
              {activeSection === "bible" && <BibleTab />}
              {activeSection === "discover" && <DiscoverTab />}
              {activeSection === "achieve" &&
            <AchievementsTab
              streak={streak}
              longestStreak={longestStreak}
              unlockedMilestones={unlockedMilestones}
              onNavigate={setActiveSection}
              celebrationBook={trophyQueue.length > 0 ? trophyQueue[0] : null}
              onCelebrationDismiss={() => setTrophyQueue((prev) => prev.slice(1))}
              completedDays={completedDays}
              allDays={activeDays}
              months={months}
              onBookClick={(name) => user && setMindMapBook(name)} />
            }

              {/* ── HOME ─────────────────────────────────────────── */}
              {activeSection === "home" &&
            <>
                  {/* Onboarding CTA for new users */}
                  {completedDays.size === 0 && streak === 0 ?
              <div className="mb-6">
                      <div
                  className="p-8 text-center transition-all duration-300"
                  style={{
                    background: T.accent,
                    color: T.page,
                    clipPath: 'polygon(0 0, 100% 0, 100% 92%, 96% 100%, 0 100%)'
                  }}>
                        <h2 className="text-impact text-3xl sm:text-4xl mb-2 font-sans">
                          Bem-vindo à sua nova{' '}
                          <span className="italic font-serif">jornada</span>
                        </h2>
                        <p className="text-sm opacity-70 mb-6">
                          Comece hoje e acompanhe seu progresso dia a dia
                        </p>
                        <button
                    onClick={() => navigateTo("plans")}
                    className="inline-flex items-center gap-2 px-6 py-3 font-black uppercase tracking-tight text-sm transition-all duration-300 hover:opacity-90"
                    style={{
                      background: T.page,
                      color: T.accent,
                      clipPath: 'polygon(0 0, 100% 0, 100% 80%, 93% 100%, 0 100%)'
                    }}>
                          Começar Leitura de Hoje
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div> :

              <>
                      {showStreakRecoveryBanner &&
                <div
                  className="mb-4 p-4 flex items-start gap-3 animate-fade-in-down transition-all duration-300"
                  style={{
                    background: T.accentDim,
                    border: `1px solid ${T.borderAc}`,
                    clipPath: 'polygon(0 0, 100% 0, 100% 90%, 97% 100%, 0 100%)'
                  }}>
                          <Flame size={24} style={{ color: T.accent, flexShrink: 0 }} />
                          <div className="flex-1">
                            <p className="text-sm font-black tracking-tight" style={{ color: T.textPrimary }}>Recupere sua sequência</p>
                            <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>Leia hoje e mantenha sua jornada viva</p>
                          </div>
                          <button
                    onClick={() => setShowStreakRecoveryBanner(false)}
                    style={{ color: T.textMuted }}
                    className="hover:opacity-70 transition-all duration-300">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                }

                      {/* ── BLOCO 1 — Hero Card ── */}
                      <div
                        style={{
                          borderRadius: "1.25rem",
                          clipPath: "polygon(0 0, calc(100% - 1.5rem) 0, 100% 1.5rem, 100% 100%, 0 100%)",
                          padding: "1.5rem",
                          background: heroState === "pending" ? T.accent : T.card,
                          border: heroState === "done" ? `1px solid ${T.borderAc}` : "none",
                          minHeight: "140px",
                          position: "relative",
                          overflow: "hidden",
                          marginBottom: "0.875rem",
                        }}
                      >
                        {heroState === "done" && (
                          <div style={{
                            position: "absolute", top: 0, right: 0,
                            width: "120px", height: "120px",
                            background: `radial-gradient(circle, ${T.accentGlow} 0%, transparent 70%)`,
                            transform: "translate(20%, -20%)",
                            pointerEvents: "none",
                          }} />
                        )}

                        {heroState === "pending" && (
                          <div style={{ position: "relative" }}>
                            <p style={{ fontSize: "10px", fontWeight: 700, color: T.page, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>
                              {new Date().getHours() < 12 ? `Bom dia${displayName ? `, ${displayName.split(" ")[0]}` : ""}` : new Date().getHours() < 18 ? `Boa tarde${displayName ? `, ${displayName.split(" ")[0]}` : ""}` : `Boa noite${displayName ? `, ${displayName.split(" ")[0]}` : ""}`}
                            </p>
                            <h2 style={{ fontSize: "2rem", fontWeight: 900, color: T.page, letterSpacing: "-0.04em", marginTop: "4px" }}>
                              Hora de ler
                            </h2>
                            <p style={{ color: T.page, opacity: 0.7, fontSize: "13px", marginTop: "2px" }}>
                              {streak > 0 ? `${streak} dias seguidos — não quebre agora` : "Comece sua sequência hoje"}
                            </p>
                            <button
                              onClick={() => navigateTo("bible")}
                              style={{
                                marginTop: "1.25rem",
                                padding: "0.75rem 1.5rem",
                                borderRadius: "9999px",
                                background: T.page,
                                color: T.accent,
                                fontWeight: 900, fontSize: "14px",
                                border: "none", cursor: "pointer",
                                transition: "opacity 0.2s",
                              }}
                            >
                              Abrir Bíblia →
                            </button>
                          </div>
                        )}

                        {heroState === "done" && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", position: "relative" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                              <div style={{
                                width: "52px", height: "52px", borderRadius: "9999px",
                                background: T.accentDim, border: `2px solid ${T.accent}`,
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                              }}>
                                <Check size={24} color={T.accent} />
                              </div>
                              <div>
                                <p style={{ fontWeight: 900, fontSize: "18px", color: T.textPrimary }}>
                                  Leitura de hoje feita!
                                </p>
                                <p style={{ color: T.textMuted, fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}>
                                  {streak} dias seguidos <Flame size={12} style={{ color: T.accent }} />
                                </p>
                              </div>
                            </div>
                            <div style={{ flexShrink: 0, width: "80px", height: "80px" }}>
                              <StreakTree streak={streak} compact />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── BLOCO 2 — Stats em linha (3 números) ── */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.875rem" }}>
                        <div style={{
                          borderRadius: "0.875rem", padding: "1rem",
                          background: T.card, border: `1px solid ${T.border}`,
                          textAlign: "center",
                        }}>
                          <p style={{ fontSize: "1.75rem", fontWeight: 900, color: T.accent, letterSpacing: "-0.05em", lineHeight: 1 }}>
                            {progressPercentage}%
                          </p>
                          <p style={{ fontSize: "9px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "4px" }}>
                            da Bíblia
                          </p>
                        </div>
                        <div style={{
                          borderRadius: "0.875rem", padding: "1rem",
                          background: T.card, border: `1px solid ${T.border}`,
                          textAlign: "center",
                        }}>
                          <p style={{ fontSize: "1.75rem", fontWeight: 900, color: T.textPrimary, letterSpacing: "-0.05em", lineHeight: 1 }}>
                            {completedDays.size}
                          </p>
                          <p style={{ fontSize: "9px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "4px" }}>
                            de {totalDays} dias
                          </p>
                        </div>
                        <div style={{
                          borderRadius: "0.875rem", padding: "1rem",
                          background: T.card, border: `1px solid ${T.border}`,
                          textAlign: "center",
                        }}>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "2px" }}>
                            <p style={{ fontSize: "1.75rem", fontWeight: 900, color: T.accent, letterSpacing: "-0.05em", lineHeight: 1 }}>
                              {streak}
                            </p>
                            <Flame size={14} color={T.accent} />
                          </div>
                          <p style={{ fontSize: "9px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "4px" }}>
                            sequência
                          </p>
                        </div>
                      </div>

                      {/* ── BLOCO 3 — Próxima Conquista ── */}
                      {nextTrophy && (
                        <div style={{
                          borderRadius: "0.875rem", padding: "1.25rem",
                          background: T.card, border: `1px solid ${T.border}`,
                          marginBottom: "0.875rem",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <Trophy size={14} color={T.accent} />
                              <span style={{ fontSize: "10px", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                Próxima conquista
                              </span>
                            </div>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: T.textMuted }}>
                              {nextTrophy.remaining} caps restantes
                            </span>
                          </div>
                          <p style={{ fontWeight: 900, fontSize: "18px", color: T.textPrimary, letterSpacing: "-0.03em" }}>
                            {nextTrophy.name}
                          </p>
                          <div style={{
                            marginTop: "0.75rem", height: "6px",
                            borderRadius: "9999px", background: T.card2, overflow: "hidden",
                          }}>
                            <div style={{
                              height: "100%", borderRadius: "9999px",
                              width: `${nextTrophy.percent}%`,
                              background: T.accent,
                              transition: "width 1s cubic-bezier(0.65,0.05,0,1)",
                            }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                            <span style={{ fontSize: "11px", color: T.textMuted }}>{nextTrophy.percent}% concluído</span>
                            <button
                              onClick={() => navigateTo("bible")}
                              style={{
                                fontSize: "11px", fontWeight: 700, color: T.accent,
                                background: "transparent", border: "none", cursor: "pointer",
                                textDecoration: "underline",
                              }}
                            >
                              Continuar lendo →
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── BLOCO 4 — Status do Plano (3-section card) ── */}
                      {planStartDate && planStatus && (
                        planStatus.isComplete ? (
                          <div style={{
                            borderRadius: "0.875rem", padding: "1.25rem", textAlign: "center",
                            background: T.card, border: `1px solid ${T.borderAc}`,
                            marginBottom: "0.875rem",
                          }}>
                            <Trophy size={32} color={T.accent} style={{ margin: "0 auto 0.5rem" }} />
                            <p style={{ fontWeight: 900, fontSize: "18px", color: T.textPrimary }}>Parabéns!</p>
                            <p style={{ fontSize: "13px", color: T.textMuted, marginTop: "4px" }}>
                              Você leu {planStatus.chaptersRead} capítulos e completou o plano!
                            </p>
                          </div>
                        ) : planStatus.isFinished ? (
                          <div style={{
                            borderRadius: "0.875rem", padding: "1.25rem", textAlign: "center",
                            background: T.card, border: `1px solid ${T.border}`,
                            borderLeft: "3px solid #f59e0b",
                            marginBottom: "0.875rem",
                          }}>
                            <p style={{ fontWeight: 900, fontSize: "14px", color: T.textPrimary }}>Prazo encerrado</p>
                            <p style={{ fontSize: "13px", color: T.textMuted, marginTop: "4px" }}>
                              Você leu {Math.round((planStatus.chaptersRead / totalChaptersInPlan) * 100)}% da Bíblia — continue no seu ritmo!
                            </p>
                          </div>
                        ) : (
                          <div style={{
                            borderRadius: "0.875rem",
                            background: T.card,
                            border: `1px solid ${T.border}`,
                            borderLeft: `3px solid ${planStatus.isOnTrack || planStatus.isAhead ? T.accent : "#f59e0b"}`,
                            overflow: "hidden",
                            marginBottom: "0.875rem",
                          }}>
                            {/* Linha 1: status geral */}
                            <div style={{
                              padding: "0.875rem 1.25rem",
                              display: "flex", alignItems: "center", gap: "0.75rem",
                              borderBottom: `1px solid ${T.border}`,
                            }}>
                              <div style={{
                                width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
                                background: planStatus.isOnTrack || planStatus.isAhead ? T.accentDim : "rgba(245,158,11,0.12)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                {planStatus.isAhead
                                  ? <TrendingUp size={16} color={T.accent} />
                                  : planStatus.isOnTrack
                                  ? <CheckCircle size={16} color={T.accent} />
                                  : <Zap size={16} color="#f59e0b" />}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontWeight: 900, fontSize: "14px", color: T.textPrimary, letterSpacing: "-0.02em" }}>
                                  {planStatus.isAhead
                                    ? "Você está adiantado!"
                                    : planStatus.isOnTrack
                                    ? "Em dia com o plano"
                                    : "Plano recalibrado"}
                                </p>
                                <p style={{ fontSize: "11px", color: T.textMuted, marginTop: "1px" }}>
                                  {planStatus.isAhead
                                    ? `${planStatus.chaptersRead - planStatus.expectedByNow} capítulos à frente do esperado`
                                    : planStatus.isOnTrack
                                    ? `No ritmo certo para terminar em ${planStatus.daysRemain} dias`
                                    : `${planStatus.chaptersLate} capítulos abaixo do esperado para hoje`}
                                </p>
                              </div>
                            </div>

                            {/* Linha 2: progresso do tempo */}
                            <div style={{ padding: "0.75rem 1.25rem", borderBottom: `1px solid ${T.border}` }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "10px", color: T.textMuted, fontWeight: 600 }}>
                                  Dia {planStatus.daysElapsed} de {planStatus.totalPlanDays}
                                </span>
                                <span style={{ fontSize: "10px", color: T.textMuted, fontWeight: 600 }}>
                                  {planStatus.daysRemain} dias restantes
                                </span>
                              </div>
                              <div style={{ height: "4px", borderRadius: "9999px", background: T.card2, overflow: "hidden" }}>
                                <div style={{
                                  height: "100%", borderRadius: "9999px",
                                  width: `${Math.min(100, (planStatus.daysElapsed / planStatus.totalPlanDays) * 100)}%`,
                                  background: T.accent,
                                  transition: "width 0.8s ease",
                                }} />
                              </div>
                            </div>

                            {/* Linha 3: ritmo necessário */}
                            <div style={{
                              padding: "0.75rem 1.25rem",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                            }}>
                              <div>
                                <p style={{ fontSize: "10px", color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                  Ritmo necessário
                                </p>
                                <div style={{ display: "flex", alignItems: "baseline", gap: "3px", marginTop: "2px" }}>
                                  <span style={{
                                    fontSize: "1.75rem", fontWeight: 900,
                                    color: planStatus.isOnTrack || planStatus.isAhead ? T.accent : "#f59e0b",
                                    letterSpacing: "-0.05em", lineHeight: 1,
                                  }}>
                                    {planStatus.capsPerDay}
                                  </span>
                                  <span style={{ fontSize: "12px", color: T.textMuted, fontWeight: 600 }}>
                                    caps/dia
                                  </span>
                                </div>
                              </div>

                              <div style={{ width: "1px", height: "36px", background: T.border }} />

                              <div style={{ textAlign: "right" }}>
                                <p style={{ fontSize: "10px", color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                  Restam ler
                                </p>
                                <div style={{ display: "flex", alignItems: "baseline", gap: "3px", marginTop: "2px", justifyContent: "flex-end" }}>
                                  <span style={{
                                    fontSize: "1.75rem", fontWeight: 900,
                                    color: T.textPrimary,
                                    letterSpacing: "-0.05em", lineHeight: 1,
                                  }}>
                                    {planStatus.chaptersRemaining}
                                  </span>
                                  <span style={{ fontSize: "12px", color: T.textMuted, fontWeight: 600 }}>
                                    capítulos
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}

                      {/* ── BLOCO 5 — Ação rápida ── */}
                      {!readToday && completedDays.size > 0 && (
                        <button
                          onClick={() => navigateTo("bible")}
                          style={{
                            width: "100%", padding: "1.125rem",
                            borderRadius: "0.875rem",
                            background: T.accent, color: T.page,
                            fontWeight: 900, fontSize: "16px",
                            border: "none", cursor: "pointer",
                            letterSpacing: "-0.02em",
                            clipPath: "polygon(0 0, calc(100% - 1rem) 0, 100% 1rem, 100% 100%, 0 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                            transition: "opacity 0.2s",
                            marginBottom: "0.875rem",
                          }}
                        >
                          <BookOpen size={18} />
                          Ler agora
                        </button>
                      )}

                      {/* ── Conquistas recentes ── */}
                      <div style={{ marginBottom: "0.875rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            Conquistas recentes
                          </span>
                          {recentAchievements.length > 0 && (
                            <button
                              onClick={() => navigateTo("achieve")}
                              style={{ fontSize: "11px", fontWeight: 700, color: T.accent, background: "transparent", border: "none", cursor: "pointer" }}
                            >
                              Ver todas →
                            </button>
                          )}
                        </div>
                        {recentAchievements.length === 0 ? (
                          <div style={{
                            width: "100%", padding: "1.25rem",
                            borderRadius: "0.875rem",
                            background: T.card, border: `1px solid ${T.border}`,
                            textAlign: "center",
                          }}>
                            <Trophy size={24} color={T.textDim} style={{ margin: "0 auto 6px" }} />
                            <p style={{ fontSize: "12px", color: T.textMuted }}>
                              Complete sua primeira leitura para ganhar conquistas
                            </p>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "4px" }}>
                            {recentAchievements.map((a) => (
                              <div key={a.key} style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                                <div style={{
                                  width: "52px", height: "52px",
                                  borderRadius: "14px",
                                  background: T.accentDim,
                                  border: `1.5px solid ${T.borderAc}`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                  {a.type === "book" ? <BookOpen size={22} color={T.accent} /> : <Flame size={22} color={T.accent} />}
                                </div>
                                <span style={{
                                  fontSize: "10px", fontWeight: 700,
                                  color: T.textMuted, textAlign: "center",
                                  maxWidth: "56px", lineHeight: 1.2,
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                  {a.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
              }
                </>
            }

              {/* ── PLANS ────────────────────────────────────────── */}
              {activeSection === "plans" &&
            <>
                  {recovery &&
              <RecoveryBanner
                behindChapters={recovery.behind}
                newDailyGoal={recovery.newDaily}
                daysRemaining={recovery.remaining} />

              }

                  <div className="mb-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Escolha seu plano
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {planOptions.
                  filter((p) => p.id !== "custom").
                  map((plan) =>
                  <button
                    key={plan.id}
                    onClick={() => handlePlanChange(plan.id)}
                    className={`p-3 border text-left transition-all ${selectedPlan === plan.id ? "bg-primary/10 border-primary/30 shadow-sm" : "bg-card border-border hover:bg-muted"}`}
                    style={{ borderRadius: "0.875rem" }}>
                    
                            <div
                      className={`text-base font-bold ${selectedPlan === plan.id ? "text-primary" : "text-foreground"}`}>
                      
                              {plan.label}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                              {plan.description}
                            </div>
                          </button>
                  )}
                    </div>

                    {!showCustomForm && selectedPlan !== "custom" &&
                <button
                  onClick={() => {
                    setFormStartDate(planStartDate || getTodayStr());
                    setShowCustomForm(true);
                  }}
                  className="w-full p-3 border border-dashed border-border bg-card text-muted-foreground text-sm hover:bg-muted transition-all flex items-center justify-center gap-2"
                  style={{ borderRadius: "0.875rem" }}>
                  
                        <Plus className="w-4 h-4" /> Criar plano personalizado
                      </button>
                }

                    {selectedPlan === "custom" && customConfig && !showCustomForm &&
                <div className="p-4 border border-primary/30 bg-primary/5" style={{ borderRadius: "0.875rem" }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-primary">Meu Plano Personalizado</span>
                          <button
                      onClick={() => {
                        setFormScope(customConfig.scope);
                        setFormBooks(customConfig.selectedBooks);
                        setFormDuration(customConfig.durationDays);
                        setFormDurationUnit("dias");
                        setFormStartDate(planStartDate || getTodayStr());
                        setShowCustomForm(true);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground">
                      
                            Editar
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {SCOPE_LABELS[customConfig.scope]} · {customConfig.durationDays} dias
                        </p>
                      </div>
                }

                    {showCustomForm &&
                <div className="p-4 border border-border bg-card space-y-4 mt-3" style={{ borderRadius: "0.875rem" }}>
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-sm text-foreground">Plano personalizado</h3>
                          <button onClick={() => setShowCustomForm(false)} className="text-muted-foreground">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-2">O que você quer ler?</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                      { id: "biblia", label: "Bíblia inteira" },
                      { id: "at", label: "Antigo Testamento" },
                      { id: "nt", label: "Novo Testamento" },
                      { id: "livros", label: "Livros específicos" }].
                      map((s) =>
                      <button
                        key={s.id}
                        onClick={() => setFormScope(s.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${formScope === s.id ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground hover:bg-card"}`}>
                        
                                {s.label}
                              </button>
                      )}
                          </div>
                        </div>
                        {formScope === "livros" &&
                  <div>
                            <label className="text-xs text-muted-foreground block mb-2">
                              {formBooks.length} livro{formBooks.length !== 1 ? "s" : ""} ·{" "}
                              {BIBLE_BOOKS_DATA.filter((b) => formBooks.includes(b.name)).reduce(
                        (s, b) => s + b.chapters,
                        0
                      )}{" "}
                              capítulos
                            </label>
                            <div className="max-h-52 overflow-y-auto border border-border rounded-xl p-3 space-y-2 bg-muted/30">
                              {(["AT", "NT"] as const).map((testament) =>
                      <div key={testament}>
                                  <button
                          onClick={() => {
                            const bks = BIBLE_BOOKS_DATA.filter((b) => b.testament === testament).map(
                              (b) => b.name
                            );
                            const allSel = bks.every((b) => formBooks.includes(b));
                            setFormBooks((prev) =>
                            allSel ? prev.filter((b) => !bks.includes(b)) : [...new Set([...prev, ...bks])]
                            );
                          }}
                          className="text-xs font-bold text-muted-foreground py-1 w-full text-left hover:text-foreground">
                          
                                    {testament === "AT" ? "— Antigo Testamento" : "— Novo Testamento"}
                                  </button>
                                  {BIBLE_BOOKS_DATA.filter((b) => b.testament === testament).map((b) =>
                        <label
                          key={b.name}
                          className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-muted rounded px-1">
                          
                                      <input
                            type="checkbox"
                            checked={formBooks.includes(b.name)}
                            onChange={(e) => {
                              if (e.target.checked) setFormBooks((p) => [...p, b.name]);else
                              setFormBooks((p) => p.filter((n) => n !== b.name));
                            }}
                            className="accent-primary w-3 h-3" />
                          
                                      <span className="text-xs text-foreground flex-grow">{b.name}</span>
                                      <span className="text-[10px] text-muted-foreground">{b.chapters}</span>
                                    </label>
                        )}
                                </div>
                      )}
                            </div>
                          </div>
                  }
                        <div>
                          <label className="text-xs text-muted-foreground block mb-2">Em quanto tempo?</label>
                          <div className="flex gap-2">
                            <input
                        type="number"
                        min={7}
                        max={1825}
                        value={formDuration}
                        onChange={(e) => setFormDuration(Math.max(1, Number(e.target.value)))}
                        className="flex-1 px-3 py-2 rounded-xl border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-primary/50" />
                      
                            <select
                        value={formDurationUnit}
                        onChange={(e) => setFormDurationUnit(e.target.value as any)}
                        className="px-3 py-2 rounded-xl border border-border bg-muted text-foreground text-sm focus:outline-none">
                        
                              <option value="dias">dias</option>
                              <option value="semanas">semanas</option>
                              <option value="meses">meses</option>
                            </select>
                          </div>
                          <p
                      className={`text-xs mt-2 font-medium ${formPreview.perDay > 20 ? "text-amber-500" : "text-primary"}`}>
                      
                            Meta: {formPreview.perDay} capítulo{formPreview.perDay !== 1 ? "s" : ""}/dia ·{" "}
                            {formPreview.total} capítulos no total
                            {formPreview.perDay > 20 ? " — ritmo bastante intenso" : ""}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-2">Quando começa?</label>
                          <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-primary/50" />
                    
                        </div>
                        <button
                    onClick={handleActivateCustomPlan}
                    disabled={formScope === "livros" && formBooks.length === 0}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-all">
                    
                          Criar plano
                        </button>
                      </div>
                }
                  </div>

                  {selectedPlan !== "custom" &&
              <div className="mb-5 p-4 bg-card border border-border flex items-center gap-3" style={{ borderRadius: "0.875rem" }}>
                      <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-grow min-w-0">
                        <label className="text-xs text-muted-foreground block mb-1">Data de início do plano</label>
                        <input
                    type="date"
                    value={planStartDate || getTodayStr()}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-muted text-foreground text-sm focus:outline-none focus:border-primary/50" />
                  
                      </div>
                      {daysRemaining !== null &&
                <div className="text-right flex-shrink-0">
                          <p className="text-xs font-medium text-foreground">
                            {daysRemaining > 0 ? daysRemaining : "0"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {daysRemaining > 0 ? "dias restantes" : "encerrado"}
                          </p>
                        </div>
                }
                    </div>
              }

                  <div className="mb-6 p-5 bg-card border border-border" style={{ borderRadius: "0.875rem" }}>
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          Progresso Global
                        </p>
                        <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
                          {progressPercentage}%{progressPercentage === 100 && <Award className="w-8 h-8 text-lime" />}
                        </h2>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="text-foreground font-semibold">{completedDays.size}</span> / {totalDays} dias
                      </p>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out progress-shimmer"
                    style={{ width: `${progressPercentage}%` }} />
                  
                    </div>
                  </div>

                  {/* Month Tabs */}
                  {months.length > 0 && (
              activeTargetMonths === 12 ?
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-5">
                        {months.map((_, index) => {
                  const completed = isMonthCompleted(index);
                  const selected = selectedMonth === index;
                  const mp = getMonthProgress(index);
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedMonth(index)}
                      className={`p-3 rounded-xl border transition-all text-center ${selected ? "bg-primary/10 border-primary/30 text-primary" : completed ? "bg-card border-lime/30" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}>
                      
                              <div className="font-semibold text-xs">Mês {index + 1}</div>
                              <div className="text-[10px] opacity-70 mt-0.5">{mp}%</div>
                              {completed && <Check className="w-3 h-3 text-lime mx-auto mt-1" />}
                            </button>);

                })}
                      </div> :

              <div
                className="flex overflow-x-auto gap-2 pb-3 mb-5 scrollbar-hide snap-x"
                style={{ WebkitOverflowScrolling: "touch" }}>
                
                        {months.map((_, index) => {
                  const completed = isMonthCompleted(index);
                  const selected = selectedMonth === index;
                  const mp = getMonthProgress(index);
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedMonth(index)}
                      className={`snap-start flex-shrink-0 min-w-[120px] px-4 py-2.5 rounded-xl border transition-all flex items-center gap-2 ${selected ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}>
                      
                              <Calendar className="w-3.5 h-3.5" />
                              <div className="text-left">
                                <div className="font-semibold text-xs">Mês {index + 1}</div>
                                <div className="text-[10px] opacity-70">{mp}%</div>
                              </div>
                              {completed && <Check className="w-3.5 h-3.5 text-lime" />}
                            </button>);

                })}
                      </div>)
              }

                  {/* Reading List */}
                  {progressLoading ?
              <div className="space-y-3">
                      {[...Array(3)].map((_, i) =>
                <MonthCardSkeleton key={i} />
                )}
                    </div> :

              months[selectedMonth] &&
              <div className="bg-card border border-border overflow-hidden" style={{ borderRadius: "0.875rem" }}>
                        <div className="p-4 border-b border-border flex items-center justify-between">
                          <h3 className="text-base font-bold text-foreground">Mês {selectedMonth + 1}</h3>
                          {!isMonthCompleted(selectedMonth) &&
                  <button
                    onClick={() => markMonthComplete(selectedMonth)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all">
                    
                              <CheckCheck className="w-3.5 h-3.5" /> Concluir mês
                            </button>
                  }
                        </div>
                        <div className="divide-y divide-border">
                          {months[selectedMonth]?.map((reading, index) => {
                    const dayId = `${selectedMonth}-${index}`;
                    const isDone = completedDays.has(dayId);
                    let globalDayNumber = index + 1;
                    for (let i = 0; i < selectedMonth; i++) globalDayNumber += months[i].length;
                    const isExpanded = expandedDay === dayId;
                    return (
                      <div key={index} className={`transition-all duration-300 ${isDone ? "opacity-60" : ""}`}>
                                <div
                          onClick={() => toggleDay(selectedMonth, index)}
                          className="group p-3.5 sm:p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/50">
                          
                                  <div
                            className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isDone ? "bg-lime/20 border-lime/50 text-lime" : "border-border text-transparent group-hover:border-primary/50"}`}>
                            
                                    <Check
                              className={`w-3.5 h-3.5 transition-transform duration-300 ${isDone ? "scale-100" : "scale-0"}`} />
                            
                                  </div>
                                  <div className="flex-grow min-w-0">
                                    <p className={`text-[10px] font-medium ${isDone ? "text-lime" : "text-primary"}`}>
                                      Dia {globalDayNumber}
                                    </p>
                                    <p
                              className={`text-sm font-medium truncate ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              
                                      {reading}
                                    </p>
                                  </div>
                                  <button
                            onClick={(e) => toggleExpand(dayId, e)}
                            className={`flex-shrink-0 p-1.5 rounded-lg hover:bg-muted transition-all ${isExpanded ? "bg-muted text-primary" : "text-muted-foreground"}`}>
                            
                                    <ChevronDown
                              className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                            
                                  </button>
                                </div>
                                {isExpanded &&
                        <div className="px-4 pb-3">
                                    <CommentSection monthIndex={selectedMonth} dayIndex={index} user={user} />
                                  </div>
                        }
                              </div>);

                  })}
                        </div>
                      </div>

              }
                </>
            }
            </div>
          }
        </div>
      </main>
    </div>);

};

export default Index;