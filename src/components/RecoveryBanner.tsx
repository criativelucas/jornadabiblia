import { Zap } from 'lucide-react';

interface Props { behindChapters: number; newDailyGoal: number; daysRemaining: number; }

const RecoveryBanner = ({ behindChapters, newDailyGoal, daysRemaining }: Props) => {
  if (behindChapters < 15) return null;
  return (
    <div className="mb-6 p-4 bg-primary/5 border-l-4 border-primary flex items-start gap-3" style={{ borderRadius: "0.875rem" }}>
      <div className="p-2 rounded-lg bg-primary/10">
        <Zap className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="font-bold text-foreground text-sm">Plano Recalibrado</p>
        <p className="text-xs text-muted-foreground mt-1">
          Você está <span className="font-bold text-primary">{behindChapters}</span> capítulos atrasado.
          Leia <span className="font-bold text-primary">{newDailyGoal}</span> caps/dia pelos próximos{' '}
          <span className="font-bold text-primary">{daysRemaining}</span> dias para terminar no prazo.
        </p>
      </div>
    </div>
  );
};

export default RecoveryBanner;
