import { useState } from 'react';
import { Check, BookOpen, Award, ChevronRight, Calendar } from 'lucide-react';

const planData = [
  [
    "Gênesis 1-3", "Gênesis 4-7", "Gênesis 8-11", "Jó 1-5", "Jó 6-9", "Jó 10-13", "Jó 14-17",
    "Jó 18-21", "Jó 22-24", "Jó 25-28", "Jó 29-31", "Jó 32-34", "Jó 35-37", "Jó 38-39",
    "Jó 40-42", "Gênesis 12-15", "Gênesis 16-18", "Gênesis 19-21", "Gênesis 22-24", "Gênesis 25-26",
    "Gênesis 27-29", "Gênesis 30-31", "Gênesis 32-34", "Gênesis 35-37", "Gênesis 38-40",
    "Gênesis 41-42", "Gênesis 43-45", "Gênesis 46-47", "Gênesis 48-50", "Êxodo 1-3"
  ],
  [
    "Êxodo 4-6", "Êxodo 7-9", "Êxodo 10-12", "Êxodo 13-15", "Êxodo 16-18", "Êxodo 19-21",
    "Êxodo 22-24", "Êxodo 25-27", "Êxodo 28-29", "Êxodo 30-32", "Êxodo 33-35", "Êxodo 36-38",
    "Êxodo 39-40", "Levítico 1-4", "Levítico 5-7", "Levítico 8-10", "Levítico 11-13", "Levítico 14-15",
    "Levítico 16-18", "Levítico 19-21", "Levítico 22-23", "Levítico 24-25", "Levítico 26-27",
    "Números 1-2", "Números 3-4", "Números 5-6", "Números 7", "Números 8-10", "Números 11-13", "Números 14-15"
  ],
  [
    "Números 16-17", "Números 18-20", "Números 21-22", "Números 23-25", "Números 26-27", "Números 28-30",
    "Números 31-32", "Números 33-36", "Deuteronômio 1-2", "Deuteronômio 3-4", "Deuteronômio 5-7", "Deuteronômio 8-10",
    "Deuteronômio 11-13", "Deuteronômio 14-16", "Deuteronômio 17-20", "Deuteronômio 21-23", "Deuteronômio 24-27",
    "Deuteronômio 28-29", "Deuteronômio 30-31", "Deuteronômio 32-34", "Josué 1-4", "Josué 5-8", "Josué 9-11",
    "Josué 12-15", "Josué 16-18", "Josué 19-21", "Josué 22-24", "Juízes 1-2", "Juízes 3-5", "Juízes 6-7"
  ],
  [
    "Juízes 8-9", "Juízes 10-12", "Juízes 13-15", "Juízes 16-18", "Juízes 19-21", "Rute 1-4",
    "1 Samuel 1-3", "1 Samuel 4-8", "1 Samuel 9-12", "1 Samuel 13-14", "1 Samuel 15-17", "1 Samuel 18-20",
    "1 Samuel 21-24", "1 Samuel 25-27", "1 Samuel 28-31", "2 Samuel 1-3", "2 Samuel 4-7", "2 Samuel 8-12",
    "2 Samuel 13-15", "2 Samuel 16-18", "2 Samuel 19-21", "2 Samuel 22-24", "Salmos 1-15", "Salmos 16-24",
    "Salmos 25-34", "Salmos 35-43", "Salmos 44-54", "Salmos 55-64", "Salmos 65-72", "Provérbios 1-5"
  ],
  [
    "Provérbios 6-11", "Provérbios 12-17", "Provérbios 18-22", "Provérbios 23-27", "Provérbios 28-31", "Eclesiastes 1-6",
    "Eclesiastes 7-12", "Cânticos 1-8", "1 Reis 1-4", "1 Reis 5-8", "1 Reis 9-11", "1 Reis 12-14",
    "1 Reis 15-17", "1 Reis 18-20", "1 Reis 21-22", "2 Reis 1-3", "2 Reis 4-5", "2 Reis 6-8",
    "2 Reis 9-11", "2 Reis 12-14", "Isaías 1-4", "Isaías 5-8", "Isaías 9-12", "Isaías 13-17",
    "Isaías 18-22", "Jeremias 1-3", "Jeremias 4-6", "Jeremias 7-9", "Ezequiel 1-4", "Daniel 1-3"
  ],
  [
    "Esdras 1-3", "Esdras 4-6", "Esdras 7-10", "Neemias 1-3", "Neemias 4-6", "Neemias 7-9",
    "Neemias 10-13", "Ester 1-5", "Ester 6-10", "Mateus 1-4", "Mateus 5-7", "Mateus 8-10",
    "Mateus 11-13", "Mateus 14-16", "Mateus 17-19", "Mateus 20-22", "Mateus 23-25", "Mateus 26-28",
    "Marcos 1-4", "Lucas 1-3", "João 1-3", "Atos 1-4", "Atos 5-8", "Romanos 1-4",
    "1 Coríntios 1-4", "Gálatas 1-3", "Efésios 1-3", "Hebreus 1-4", "1 Pedro 1-3", "Apocalipse 1-22"
  ]
];

