import { Zap } from 'lucide-react';

interface Props {
  behindChapters: number;
  newDailyGoal: number;
  daysRemaining: number;
}

const RecoveryBanner = ({ behindChapters, newDailyGoal, daysRemaining }: Props) => {
  if (behindChapters < 15) return null;

  return (
    <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-start gap-3">
      <div className="p-2 rounded-xl bg-amber-500/20">
        <Zap className="w-5 h-5 text-amber-400" />
      </div>
      <div>
        <p className="font-bold text-amber-300 text-sm">Recuperação Inteligente Ativa ⚡</p>
        <p className="text-xs text-slate-300 mt-1">
          Você está <span className="font-bold text-amber-400">{behindChapters}</span> capítulos atrasado.
          Leia <span className="font-bold text-amber-400">{newDailyGoal}</span> caps/dia pelos próximos{' '}
          <span className="font-bold text-amber-400">{daysRemaining}</span> dias para terminar no prazo.
        </p>
      </div>
    </div>
  );
};

export default RecoveryBanner;
