import { useEffect, useState } from 'react';
import { Flame, Shield, Layers, Star, Sword, Anchor, Music, Crown, Award } from 'lucide-react';
import type { Milestone } from '@/data/streakMilestones';

const iconMap: Record<string, React.ElementType> = { Flame, Shield, Layers, Star, Sword, Anchor, Music, Crown };

interface Props { milestone: Milestone; onClose: () => void; }

const MilestoneUnlockModal = ({ milestone, onClose }: Props) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const handleClose = () => { setVisible(false); setTimeout(onClose, 150); };

  const Icon = iconMap[milestone.icon] || Star;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[12px]" />
      <div
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-[340px] rounded-3xl p-8 border border-border shadow-2xl text-center bg-card transition-transform duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${visible ? 'scale-100' : 'scale-[0.88]'}`}
      >
        {/* Badge */}
        <div className="flex justify-center mb-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/[0.12] text-primary text-[10px] font-bold uppercase tracking-[0.08em]">
            <Award className="w-3.5 h-3.5" />
            Conquista Desbloqueada
          </span>
        </div>

        {/* Icon */}
        <div
          className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center border"
          style={{ backgroundColor: `${milestone.cor}20`, borderColor: `${milestone.cor}40` }}
        >
          <Icon className="w-12 h-12" style={{ color: milestone.cor }} />
        </div>

        <h3 className="text-[22px] font-bold text-foreground mb-2">{milestone.titulo}</h3>
        <p className="text-sm text-muted-foreground mb-6">{milestone.descricao}</p>

        <button onClick={handleClose} className="w-full py-3 rounded-[10px] font-semibold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          Incrível!
        </button>
      </div>
    </div>
  );
};

export default MilestoneUnlockModal;
