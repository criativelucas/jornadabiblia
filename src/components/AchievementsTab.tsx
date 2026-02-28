import { Trophy } from 'lucide-react';
import { milestones } from '@/data/streakMilestones';

interface Props {
  streak: number;
  longestStreak: number;
  unlockedMilestones: number[];
}

const AchievementsTab = ({ streak, longestStreak, unlockedMilestones }: Props) => {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/10 bg-white/5">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Conquistas
        </h3>
        <div className="flex gap-6 mt-3">
          <div>
            <p className="text-xs text-slate-400">Sequência atual</p>
            <p className="text-2xl font-bold text-orange-400">🔥 {streak}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Maior sequência</p>
            <p className="text-2xl font-bold text-yellow-400">⭐ {longestStreak}</p>
          </div>
        </div>
      </div>

      {/* Streak mini cards - horizontal scroll */}
      {streak > 0 && (
        <div className="px-6 py-4 border-b border-white/5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Próximos marcos</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {milestones
              .filter(m => !unlockedMilestones.includes(m.dias))
              .slice(0, 4)
              .map(m => {
                const progress = Math.min(100, (streak / m.dias) * 100);
                return (
                  <div key={m.dias} className="flex-shrink-0 w-24 p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <div className="text-2xl mb-1">{m.emoji}</div>
                    <p className="text-xs font-bold text-slate-300">{m.dias} dias</p>
                    <div className="h-1.5 w-full bg-black/30 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="p-6 space-y-3">
        {milestones.map(m => {
          const unlocked = unlockedMilestones.includes(m.dias);
          const progress = Math.min(100, (streak / m.dias) * 100);

          return (
            <div
              key={m.dias}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                unlocked
                  ? 'bg-yellow-500/10 border-yellow-400/30'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className={`text-3xl ${unlocked ? '' : 'opacity-30 grayscale'}`}>{m.emoji}</div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-bold text-sm ${unlocked ? 'text-yellow-300' : 'text-slate-300'}`}>{m.titulo}</p>
                  {unlocked && <span className="text-green-400 text-xs">✅</span>}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{m.descricao}</p>
                {!unlocked && (
                  <div className="h-1.5 w-full bg-black/30 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-500 font-mono">{unlocked ? '' : `${streak}/${m.dias}`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsTab;
