import { useEffect, useState } from 'react';
import { BookOpen, Award } from 'lucide-react';

interface Props {
  bookName: string;
  category: string;
  totalChapters: number;
  onClose: () => void;
  onViewMindMap?: () => void;
}

const bookMessages: Record<string, string> = {
  "Gênesis": "O começo de tudo — você leu a fundação da fé.",
  "Salmos": "150 canções ao coração de Deus. Extraordinário.",
  "Apocalipse": "Do Gênesis ao Apocalipse — a história está completa.",
  "Provérbios": "31 capítulos de sabedoria para toda a vida.",
  "Isaías": "66 capítulos do evangelista do Antigo Testamento.",
  "Jeremias": "52 capítulos do profeta que nunca desistiu.",
  "Êxodo": "A jornada épica da escravidão à liberdade.",
  "João": "O evangelho da vida eterna — concluído!",
  "Romanos": "A obra-prima teológica de Paulo, dominada.",
  "Mateus": "O evangelho do Rei Messias — completo!",
};

const defaultMessage = "Mais um livro dominado. Continue assim!";

const BookTrophyModal = ({ bookName, category, totalChapters, onClose, onViewMindMap }: Props) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const handleClose = () => { setVisible(false); setTimeout(onClose, 150); };

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
            Troféu Desbloqueado
          </span>
        </div>

        {/* Icon */}
        <div className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center bg-primary/10 border border-primary/20">
          <BookOpen className="w-14 h-14 text-primary" />
        </div>

        {/* Title */}
        <h3 className="text-[22px] font-bold text-foreground mb-1">{bookName}</h3>
        <p className="text-[13px] text-muted-foreground mb-4">{category} • {totalChapters} capítulos</p>

        {/* Message */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {bookMessages[bookName] || defaultMessage}
        </p>

        {/* Actions */}
        <div className="space-y-2.5">
          <button onClick={handleClose} className="w-full py-3 rounded-[10px] font-semibold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            Continuar lendo →
          </button>
          {onViewMindMap && (
            <button onClick={() => { handleClose(); onViewMindMap(); }} className="w-full py-3 rounded-[10px] font-medium text-sm border border-border text-muted-foreground hover:bg-muted transition-all">
              Ver mapa mental 🗺️
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookTrophyModal;
