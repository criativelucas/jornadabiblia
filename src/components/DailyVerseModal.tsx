import { useEffect, useState } from 'react';
import { BookOpen, Share2, X } from 'lucide-react';
import { getTodayVerse } from '@/data/dailyVerses';
import { toast } from 'sonner';

interface Props { onClose: () => void; }

const DailyVerseModal = ({ onClose }: Props) => {
  const [visible, setVisible] = useState(false);
  const verse = getTodayVerse();

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 200); };

  const handleShare = async () => {
    const text = `"${verse.texto}"\n— ${verse.ref}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Versículo do Dia', text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Versículo copiado!');
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-250 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-[360px] rounded-3xl p-8 border border-border shadow-2xl bg-card transition-transform duration-250 ease-out ${visible ? 'scale-100' : 'scale-90'}`}
      >
        <button onClick={handleClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="px-3 py-1.5 rounded-full bg-primary/10 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">Versículo do Dia</span>
          </div>
        </div>

        <div className="mb-5 relative">
          <span className="text-primary/20 text-4xl leading-none absolute -top-2 -left-1">"</span>
          <p className="text-foreground text-lg font-light italic leading-relaxed pl-6 pr-4">{verse.texto}</p>
          <span className="text-primary/20 text-4xl leading-none float-right -mt-2">"</span>
        </div>

        <p className="text-primary text-sm font-medium text-right mb-8 clear-both">— {verse.ref}</p>

        <div className="space-y-2.5">
          <button onClick={handleClose} className="w-full py-3 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            Começar a Ler
          </button>
          <button onClick={handleShare} className="w-full py-3 rounded-lg font-medium text-sm border border-border text-muted-foreground hover:bg-muted transition-all flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" />
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyVerseModal;
