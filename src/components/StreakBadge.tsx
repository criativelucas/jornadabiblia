interface Props {
  streak: number;
  onClick: () => void;
}

const StreakBadge = ({ streak, onClick }: Props) => {
  if (streak <= 0) return null;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300 text-sm font-bold hover:bg-orange-500/30 transition-all"
      title="Ver conquistas"
    >
      🔥 {streak}
    </button>
  );
};

export default StreakBadge;
