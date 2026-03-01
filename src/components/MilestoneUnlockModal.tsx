import { useEffect, useState } from 'react';
import { Flame, Shield, Layers, Star, Sword, Anchor, Music, Crown } from 'lucide-react';
import type { Milestone } from '@/data/streakMilestones';

const iconMap: Record<string, React.ElementType> = { Flame, Shield, Layers, Star, Sword, Anchor, Music, Crown };

interface Props { milestone: Milestone; onClose: () => void; }

const MilestoneUnlockModal = ({ milestone, onClose }: Props) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const handleClose = () => { setVisible(false); setTimeout(onClose, 200); };

  const Icon = iconMap[milestone.icon] || Star;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div onClick={e => e.stopPropagation()} className={`relative w-full max-w-xs rounded-3xl p-8 border border-border shadow-2xl text-center bg-card transition-transform duration-300 ${visible ? 'scale-100' : 'scale-90'}`}>
        <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${milestone.cor}20` }}>
          <Icon className="w-10 h-10" style={{ color: milestone.cor }} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-2">Conquista Desbloqueada!</p>
        <h3 className="text-xl font-bold text-foreground mb-2">{milestone.titulo}</h3>
        <p className="text-sm text-muted-foreground mb-6">{milestone.descricao}</p>
        <button onClick={handleClose} className="w-full py-3 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          Incrível!
        </button>
      </div>
    </div>
  );
};

export default MilestoneUnlockModal;