const Index = () => {
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());

  const totalDays = 180;
  const progressPercentage = Math.round((completedDays.size / totalDays) * 100);

  const toggleDay = (monthIndex: number, dayIndex: number) => {
    const dayId = `${monthIndex}-${dayIndex}`;
    const newCompleted = new Set(completedDays);
    if (newCompleted.has(dayId)) newCompleted.delete(dayId);
    else newCompleted.add(dayId);
    setCompletedDays(newCompleted);
  };

  const isMonthCompleted = (monthIndex: number) => {
    return planData[monthIndex].every((_, i) => completedDays.has(`${monthIndex}-${i}`));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background blurs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[150px]" />
        <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="text-center mb-12 animate-fade-in-down">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-md">
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-purple-300">
            Jornada de 6 Meses
          </h1>
          <p className="text-lg md:text-xl text-slate-300/80 max-w-2xl mx-auto font-light">
            A Bíblia em Ordem Cronológica. Acompanhe o seu progresso diário e mergulhe na história de forma imersiva e sequencial.
          </p>
        </header>

        {/* Progress Card */}
        <div className="mb-12 p-6 rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
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
              <div className="absolute inset-0 bg-white/20 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Month Tabs */}
        <div className="flex overflow-x-auto gap-3 pb-4 mb-6 scrollbar-hide snap-x">
          {planData.map((_, index) => {
            const isCompleted = isMonthCompleted(index);
            const isSelected = selectedMonth === index;

            return (
              <button
                key={index}
                onClick={() => setSelectedMonth(index)}
                className={`
                  snap-center whitespace-nowrap px-6 py-4 rounded-2xl border transition-all duration-300 flex items-center gap-3
                  ${isSelected ? 'bg-indigo-500/20 border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'}
                  backdrop-blur-md
                `}
              >
                <div className={`p-2 rounded-full ${isSelected ? 'bg-indigo-500/30' : 'bg-black/20'}`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-base">Mês {index + 1}</div>
                  <div className="text-xs opacity-70">30 dias</div>
                </div>
                {isCompleted && <Check className="w-5 h-5 text-green-400 ml-2" />}
              </button>
            );
          })}
        </div>

        {/* Reading List */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/10 bg-white/5">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              Leituras do Mês {selectedMonth + 1}
            </h3>
          </div>

          <div className="divide-y divide-white/5">
            {planData[selectedMonth].map((reading, index) => {
              const dayId = `${selectedMonth}-${index}`;
              const isDone = completedDays.has(dayId);
              const globalDayNumber = selectedMonth * 30 + index + 1;

              return (
                <div
                  key={index}
                  onClick={() => toggleDay(selectedMonth, index)}
                  className={`group p-4 sm:p-6 flex items-center gap-4 cursor-pointer transition-all duration-300 hover:bg-white/5 ${isDone ? 'opacity-60 bg-black/10' : ''}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isDone ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'border-white/20 text-transparent group-hover:border-indigo-400/50'}`}>
                    <Check className={`w-5 h-5 transition-transform duration-300 ${isDone ? 'scale-100' : 'scale-0'}`} />
                  </div>
                  <div className="flex-grow">
                    <p className={`text-sm font-medium transition-colors duration-300 ${isDone ? 'text-green-400/80' : 'text-indigo-300'}`}>
                      Dia {globalDayNumber}
                    </p>
                    <p className={`text-lg sm:text-xl font-medium transition-all duration-300 ${isDone ? 'line-through decoration-white/30 text-slate-400' : 'text-slate-100'}`}>
                      {reading}
                    </p>
                  </div>
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ChevronRight className="w-6 h-6 text-slate-500" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
