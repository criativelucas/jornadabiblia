import { Flame } from 'lucide-react';

interface Props {
  streak: number;
  onClick: () => void;
}

const StreakBadge = ({ streak, onClick }: Props) => {
  if (streak <= 0) return null;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-sm font-bold hover:bg-orange-500/20 transition-all"
      title="Ver conquistas"
    >
      <Flame className="w-4 h-4" fill="currentColor" />
      {streak}
    </button>
  );
};

export default StreakBadge;
