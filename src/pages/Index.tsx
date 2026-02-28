import { useState, useEffect, useMemo } from 'react';
import { Check, BookOpen, Award, ChevronDown, Calendar, LogOut, LogIn, Sparkles, Bot, Trophy, Tag, Medal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { planOptions, getMonths } from '@/data/planData';
import { milestones } from '@/data/streakMilestones';
import CommentSection from '@/components/CommentSection';
import BibleChat from '@/components/BibleChat';
import DailyCuriosity from '@/components/DailyCuriosity';
import AchievementsTab from '@/components/AchievementsTab';
import TrophiesTab from '@/components/TrophiesTab';
import TagsTab from '@/components/TagsTab';
import RecoveryBanner from '@/components/RecoveryBanner';
import StreakBadge from '@/components/StreakBadge';
import DailyVerseModal from '@/components/DailyVerseModal';
import MilestoneUnlockModal from '@/components/MilestoneUnlockModal';
import type { Milestone } from '@/data/streakMilestones';

type TabId = 'plan' | 'chat' | 'curiosity' | 'achievements' | 'trophies' | 'tags';

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Index = () => {
  const [selectedPlan, setSelectedPlan] = useState('6months');
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('plan');
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [lastReadDate, setLastReadDate] = useState('');
  const [unlockedMilestones, setUnlockedMilestones] = useState<number[]>([]);
  const [planStartDate, setPlanStartDate] = useState('');
  const [showVerseModal, setShowVerseModal] = useState(false);
  const [pendingMilestone, setPendingMilestone] = useState<Milestone | null>(null);
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const currentPlan = planOptions.find(p => p.id === selectedPlan)!;
  const months = useMemo(() => getMonths(currentPlan.days, currentPlan.targetMonths), [selectedPlan]);
  const totalDays = currentPlan.days.length;
  const progressPercentage = Math.round((completedDays.size / totalDays) * 100);

  // Recovery calculation
  const recovery = useMemo(() => {
    if (!planStartDate) return null;
    const totalChapters = 1189;
    const totalPlanDays = currentPlan.days.length;
    const start = new Date(planStartDate);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - start.getTime()) / 86400000);
    if (elapsed <= 0 || elapsed >= totalPlanDays) return null;
    const expectedChapters = Math.round((elapsed / totalPlanDays) * totalChapters);
    // Approximate chapters read based on completed days ratio
    const chaptersRead = Math.round((completedDays.size / totalPlanDays) * totalChapters);
    const behind = expectedChapters - chaptersRead;
    if (behind < 15) return null;
    const remaining = totalPlanDays - elapsed;
    const newDaily = Math.ceil((totalChapters - chaptersRead) / remaining);
    return { behind, newDaily, remaining };
  }, [completedDays, planStartDate, selectedPlan]);

  // Reset month when changing plan
  useEffect(() => { setSelectedMonth(0); }, [selectedPlan]);

  // Load user data from DB
  useEffect(() => {
    if (!user) {
      setCompletedDays(new Set());
      setStreak(0);
      setLongestStreak(0);
      setUnlockedMilestones([]);
      setDisplayName('');
      setLastReadDate('');
      setPlanStartDate('');
      return;
    }

    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) {
        const d = data as any;
        setDisplayName(d.display_name || '');
        setStreak(d.streak || 0);
        setLongestStreak(d.longest_streak || 0);
        setLastReadDate(d.last_read_date || '');
        setUnlockedMilestones(d.unlocked_milestones || []);
        setPlanStartDate(d.plan_start_date || '');
        if (d.selected_plan) setSelectedPlan(d.selected_plan);

        // Check daily verse
        const today = getTodayStr();
        if (d.last_verse_shown_date !== today) {
          setShowVerseModal(true);
          await supabase
            .from('profiles')
            .update({ last_verse_shown_date: today } as any)
            .eq('user_id', user.id);
        }
      }
    };

    loadProfile();
  }, [user]);

  // Load completed days when plan or user changes
  useEffect(() => {
    if (!user) return;
    const loadProgress = async () => {
      const { data } = await supabase
        .from('completed_days')
        .select('month_index, day_index')
        .eq('user_id', user.id)
        .eq('plan_id', selectedPlan);
      if (data) {
        setCompletedDays(new Set(data.map(d => `${d.month_index}-${d.day_index}`)));
      }
    };
    loadProgress();
  }, [user, selectedPlan]);

  // Save selected plan to profile
  const handlePlanChange = async (planId: string) => {
    setSelectedPlan(planId);
    if (user) {
      const today = getTodayStr();
      await supabase
        .from('profiles')
        .update({ selected_plan: planId, plan_start_date: planStartDate || today } as any)
        .eq('user_id', user.id);
      if (!planStartDate) setPlanStartDate(today);
    }
  };

  const toggleDay = async (monthIndex: number, dayIndex: number) => {
    if (!user) { navigate('/auth'); return; }

    const dayId = `${monthIndex}-${dayIndex}`;
    const newCompleted = new Set(completedDays);
    const today = getTodayStr();
    const yesterday = getYesterdayStr();

    if (newCompleted.has(dayId)) {
      newCompleted.delete(dayId);
      await supabase
        .from('completed_days')
        .delete()
        .eq('user_id', user.id)
        .eq('month_index', monthIndex)
        .eq('day_index', dayIndex)
        .eq('plan_id', selectedPlan);
    } else {
      newCompleted.add(dayId);
      await supabase.from('completed_days').insert({
        user_id: user.id,
        month_index: monthIndex,
        day_index: dayIndex,
        plan_id: selectedPlan,
      } as any);

      // Streak logic - only on marking as read
      let newStreak = streak;
      let newLongest = longestStreak;
      let newUnlocked = [...unlockedMilestones];

      if (lastReadDate !== today) {
        if (lastReadDate === yesterday) {
          newStreak = streak + 1;
        } else {
          newStreak = 1;
        }

        if (newStreak > newLongest) newLongest = newStreak;

        // Check milestones
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

        await supabase
          .from('profiles')
          .update({
            streak: newStreak,
            longest_streak: newLongest,
            last_read_date: today,
            unlocked_milestones: newUnlocked,
            plan_start_date: planStartDate || today,
          } as any)
          .eq('user_id', user.id);

        if (!planStartDate) setPlanStartDate(today);
        if (newMilestone) setPendingMilestone(newMilestone);
      }
    }
    setCompletedDays(newCompleted);
  };

  const toggleExpand = (dayId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDay(expandedDay === dayId ? null : dayId);
  };

  const isMonthCompleted = (monthIndex: number) =>
    months[monthIndex]?.every((_, i) => completedDays.has(`${monthIndex}-${i}`));

  const getMonthProgress = (monthIndex: number) => {
    const total = months[monthIndex]?.length || 1;
    const done = months[monthIndex]?.filter((_, i) => completedDays.has(`${monthIndex}-${i}`)).length || 0;
    return Math.round((done / total) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'plan', label: 'Plano', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'chat', label: 'IA', icon: <Bot className="w-4 h-4" /> },
    { id: 'curiosity', label: 'Curiosidades', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'achievements', label: 'Conquistas', icon: <Medal className="w-4 h-4" /> },
    { id: 'trophies', label: 'Troféus', icon: <Trophy className="w-4 h-4" /> },
    { id: 'tags', label: 'Tags', icon: <Tag className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background blurs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[150px]" />
        <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      {/* Modals */}
      {showVerseModal && <DailyVerseModal onClose={() => setShowVerseModal(false)} />}
      {pendingMilestone && <MilestoneUnlockModal milestone={pendingMilestone} onClose={() => setPendingMilestone(null)} />}

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-6 gap-3">
          <StreakBadge streak={streak} onClick={() => setActiveTab('achievements')} />
          <div className="flex items-center gap-3 ml-auto">
            {user ? (
              <>
                <span className="text-sm text-slate-400 hidden sm:inline">
                  Olá, <span className="text-indigo-300 font-medium">{displayName || user.email}</span>
                </span>
                <button onClick={signOut} className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all" title="Sair">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button onClick={() => navigate('/auth')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/30 transition-all text-sm font-medium">
                <LogIn className="w-4 h-4" />
                Entrar
              </button>
            )}
          </div>
        </div>

        {/* Header */}
        <header className="text-center mb-8 animate-fade-in-down">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-md">
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-purple-300">
            Bíblia Cronológica
          </h1>
          <p className="text-sm md:text-base text-slate-300/80 max-w-2xl mx-auto font-light">
            Leia a Bíblia em ordem cronológica com IA, conquistas e curiosidades.
          </p>
        </header>

        {/* Main Tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto scrollbar-hide pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-500/20 border-indigo-400/50 text-white shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'chat' && <BibleChat />}
        {activeTab === 'curiosity' && <DailyCuriosity />}
        {activeTab === 'achievements' && (
          <AchievementsTab streak={streak} longestStreak={longestStreak} unlockedMilestones={unlockedMilestones} />
        )}
        {activeTab === 'trophies' && (
          <TrophiesTab completedDays={completedDays} allDays={currentPlan.days} months={months} />
        )}
        {activeTab === 'tags' && <TagsTab user={user} />}
        {activeTab === 'plan' && (
          <>
            {/* Recovery Banner */}
            {recovery && (
              <RecoveryBanner behindChapters={recovery.behind} newDailyGoal={recovery.newDaily} daysRemaining={recovery.remaining} />
            )}

            {/* Plan Selector */}
            <div className="mb-6">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Escolha seu plano</p>
              <div className="grid grid-cols-3 gap-2">
                {planOptions.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => handlePlanChange(plan.id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selectedPlan === plan.id
                        ? 'bg-indigo-500/20 border-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className={`text-base font-bold ${selectedPlan === plan.id ? 'text-white' : 'text-slate-300'}`}>
                      {plan.label}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-tight">{plan.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Progress Card */}
            <div className="mb-6 p-5 rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Progresso Global</p>
                  <h2 className="text-3xl font-bold flex items-center gap-2">
                    {progressPercentage}%
                    {progressPercentage === 100 && <Award className="w-8 h-8 text-yellow-400" />}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">
                    <span className="text-white font-semibold">{completedDays.size}</span> / {totalDays} dias
                  </p>
                </div>
              </div>
              <div className="h-3 w-full bg-black/30 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${progressPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 rounded-full" />
                </div>
              </div>
            </div>

            {/* Month Tabs */}
            <div className="flex overflow-x-auto gap-2 pb-3 mb-5 scrollbar-hide snap-x">
              {months.map((_, index) => {
                const isCompleted = isMonthCompleted(index);
                const isSelected = selectedMonth === index;
                const monthProgress = getMonthProgress(index);

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedMonth(index)}
                    className={`snap-center whitespace-nowrap px-4 py-2.5 rounded-xl border transition-all duration-300 flex items-center gap-2 ${
                      isSelected ? 'bg-indigo-500/20 border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    } backdrop-blur-md`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <div className="text-left">
                      <div className="font-semibold text-xs">Mês {index + 1}</div>
                      <div className="text-[10px] opacity-70">{monthProgress}%</div>
                    </div>
                    {isCompleted && <Check className="w-3.5 h-3.5 text-green-400" />}
                  </button>
                );
              })}
            </div>

            {/* Reading List */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-white/10 bg-white/5">
                <h3 className="text-lg font-bold">Mês {selectedMonth + 1}</h3>
              </div>
              <div className="divide-y divide-white/5">
                {months[selectedMonth]?.map((reading, index) => {
                  const dayId = `${selectedMonth}-${index}`;
                  const isDone = completedDays.has(dayId);
                  let globalDayNumber = index + 1;
                  for (let i = 0; i < selectedMonth; i++) globalDayNumber += months[i].length;
                  const isExpanded = expandedDay === dayId;

                  return (
                    <div key={index} className={`transition-all duration-300 ${isDone ? 'opacity-60 bg-black/10' : ''}`}>
                      <div
                        onClick={() => toggleDay(selectedMonth, index)}
                        className="group p-3.5 sm:p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5"
                      >
                        <div className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isDone ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'border-white/20 text-transparent group-hover:border-indigo-400/50'}`}>
                          <Check className={`w-3.5 h-3.5 transition-transform duration-300 ${isDone ? 'scale-100' : 'scale-0'}`} />
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className={`text-[10px] font-medium ${isDone ? 'text-green-400/80' : 'text-indigo-300'}`}>Dia {globalDayNumber}</p>
                          <p className={`text-sm font-medium truncate ${isDone ? 'line-through decoration-white/30 text-slate-400' : 'text-slate-100'}`}>{reading}</p>
                        </div>
                        <button
                          onClick={(e) => toggleExpand(dayId, e)}
                          className={`flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-all ${isExpanded ? 'bg-white/10 text-indigo-300' : 'text-slate-500'}`}
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-3">
                          <CommentSection monthIndex={selectedMonth} dayIndex={index} user={user} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
