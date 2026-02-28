import { useState, useEffect } from 'react';
import { Check, BookOpen, Award, ChevronDown, Calendar, LogOut, LogIn, MessageCircle, Sparkles, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { planOptions, getMonths } from '@/data/planData';
import CommentSection from '@/components/CommentSection';
import BibleChat from '@/components/BibleChat';
import DailyCuriosity from '@/components/DailyCuriosity';

type TabId = 'plan' | 'chat' | 'curiosity';

const Index = () => {
  const [selectedPlan, setSelectedPlan] = useState(planOptions[1].id); // default 6 months
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('plan');
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const currentPlan = planOptions.find(p => p.id === selectedPlan)!;
  const months = getMonths(currentPlan.days);
  const totalDays = currentPlan.days.length;
  const progressPercentage = Math.round((completedDays.size / totalDays) * 100);

  // Reset month when changing plan
  useEffect(() => {
    setSelectedMonth(0);
  }, [selectedPlan]);

  // Load completed days from DB
  useEffect(() => {
    if (!user) {
      setCompletedDays(new Set());
      return;
    }
    const loadProgress = async () => {
      const { data } = await supabase
        .from('completed_days')
        .select('month_index, day_index')
        .eq('user_id', user.id);
      if (data) {
        setCompletedDays(new Set(data.map(d => `${d.month_index}-${d.day_index}`)));
      }
    };
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
      if (data) setDisplayName(data.display_name || '');
    };
    loadProgress();
    loadProfile();
  }, [user]);

  const toggleDay = async (monthIndex: number, dayIndex: number) => {
    if (!user) { navigate('/auth'); return; }

    const dayId = `${monthIndex}-${dayIndex}`;
    const newCompleted = new Set(completedDays);

    if (newCompleted.has(dayId)) {
      newCompleted.delete(dayId);
      await supabase
        .from('completed_days')
        .delete()
        .eq('user_id', user.id)
        .eq('month_index', monthIndex)
        .eq('day_index', dayIndex);
    } else {
      newCompleted.add(dayId);
      await supabase.from('completed_days').insert({
        user_id: user.id,
        month_index: monthIndex,
        day_index: dayIndex,
      });
    }
    setCompletedDays(newCompleted);
  };

  const toggleExpand = (dayId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDay(expandedDay === dayId ? null : dayId);
  };

  const isMonthCompleted = (monthIndex: number) => {
    return months[monthIndex]?.every((_, i) => completedDays.has(`${monthIndex}-${i}`));
  };

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
    { id: 'plan', label: 'Plano de Leitura', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'chat', label: 'Pergunte à IA', icon: <Bot className="w-4 h-4" /> },
    { id: 'curiosity', label: 'Curiosidades', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background blurs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[150px]" />
        <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex justify-end items-center mb-6 gap-3">
          {user ? (
            <>
              <span className="text-sm text-slate-400">
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

        {/* Header */}
        <header className="text-center mb-10 animate-fade-in-down">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-md">
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-purple-300">
            Bíblia Cronológica
          </h1>
          <p className="text-base md:text-lg text-slate-300/80 max-w-2xl mx-auto font-light">
            Leia a Bíblia em ordem cronológica com IA para tirar dúvidas e curiosidades diárias.
          </p>
        </header>

        {/* Main Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-sm font-medium transition-all whitespace-nowrap ${
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
        {activeTab === 'plan' && (
          <>
            {/* Plan Selector */}
            <div className="mb-8">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Escolha seu plano</p>
              <div className="grid grid-cols-3 gap-3">
                {planOptions.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      selectedPlan === plan.id
                        ? 'bg-indigo-500/20 border-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className={`text-lg font-bold ${selectedPlan === plan.id ? 'text-white' : 'text-slate-300'}`}>
                      {plan.label}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{plan.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Progress Card */}
            <div className="mb-8 p-6 rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">Progresso Global</p>
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
              <div className="h-4 w-full bg-black/30 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${progressPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 rounded-full" />
                </div>
              </div>
            </div>

            {/* Month Tabs */}
            <div className="flex overflow-x-auto gap-3 pb-4 mb-6 scrollbar-hide snap-x">
              {months.map((_, index) => {
                const isCompleted = isMonthCompleted(index);
                const isSelected = selectedMonth === index;
                const monthProgress = getMonthProgress(index);

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedMonth(index)}
                    className={`snap-center whitespace-nowrap px-5 py-3 rounded-2xl border transition-all duration-300 flex items-center gap-3 ${
                      isSelected ? 'bg-indigo-500/20 border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    } backdrop-blur-md`}
                  >
                    <div className={`p-1.5 rounded-full ${isSelected ? 'bg-indigo-500/30' : 'bg-black/20'}`}>
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-sm">Mês {index + 1}</div>
                      <div className="text-xs opacity-70">{monthProgress}%</div>
                    </div>
                    {isCompleted && <Check className="w-4 h-4 text-green-400" />}
                  </button>
                );
              })}
            </div>

            {/* Reading List */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/10 bg-white/5">
                <h3 className="text-xl font-bold">Mês {selectedMonth + 1}</h3>
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
                        className="group p-4 sm:p-5 flex items-center gap-4 cursor-pointer hover:bg-white/5"
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isDone ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'border-white/20 text-transparent group-hover:border-indigo-400/50'}`}>
                          <Check className={`w-4 h-4 transition-transform duration-300 ${isDone ? 'scale-100' : 'scale-0'}`} />
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className={`text-xs font-medium ${isDone ? 'text-green-400/80' : 'text-indigo-300'}`}>Dia {globalDayNumber}</p>
                          <p className={`text-base font-medium truncate ${isDone ? 'line-through decoration-white/30 text-slate-400' : 'text-slate-100'}`}>{reading}</p>
                        </div>
                        <button
                          onClick={(e) => toggleExpand(dayId, e)}
                          className={`flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-all ${isExpanded ? 'bg-white/10 text-indigo-300' : 'text-slate-500'}`}
                        >
                          <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="px-4 sm:px-6 pb-4">
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
