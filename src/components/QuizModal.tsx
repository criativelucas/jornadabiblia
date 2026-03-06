import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, XCircle, BookOpen, Zap } from "lucide-react";

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
        className="relative w-full max-w-[380px] rounded-3xl bg-card border border-border shadow-2xl overflow-hidden"
        style={{ zIndex: 52 }}
      >
        {/* Header */}
        <div className="p-6 pb-4 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Quiz — {bookName}</h3>
          </div>
          <p className="text-xs text-muted-foreground">3 perguntas · até +75 pontos bônus</p>

          {phase !== "loading" && phase !== "result" && (
            <div className="flex gap-1.5 justify-center mt-4">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i < current ? "w-8 bg-primary" :
                    i === current ? "w-8 bg-primary/60" :
                    "w-8 bg-muted"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        {phase === "loading" && (
          <div className="p-6 pt-2 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {(phase === "question" || phase === "feedback") && questions[current] && (
          <div className="p-6 pt-2 space-y-4">
            <p className="text-sm font-semibold text-foreground leading-relaxed">
              {current + 1}. {questions[current].question}
            </p>

            <div className="space-y-2">
              {questions[current].options.map((opt, i) => {
                const isCorrect = i === questions[current].correct_index;
                const isSelected = i === selected;
                let cls = "w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ";
                if (phase === "feedback") {
                  if (isCorrect) cls += "bg-green-500/15 border-green-500/50 text-green-600 dark:text-green-400";
                  else if (isSelected) cls += "bg-red-500/15 border-red-500/50 text-red-600 dark:text-red-400";
                  else cls += "bg-muted/30 border-border text-muted-foreground opacity-60";
                } else {
                  cls += "bg-muted/30 border-border text-foreground hover:bg-primary/10 hover:border-primary/40 active:scale-[0.98]";
                }
                return (
                  <button key={i} className={cls} onClick={() => handleSelect(i)} disabled={phase === "feedback"}>
                    <span className="flex items-center gap-2">
                      {phase === "feedback" && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      {phase === "feedback" && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>

            {phase === "feedback" && (
              <button
                onClick={handleNext}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                {current + 1 < questions.length ? "Próxima →" : "Ver resultado"}
              </button>
            )}
          </div>
        )}

        {phase === "result" && (
          <div className="p-6 pt-2 text-center space-y-4">
            <span className="text-6xl block">{resultEmoji}</span>
            <h4 className="text-lg font-bold text-foreground">{resultMsg}</h4>
            <p className="text-sm text-muted-foreground">{correctCount} de 3 respostas corretas</p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold">
              <Zap className="w-4 h-4" />
              +{bonus} pontos bônus no ranking
            </div>

            <div className="flex justify-center gap-2">
              {answers.map((ok, i) => (
                <div
                  key={i}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    ok ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/15 text-red-600 dark:text-red-400"
                  }`}
                >
                  {ok ? "✓" : "✗"}
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
