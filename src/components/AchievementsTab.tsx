import { Flame, Shield, Layers, Star, Sword, Anchor, Music, Crown, Zap, Trophy, CheckCircle2 } from 'lucide-react';
import { milestones } from '@/data/streakMilestones';

const iconMap: Record<string, React.ElementType> = { Flame, Shield, Layers, Star, Sword, Anchor, Music, Crown };

interface Props { streak: number; longestStreak: number; unlockedMilestones: number[]; }

const AchievementsTab = ({ streak, longestStreak, unlockedMilestones }: Props) => {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-5 rounded-2xl bg-card border border-border">
          <p className="text-xs text-muted-foreground font-medium mb-1">Sequência atual</p>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" fill="currentColor" />
            <span className="text-2xl font-bold text-foreground">{streak}</span>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border">
          <p className="text-xs text-muted-foreground font-medium mb-1">Maior sequência</p>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-2xl font-bold text-foreground">{longestStreak}</span>
          </div>
        </div>
      </div>

      {/* Next milestones scroll */}
      {streak > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Próximos marcos</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {milestones.filter(m => !unlockedMilestones.includes(m.dias)).slice(0, 4).map(m => {
              const progress = Math.min(100, (streak / m.dias) * 100);
              const Icon = iconMap[m.icon] || Star;
              return (
                <div key={m.dias} className="flex-shrink-0 w-24 p-3 rounded-2xl bg-card border border-border text-center">
                  <Icon className="w-6 h-6 mx-auto mb-1 text-muted-foreground/40" />
                  <p className="text-xs font-bold text-foreground">{m.dias} dias</p>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Milestones list */}
      <div className="space-y-2">
        {milestones.map(m => {
          const unlocked = unlockedMilestones.includes(m.dias);
          const progress = Math.min(100, (streak / m.dias) * 100);
          const Icon = iconMap[m.icon] || Star;

          return (
            <div key={m.dias} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${unlocked ? 'bg-card border-border' : 'bg-card/50 border-border'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${unlocked ? '' : 'opacity-30'}`} style={{ backgroundColor: unlocked ? `${m.cor}20` : undefined }}>
                <Icon className="w-5 h-5" style={{ color: unlocked ? m.cor : undefined }} />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold text-sm ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>{m.titulo}</p>
                  {unlocked && <CheckCircle2 className="w-4 h-4 text-lime" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{m.descricao}</p>
                {!unlocked && (
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
              {!unlocked && <span className="text-xs text-muted-foreground font-mono">{streak}/{m.dias}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsTab;
