import { useState, useEffect, useMemo, startTransition } from "react";
import { Check, Award, ChevronDown, Calendar, LogIn, CheckCheck, Zap, BookOpen, Flame, Plus, X, ArrowRight } from "lucide-react";
import { playCheckSound } from "@/utils/sounds";
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

  const recovery = useMemo(() => {
    if (!planStartDate || activeDays.length === 0) return null;
    const start = new Date(planStartDate);
    const elapsed = Math.floor((new Date().getTime() - start.getTime()) / 86400000);
    if (elapsed <= 0 || elapsed >= activeDays.length) return null;
    const expected = Math.round(elapsed / activeDays.length * totalChaptersInPlan);
    const read = Math.round(completedDays.size / activeDays.length * totalChaptersInPlan);
    const behind = expected - read;
    if (behind < 15) return null;
    const remaining = activeDays.length - elapsed;
    return { behind, newDaily: Math.ceil((totalChaptersInPlan - read) / remaining), remaining };
  }, [completedDays, planStartDate, activeDays, totalChaptersInPlan]);

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
    toast.success(`Plano criado! Meta: ${Math.ceil(totalCh / Math.max(durationInDays, 1))} capítulos/dia 📖`);
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
      if (typeof navigator !== "undefined") navigator.vibrate?.([30, 20, 60]);
      playCheckSound();
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
    const achievements: {type: "streak" | "book";label: string;icon: string;color: string;}[] = [];
    [...milestones].
    filter((m) => unlockedMilestones.includes(m.dias)).
    sort((a, b) => b.dias - a.dias).
    slice(0, 3).
    forEach((m) => achievements.push({ type: "streak", label: m.titulo, icon: m.icon, color: m.cor }));
    bibleBooks.
    filter((b) => (readChapters.get(b.name)?.size || 0) >= b.chapters).
    slice(-3).
    forEach((b) => {
      if (achievements.length < 3)
      achievements.push({ type: "book", label: b.name, icon: "BookOpen", color: "#1A56FF" });
    });
    return achievements.slice(0, 3);
  }, [unlockedMilestones, readChapters]);

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
      

      <main className="lg:ml-16 xl:ml-56 pt-16 lg:pt-0 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="hidden lg:flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">{sectionTitle[activeSection]}</h1>
            <div className="flex items-center gap-3">
              {streak > 0 &&
              <button
                onClick={() => navigateTo("achieve")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 text-sm font-bold">
                
                  <Flame className="w-4 h-4" /> {streak}
                </button>
              }
              {user ?
              <span className="text-sm text-muted-foreground">
                  Olá, <span className="text-foreground font-medium">{displayName || user.email}</span>
                </span> :

              <button
                onClick={() => navigate("/auth")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                
                  <LogIn className="w-4 h-4" /> Entrar
                </button>
              }
            </div>
          </div>

          {mindMapBook && user &&
          <div className="mb-6">
              <button onClick={() => setMindMapBook(null)} className="text-xs text-primary mb-3 hover:underline">
                ← Voltar
              </button>
              <MindMapView bookName={mindMapBook} userId={user.id} />
            </div>
          }

          {!mindMapBook &&
          <div key={activeSection} className="section-enter">
              {activeSection === "bible" && <BibleTab />}
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
                      <DynamicGreeting displayName={displayName} />
                      {showStreakRecoveryBanner &&
                <div
                  className="mb-5 p-4 flex items-start gap-3 animate-fade-in-down ln4-glow transition-all duration-300"
                  style={{
                    background: T.accentDim,
                    border: `1px solid ${T.borderAc}`,
                    clipPath: 'polygon(0 0, 100% 0, 100% 90%, 97% 100%, 0 100%)'
                  }}>
                  
                          <span className="text-2xl">🌿</span>
                          <div className="flex-1">
                            <p className="text-sm font-black text-foreground tracking-tight">Recupere sua sequência</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Leia hoje e mantenha sua jornada viva</p>
                          </div>
                          <button
                    onClick={() => setShowStreakRecoveryBanner(false)}
                    className="text-muted-foreground hover:text-foreground transition-all duration-300">
                    
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                }
                      <StreakTree streak={streak} />
                      {recovery &&
                <RecoveryBanner
                  behindChapters={recovery.behind}
                  newDailyGoal={recovery.newDaily}
                  daysRemaining={recovery.remaining} />

                }
                      <NextAchievement completedDays={completedDays} allDays={activeDays} months={months} />
                    </>
              }

                  {completedDays.size > 0 &&
              <>
                      <div
                  className="mb-5 p-5 ln4-glow transition-all duration-300"
                  style={{
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    clipPath: 'polygon(0 0, 100% 0, 100% 93%, 97% 100%, 0 100%)'
                  }}>
                  
                        <div className="flex justify-between items-end mb-3">
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                              Progresso Global
                            </p>
                            <h2 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-2">
                              {progressPercentage}%{progressPercentage === 100 && <Award className="w-8 h-8 text-primary" />}
                            </h2>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <span className="text-foreground font-bold">{completedDays.size}</span> / {totalDays} dias
                          </p>
                        </div>
                        <div className="h-1.5 w-full bg-muted overflow-hidden">
                          <div
                      className="h-full bg-primary transition-all duration-1000 ease-out progress-shimmer"
                      style={{ width: `${progressPercentage}%` }} />
                    
                        </div>
                      </div>

                      <div
                  className="mb-5 p-5 ln4-glow transition-all duration-300"
                  style={{
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderLeft: `3px solid ${T.accent}`
                  }}>
                  
                        <div className="flex items-start justify-between">
                          <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-primary" />
                              <p className="text-sm font-black text-foreground tracking-tight">{planLabel}</p>
                            </div>
                            {planStartDate &&
                      <p className="text-[11px] text-muted-foreground mb-2">
                                Iniciado em {new Date(planStartDate).toLocaleDateString("pt-BR")}
                                {daysRemaining !== null && daysRemaining > 0 && ` · ${daysRemaining} dias restantes`}
                                {daysRemaining === 0 && " · Prazo encerrado"}
                              </p>
                      }
                            <div className="h-1 w-full bg-muted overflow-hidden mb-2">
                              <div
                          className="h-full bg-primary transition-all progress-shimmer"
                          style={{ width: `${progressPercentage}%` }} />
                        
                            </div>
                            {dailyGoal && dailyGoal > 0 &&
                      <p className="text-xs text-muted-foreground">
                                → Hoje:{" "}
                                <span className={`font-bold ${recovery ? "text-amber-500" : "text-primary"}`}>
                                  {dailyGoal}
                                </span>{" "}
                                capítulos para ler
                              </p>
                      }
                          </div>
                        </div>
                        <button
                    onClick={() => navigateTo("plans")}
                    className="text-xs text-primary font-bold mt-3 hover:underline uppercase tracking-wider">
                    
                          Ver plano completo →
                        </button>
                      </div>
                    </>
              }

                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Suas Conquistas
                      </p>
                      {recentAchievements.length > 0 &&
                  <button
                    onClick={() => navigateTo("achieve")}
                    className="text-xs text-primary font-bold hover:underline uppercase tracking-wider">
                    
                          Ver todas →
                        </button>
                  }
                    </div>
                    {recentAchievements.length === 0 ?
                <div
                  className="p-5 text-center ln4-glow transition-all duration-300"
                  style={{
                    background: T.card,
                    border: `1px solid ${T.border}`
                  }}>
                  
                        <Zap className="w-6 h-6 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground">Nenhuma conquista ainda. Continue lendo!</p>
                      </div> :

                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                        {recentAchievements.map((a, i) =>
                  <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-20">
                            <div
                      className="w-12 h-12 flex items-center justify-center ln4-glow transition-all duration-300"
                      style={{
                        backgroundColor: a.color + "20",
                        border: `1px solid ${T.border}`,
                        clipPath: 'polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%)'
                      }}>
                      
                              {a.type === "book" ?
                      <BookOpen className="w-5 h-5" style={{ color: a.color }} /> :

                      <Flame className="w-5 h-5" style={{ color: a.color }} />
                      }
                            </div>
                            <p className="text-[10px] text-foreground font-bold text-center truncate w-full">
                              {a.label}
                            </p>
                          </div>
                  )}
                      </div>
                }
                  </div>
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
                            {formPreview.perDay > 20 ? " — ritmo bastante intenso ⚡" : ""}
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