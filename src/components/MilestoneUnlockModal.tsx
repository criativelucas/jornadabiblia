import { useEffect, useState } from 'react';
import type { Milestone } from '@/data/streakMilestones';

interface Props {
  milestone: Milestone;
  onClose: () => void;
}

const MilestoneUnlockModal = ({ milestone, onClose }: Props) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 150);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-xs rounded-3xl p-8 border border-yellow-400/30 shadow-2xl text-center transition-transform duration-300 ${visible ? 'scale-100' : 'scale-[0.85]'}`}
        style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}
      >
        <div className="text-7xl mb-4">{milestone.emoji}</div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-yellow-400 mb-2">Conquista Desbloqueada!</p>
        <h3 className="text-xl font-bold text-white mb-2">{milestone.titulo}</h3>
        <p className="text-sm text-slate-300 mb-6">{milestone.descricao}</p>
        <button
          onClick={handleClose}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 hover:opacity-90 transition-opacity"
        >
          Incrível! 🙌
        </button>
      </div>
    </div>
  );
};

export default MilestoneUnlockModal;
