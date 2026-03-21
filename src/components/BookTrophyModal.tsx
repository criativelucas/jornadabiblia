import { useEffect, useRef, useState } from "react";
import { BookOpen, Award, Zap, Map, Share2 } from "lucide-react";
import { playBookComplete } from "@/utils/sounds";
import { shareBookAchievement } from "@/utils/shareAchievement";
import QuizModal from "@/components/QuizModal";

interface Props {
  bookName: string;
  category: string;
  totalChapters: number;
  onClose: () => void;
  onViewMindMap?: () => void;
  queuePosition?: number;
  queueTotal?: number;
  streak?: number;
}

const bookMessages: Record<string, string> = {
  Gênesis: "O começo de tudo — você leu a fundação da fé.",
  Salmos: "150 canções ao coração de Deus. Extraordinário.",
  Apocalipse: "Do Gênesis ao Apocalipse — a história está completa.",
  Provérbios: "31 capítulos de sabedoria para toda a vida.",
  Isaías: "66 capítulos do evangelista do Antigo Testamento.",
  Jeremias: "52 capítulos do profeta que nunca desistiu.",
  Êxodo: "A jornada épica da escravidão à liberdade.",
  João: "O evangelho da vida eterna — concluído!",
  Romanos: "A obra-prima teológica de Paulo, dominada.",
  Mateus: "O evangelho do Rei Messias — completo!",
};

const defaultMessage = "Mais um livro dominado. Continue assim!";

function launchConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ["#1A56FF", "#a78bfa", "#34d399", "#fbbf24", "#f472b6", "#60a5fa"];
  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 100,
    r: 4 + Math.random() * 5,
    d: 1.5 + Math.random() * 2.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    tilt: Math.random() * 10 - 5,
    tiltAngle: 0,
    tiltSpeed: 0.05 + Math.random() * 0.05,
    opacity: 1,
  }));

  let frame = 0;
  const totalFrames = 120;

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;
    for (const p of particles) {
      p.tiltAngle += p.tiltSpeed;
      p.y += p.d;
      p.tilt = Math.sin(p.tiltAngle) * 12;
      p.opacity = Math.max(0, 1 - frame / totalFrames);
      ctx.beginPath();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.ellipse(p.x + p.tilt, p.y, p.r, p.r * 0.5, p.tiltAngle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (frame < totalFrames) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  requestAnimationFrame(draw);
}

const BookTrophyModal = ({
  bookName,
  category,
  totalChapters,
  onClose,
  onViewMindMap,
  queuePosition,
  queueTotal,
  streak = 0,
}: Props) => {
  const [visible, setVisible] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    playBookComplete();
    const t = setTimeout(() => {
      if (canvasRef.current) launchConfetti(canvasRef.current);
    }, 200);

    if (bookName === "Apocalipse") {
      document.body.classList.add("apocalypse-theme");
      const timer = setTimeout(() => {
        document.body.classList.remove("apocalypse-theme");
      }, 30000);
      return () => {
        clearTimeout(t);
        clearTimeout(timer);
        document.body.classList.remove("apocalypse-theme");
      };
    }

    return () => clearTimeout(t);
  }, [bookName]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 150);
  };

  // Abre o quiz; ao fechar o quiz, fecha o trophy modal
  const handleContinue = () => {
    setShowQuiz(true);
  };

  if (showQuiz) {
    return <QuizModal bookName={bookName} onClose={handleClose} />;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={handleClose}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 51 }} />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[12px]" />

      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-[340px] rounded-3xl p-8 border border-border shadow-2xl text-center bg-card transition-transform duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${visible ? "scale-100" : "scale-[0.88]"}`}
        style={{ zIndex: 52 }}
      >
        {/* Badge */}
        <div className="flex justify-center mb-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/[0.12] text-primary text-[10px] font-bold uppercase tracking-[0.08em]">
            <Award className="w-3.5 h-3.5" />
            Troféu Desbloqueado
            {queueTotal && queueTotal > 1 && (
              <span className="ml-1 text-muted-foreground">
                ({queuePosition} de {queueTotal})
              </span>
            )}
          </span>
        </div>

        {/* Easter egg: Jonas waves */}
        {bookName === "Jonas" && (
          <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden rounded-b-3xl pointer-events-none">
            <div
              className="absolute bottom-0 left-0 w-[200%] h-8 bg-blue-500/30 rounded-[40%]"
              style={{ animation: "wave 3s ease-in-out infinite" }}
            />
            <div
              className="absolute bottom-0 left-0 w-[200%] h-6 bg-blue-500/20 rounded-[40%]"
              style={{ animation: "wave 3.5s ease-in-out infinite 0.5s" }}
            />
          </div>
        )}

        {/* Easter egg: Salmos stars */}
        {bookName === "Salmos" && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            {Array.from({ length: 15 }).map((_, i) => (
              <span
                key={i}
                className="absolute text-yellow-400"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-10px`,
                  fontSize: `${10 + Math.random() * 8}px`,
                  animation: `star-fall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s infinite`,
                }}
              >
                ✦
              </span>
            ))}
          </div>
        )}

        {/* Icon */}
        <div className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center bg-primary/10 border border-primary/20 animate-trophy-pulse">
          <BookOpen className="w-14 h-14 text-primary" />
        </div>

        <h3 className="text-[22px] font-bold text-foreground mb-1">{bookName}</h3>
        <p className="text-[13px] text-muted-foreground mb-4">
          {category} • {totalChapters} capítulos
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{bookMessages[bookName] || defaultMessage}</p>

        {/* Quiz CTA */}
        <div className="mb-4 p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3 text-left">
          <Zap className="w-6 h-6 text-primary flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-foreground">Quiz sobre {bookName}</p>
            <p className="text-[10px] text-muted-foreground">3 perguntas · ganhe até +75 pts no ranking</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            onClick={handleContinue}
            className="w-full py-3 rounded-[10px] font-semibold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Fazer o quiz
          </button>
          <button
            onClick={handleClose}
            className="w-full py-3 rounded-[10px] font-medium text-sm border border-border text-muted-foreground hover:bg-muted transition-all"
          >
            Pular →
          </button>
          {onViewMindMap && (
            <button
              onClick={() => {
                handleClose();
                onViewMindMap();
              }}
              className="w-full py-3 rounded-[10px] font-medium text-sm border border-border text-muted-foreground hover:bg-muted transition-all"
            >
              Ver mapa mental 🗺️
{" "}
            </button>
          )}
          <button
            onClick={() => shareBookAchievement({ bookName, streak, category })}
            className="w-full py-3 rounded-[10px] font-medium text-sm border border-border text-muted-foreground hover:bg-muted transition-all"
          >
            Compartilhar conquista 📲
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookTrophyModal;
