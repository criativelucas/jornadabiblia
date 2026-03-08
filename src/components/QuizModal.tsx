import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, XCircle, BookOpen, Zap } from "lucide-react";
import { useThemeContext } from "@/contexts/ThemeContext";

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
}

interface Props {
  bookName: string;
  onClose: () => void;
}

type Phase = "loading" | "question" | "feedback" | "result";

const POINTS_PER_CORRECT = 25;

export default function QuizModal({ bookName, onClose }: Props) {
  const { user } = useAuth();
  const { T } = useThemeContext();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("quiz_questions")
        .select("*")
        .eq("book_name", bookName)
        .limit(3);
      if (data && data.length > 0) {
        setQuestions(data.map((q: any) => ({ ...q, options: q.options as string[] })));
        setPhase("question");
      } else {
        onClose();
      }
    };
    load();
  }, [bookName]);

  const handleSelect = (idx: number) => {
    if (phase !== "question") return;
    setSelected(idx);
    setPhase("feedback");
  };

  const handleNext = async () => {
    const correct = selected === questions[current].correct_index;
    const newAnswers = [...answers, correct];
    if (current + 1 < questions.length) {
      setAnswers(newAnswers);
      setCurrent((c) => c + 1);
      setSelected(null);
      setPhase("question");
    } else {
      const correctCount = newAnswers.filter(Boolean).length;
      const bonus = correctCount * POINTS_PER_CORRECT;
      if (user) {
        await (supabase as any).from("quiz_results").insert({
          user_id: user.id,
          book_name: bookName,
          correct_answers: correctCount,
          bonus_points: bonus,
        });
      }
      setAnswers(newAnswers);
      setPhase("result");
    }
  };

  const correctCount = answers.filter(Boolean).length;
  const bonus = correctCount * POINTS_PER_CORRECT;
  const resultEmoji = correctCount === 3 ? "🏆" : correctCount === 2 ? "🌟" : correctCount === 1 ? "📖" : "💪";
  const resultMsg =
    correctCount === 3 ? "Perfeito! Você dominou esse livro!" :
    correctCount === 2 ? "Muito bem! Quase lá!" :
    correctCount === 1 ? "Continue estudando!" :
    "Não desanime, continue lendo!";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[12px]" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[380px] overflow-hidden"
        style={{ zIndex: 52, borderRadius: "1.25rem", background: T.card, border: `1px solid ${T.border}`, boxShadow: `0 2px 40px ${T.shadow}` }}
      >
        {/* Header */}
        <div className="p-6 pb-4 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5" style={{ color: T.accent }} />
            <h3 className="text-lg font-bold" style={{ color: T.textPrimary }}>Quiz — {bookName}</h3>
          </div>
          <p className="text-xs" style={{ color: T.textMuted }}>3 perguntas · até +75 pontos bônus</p>

          {phase !== "loading" && phase !== "result" && (
            <div className="flex gap-1.5 justify-center mt-4">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 transition-all duration-300"
                  style={{
                    borderRadius: "9999px",
                    width: "2rem",
                    background: i < current ? T.accent : i === current ? `${T.accent}99` : T.card2,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        {phase === "loading" && (
          <div className="p-6 pt-2 flex justify-center">
            <div className="w-8 h-8 border-2 border-t-transparent animate-spin" style={{ borderColor: T.accent, borderTopColor: "transparent", borderRadius: "9999px" }} />
          </div>
        )}

        {(phase === "question" || phase === "feedback") && questions[current] && (
          <div className="p-6 pt-2 space-y-4">
            <p className="text-sm font-semibold leading-relaxed" style={{ color: T.textPrimary }}>
              {current + 1}. {questions[current].question}
            </p>

            <div className="space-y-2">
              {questions[current].options.map((opt, i) => {
                const isCorrect = i === questions[current].correct_index;
                const isSelected = i === selected;
                const bg = phase === "feedback"
                  ? isCorrect ? "rgba(34,197,94,0.15)" : isSelected ? "rgba(239,68,68,0.15)" : T.card2
                  : T.card2;
                const borderColor = phase === "feedback"
                  ? isCorrect ? "rgba(34,197,94,0.5)" : isSelected ? "rgba(239,68,68,0.5)" : T.border
                  : T.border;
                const textColor = phase === "feedback"
                  ? isCorrect ? "#22c55e" : isSelected ? "#ef4444" : T.textMuted
                  : T.textPrimary;
                return (
                  <button
                    key={i}
                    className="w-full text-left px-4 py-3 text-sm font-medium transition-all duration-300"
                    style={{ borderRadius: "0.875rem", background: bg, border: `1px solid ${borderColor}`, color: textColor, opacity: phase === "feedback" && !isCorrect && !isSelected ? 0.6 : 1 }}
                    onClick={() => handleSelect(i)}
                    disabled={phase === "feedback"}
                  >
                    <span className="flex items-center gap-2">
                      {phase === "feedback" && isCorrect && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#22c55e" }} />}
                      {phase === "feedback" && isSelected && !isCorrect && <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#ef4444" }} />}
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>

            {phase === "feedback" && (
              <button
                onClick={handleNext}
                className="w-full py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ borderRadius: "9999px", background: T.accent, color: T.page }}
              >
                {current + 1 < questions.length ? "Próxima →" : "Ver resultado"}
              </button>
            )}
          </div>
        )}

        {phase === "result" && (
          <div className="p-6 pt-2 text-center space-y-4">
            <span className="text-6xl block">{resultEmoji}</span>
            <h4 className="text-lg font-bold" style={{ color: T.textPrimary }}>{resultMsg}</h4>
            <p className="text-sm" style={{ color: T.textMuted }}>{correctCount} de 3 respostas corretas</p>

            <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold" style={{ borderRadius: "9999px", background: T.accentDim, color: T.accent }}>
              <Zap className="w-4 h-4" />
              +{bonus} pontos bônus no ranking
            </div>

            <div className="flex justify-center gap-2">
              {answers.map((ok, i) => (
                <div
                  key={i}
                  className="w-10 h-10 flex items-center justify-center text-sm font-bold"
                  style={{
                    borderRadius: "9999px",
                    background: ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                    color: ok ? "#22c55e" : "#ef4444",
                  }}
                >
                  {ok ? "✓" : "✗"}
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ borderRadius: "9999px", background: T.accent, color: T.page }}
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
