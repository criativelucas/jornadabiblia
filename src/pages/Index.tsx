import { useState, useEffect, useMemo } from 'react';
import { Check, Award, ChevronDown, Calendar, LogIn, CheckCheck } from 'lucide-react';
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
import PanoramaTab from '@/components/PanoramaTab';
import GalleryTab from '@/components/GalleryTab';
import RecoveryBanner from '@/components/RecoveryBanner';
import DailyVerseModal from '@/components/DailyVerseModal';
import MilestoneUnlockModal from '@/components/MilestoneUnlockModal';
import AppSidebar, { type SectionId } from '@/components/AppSidebar';
import type { Milestone } from '@/data/streakMilestones';
import { toast } from 'sonner';

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const getYesterdayStr = () => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Index = () => {
  const [selectedPlan, setSelectedPlan] = useState('6months');
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [activeSection, setActiveSection] = useState<SectionId>('home');
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

  const recovery = useMemo(() => {
    if (!planStartDate) return null;
    const totalChapters = 1189;
    const totalPlanDays = currentPlan.days.length;
    const start = new Date(planStartDate);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - start.getTime()) / 86400000);
    if (elapsed <= 0 || elapsed >= totalPlanDays) return null;
    const expectedChapters = Math.round((elapsed / totalPlanDays) * totalChapters);
    const chaptersRead = Math.round((completedDays.size / totalPlanDays) * totalChapters);
    const behind = expectedChapters - chaptersRead;
    if (behind < 15) return null;
    const remaining = totalPlanDays - elapsed;
    const newDaily = Math.ceil((totalChapters - chaptersRead) / remaining);
    return { behind, newDaily, remaining };
  }, [completedDays, planStartDate, selectedPlan]);

  useEffect(() => { setSelectedMonth(0); }, [selectedPlan]);

  useEffect(() => {
    if (!user) { setCompletedDays(new Set()); setStreak(0); setLongestStreak(0); setUnlockedMilestones([]); setDisplayName(''); setLastReadDate(''); setPlanStartDate(''); return; }
    const loadProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (data) {
        const d = data as any;
        setDisplayName(d.display_name || ''); setStreak(d.streak || 0); setLongestStreak(d.longest_streak || 0);
        setLastReadDate(d.last_read_date || ''); setUnlockedMilestones(d.unlocked_milestones || []);
        setPlanStartDate(d.plan_start_date || ''); if (d.selected_plan) setSelectedPlan(d.selected_plan);
        const today = getTodayStr();
        if (d.last_verse_shown_date !== today) {
          setShowVerseModal(true);
          await supabase.from('profiles').update({ last_verse_shown_date: today } as any).eq('user_id', user.id);
        }
      }
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadProgress = async () => {
      const { data } = await supabase.from('completed_days').select('month_index, day_index').eq('user_id', user.id).eq('plan_id', selectedPlan);
      if (data) setCompletedDays(new Set(data.map(d => `${d.month_index}-${d.day_index}`)));
    };
    loadProgress();
  }, [user, selectedPlan]);

  const handlePlanChange = async (planId: string) => {
    setSelectedPlan(planId);
    if (user) {
      const today = getTodayStr();
      await supabase.from('profiles').update({ selected_plan: planId, plan_start_date: planStartDate || today } as any).eq('user_id', user.id);
      if (!planStartDate) setPlanStartDate(today);
    }
  };

  const toggleDay = async (monthIndex: number, dayIndex: number) => {
    if (!user) { navigate('/auth'); return; }
    const dayId = `${monthIndex}-${dayIndex}`;
    const newCompleted = new Set(completedDays);
    const today = getTodayStr(); const yesterday = getYesterdayStr();

    if (newCompleted.has(dayId)) {
      newCompleted.delete(dayId);
      await supabase.from('completed_days').delete().eq('user_id', user.id).eq('month_index', monthIndex).eq('day_index', dayIndex).eq('plan_id', selectedPlan);
    } else {
      newCompleted.add(dayId);
      await supabase.from('completed_days').insert({ user_id: user.id, month_index: monthIndex, day_index: dayIndex, plan_id: selectedPlan } as any);
      let newStreak = streak; let newLongest = longestStreak; let newUnlocked = [...unlockedMilestones];
      if (lastReadDate !== today) {
        newStreak = lastReadDate === yesterday ? streak + 1 : 1;
        if (newStreak > newLongest) newLongest = newStreak;
        let newMilestone: Milestone | null = null;
        for (const m of milestones) { if (newStreak >= m.dias && !newUnlocked.includes(m.dias)) { newUnlocked.push(m.dias); newMilestone = m; } }
        setStreak(newStreak); setLongestStreak(newLongest); setLastReadDate(today); setUnlockedMilestones(newUnlocked);
        await supabase.from('profiles').update({ streak: newStreak, longest_streak: newLongest, last_read_date: today, unlocked_milestones: newUnlocked, plan_start_date: planStartDate || today } as any).eq('user_id', user.id);
        if (!planStartDate) setPlanStartDate(today);
        if (newMilestone) setPendingMilestone(newMilestone);
      }
    }
    setCompletedDays(newCompleted);
  };

  const markMonthComplete = async (monthIndex: number) => {
    if (!user) { navigate('/auth'); return; }
    const month = months[monthIndex];
    if (!month) return;
    const unread = month.map((_, i) => i).filter(i => !completedDays.has(`${monthIndex}-${i}`));
    if (unread.length === 0) return;
    if (!confirm(`Marcar todos os ${unread.length} dias restantes deste mês como lidos?`)) return;

    const newCompleted = new Set(completedDays);
    const inserts = unread.map(i => ({ user_id: user.id, month_index: monthIndex, day_index: i, plan_id: selectedPlan }));
    await supabase.from('completed_days').insert(inserts as any);
    unread.forEach(i => newCompleted.add(`${monthIndex}-${i}`));
    setCompletedDays(newCompleted);

    const today = getTodayStr(); const yesterday = getYesterdayStr();
    if (lastReadDate !== today) {
      const newStreak = lastReadDate === yesterday ? streak + 1 : 1;
      const newLongest = Math.max(newStreak, longestStreak);
      setStreak(newStreak); setLongestStreak(newLongest); setLastReadDate(today);
      await supabase.from('profiles').update({ streak: newStreak, longest_streak: newLongest, last_read_date: today, plan_start_date: planStartDate || today } as any).eq('user_id', user.id);
    }
    toast.success(`Mês ${monthIndex + 1} marcado como lido!`);
  };

  const toggleExpand = (dayId: string, e: React.MouseEvent) => { e.stopPropagation(); setExpandedDay(expandedDay === dayId ? null : dayId); };
  const isMonthCompleted = (mi: number) => months[mi]?.every((_, i) => completedDays.has(`${mi}-${i}`));
  const getMonthProgress = (mi: number) => {
    const total = months[mi]?.length || 1;
    const done = months[mi]?.filter((_, i) => completedDays.has(`${mi}-${i}`)).length || 0;
    return Math.round((done / total) * 100);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const sectionTitle: Record<SectionId, string> = { home: 'Início', plans: 'Planos', trophies: 'Troféus', achieve: 'Conquistas', panorama: 'Panorama', chat: 'Perguntas', facts: 'Descobertas', gallery: 'Galeria' };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showVerseModal && <DailyVerseModal onClose={() => setShowVerseModal(false)} />}
      {pendingMilestone && <MilestoneUnlockModal milestone={pendingMilestone} onClose={() => setPendingMilestone(null)} />}

      <AppSidebar activeSection={activeSection} onNavigate={setActiveSection} displayName={displayName} onLogout={signOut} isLoggedIn={!!user} streak={streak} />

      <main className="lg:ml-16 xl:ml-56 pt-16 lg:pt-0 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Desktop header */}
          <div className="hidden lg:flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">{sectionTitle[activeSection]}</h1>
            <div className="flex items-center gap-3">
              {streak > 0 && (
                <button onClick={() => setActiveSection('achieve')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 text-sm font-bold">
                  <span className="w-4 h-4">🔥</span> {streak}
                </button>
              )}
              {user ? (
                <span className="text-sm text-muted-foreground">Olá, <span className="text-foreground font-medium">{displayName || user.email}</span></span>
              ) : (
                <button onClick={() => navigate('/auth')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                  <LogIn className="w-4 h-4" /> Entrar
                </button>
              )}
            </div>
          </div>

          {/* Section content */}
          {activeSection === 'chat' && <BibleChat />}
          {activeSection === 'facts' && <DailyCuriosity />}
          {activeSection === 'achieve' && <AchievementsTab streak={streak} longestStreak={longestStreak} unlockedMilestones={unlockedMilestones} />}
          {activeSection === 'trophies' && <TrophiesTab completedDays={completedDays} allDays={currentPlan.days} months={months} />}
          {activeSection === 'panorama' && <PanoramaTab completedDays={completedDays} allDays={currentPlan.days} months={months} />}
          {activeSection === 'gallery' && <GalleryTab user={user} />}

          {(activeSection === 'home' || activeSection === 'plans') && (
            <>
              {recovery && <RecoveryBanner behindChapters={recovery.behind} newDailyGoal={recovery.newDaily} daysRemaining={recovery.remaining} />}

              {/* Plan Selector */}
              <div className="mb-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Escolha seu plano</p>
                <div className="grid grid-cols-3 gap-2">
                  {planOptions.map(plan => (
                    <button key={plan.id} onClick={() => handlePlanChange(plan.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${selectedPlan === plan.id ? 'bg-primary/10 border-primary/30 shadow-sm' : 'bg-card border-border hover:bg-muted'}`}>
                      <div className={`text-base font-bold ${selectedPlan === plan.id ? 'text-primary' : 'text-foreground'}`}>{plan.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{plan.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Card */}
              <div className="mb-6 p-5 rounded-2xl bg-card border border-border">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Progresso Global</p>
                    <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
                      {progressPercentage}%
                      {progressPercentage === 100 && <Award className="w-8 h-8 text-lime" />}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground"><span className="text-foreground font-semibold">{completedDays.size}</span> / {totalDays} dias</p>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercentage}%` }} />
                </div>
              </div>

              {/* Month Tabs - grid for annual, scroll for others */}
              {currentPlan.targetMonths === 12 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-5">
                  {months.map((_, index) => {
                    const completed = isMonthCompleted(index);
                    const selected = selectedMonth === index;
                    const mp = getMonthProgress(index);
                    return (
                      <button key={index} onClick={() => setSelectedMonth(index)}
                        className={`p-3 rounded-xl border transition-all text-center ${selected ? 'bg-primary/10 border-primary/30 text-primary' : completed ? 'bg-card border-lime/30' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
                        <div className="font-semibold text-xs">Mês {index + 1}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{mp}%</div>
                        {completed && <Check className="w-3 h-3 text-lime mx-auto mt-1" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex overflow-x-auto gap-2 pb-3 mb-5 scrollbar-hide snap-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {months.map((_, index) => {
                    const completed = isMonthCompleted(index);
                    const selected = selectedMonth === index;
                    const mp = getMonthProgress(index);
                    return (
                      <button key={index} onClick={() => setSelectedMonth(index)}
                        className={`snap-start flex-shrink-0 min-w-[120px] px-4 py-2.5 rounded-xl border transition-all flex items-center gap-2 ${selected ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        <div className="text-left">
                          <div className="font-semibold text-xs">Mês {index + 1}</div>
                          <div className="text-[10px] opacity-70">{mp}%</div>
                        </div>
                        {completed && <Check className="w-3.5 h-3.5 text-lime" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Reading List */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">Mês {selectedMonth + 1}</h3>
                  {!isMonthCompleted(selectedMonth) && (
                    <button onClick={() => markMonthComplete(selectedMonth)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all">
                      <CheckCheck className="w-3.5 h-3.5" />
                      Concluir mês
                    </button>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {months[selectedMonth]?.map((reading, index) => {
                    const dayId = `${selectedMonth}-${index}`;
                    const isDone = completedDays.has(dayId);
                    let globalDayNumber = index + 1;
                    for (let i = 0; i < selectedMonth; i++) globalDayNumber += months[i].length;
                    const isExpanded = expandedDay === dayId;

                    return (
                      <div key={index} className={`transition-all duration-300 ${isDone ? 'opacity-60' : ''}`}>
                        <div onClick={() => toggleDay(selectedMonth, index)} className="group p-3.5 sm:p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/50">
                          <div className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isDone ? 'bg-lime/20 border-lime/50 text-lime' : 'border-border text-transparent group-hover:border-primary/50'}`}>
                            <Check className={`w-3.5 h-3.5 transition-transform duration-300 ${isDone ? 'scale-100' : 'scale-0'}`} />
                          </div>
                          <div className="flex-grow min-w-0">
                            <p className={`text-[10px] font-medium ${isDone ? 'text-lime' : 'text-primary'}`}>Dia {globalDayNumber}</p>
                            <p className={`text-sm font-medium truncate ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{reading}</p>
                          </div>
                          <button onClick={e => toggleExpand(dayId, e)} className={`flex-shrink-0 p-1.5 rounded-lg hover:bg-muted transition-all ${isExpanded ? 'bg-muted text-primary' : 'text-muted-foreground'}`}>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                        {isExpanded && <div className="px-4 pb-3"><CommentSection monthIndex={selectedMonth} dayIndex={index} user={user} /></div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
