import { useEffect, useState } from 'react';
import { BookOpen, Share2, X } from 'lucide-react';
import { getTodayVerse } from '@/data/dailyVerses';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

const DailyVerseModal = ({ onClose }: Props) => {
  const [visible, setVisible] = useState(false);
  const verse = getTodayVerse();

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 150);
  };

  const handleShare = async () => {
    const text = `"${verse.texto}"\n— ${verse.ref}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Versículo do Dia', text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Versículo copiado!');
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-[340px] rounded-3xl p-7 border border-amber-400/20 shadow-2xl transition-transform duration-300 ${visible ? 'scale-100' : 'scale-[0.85]'}`}
        style={{ background: 'linear-gradient(135deg, #111827, #1a2540)' }}
      >
        <button onClick={handleClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-5">
          <div className="p-1.5 rounded-lg bg-amber-500/20">
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400">Versículo do Dia</span>
        </div>

        <div className="mb-5">
          <span className="text-amber-400/40 text-2xl leading-none">"</span>
          <p className="text-slate-100 text-base italic leading-relaxed -mt-3 pl-4 pr-2">{verse.texto}</p>
          <span className="text-amber-400/40 text-2xl leading-none float-right">"</span>
        </div>

        <p className="text-amber-400 text-sm font-medium text-right mb-6 clear-both">— {verse.ref}</p>

        <div className="space-y-2.5">
          <button
            onClick={handleClose}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 hover:opacity-90 transition-opacity"
          >
            Começar a Ler 📖
          </button>
          <button
            onClick={handleShare}
            className="w-full py-3 rounded-xl font-medium text-sm border border-white/10 text-slate-300 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Compartilhar 🔗
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyVerseModal;
