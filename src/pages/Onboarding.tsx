import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Heart, GraduationCap, Sprout } from "lucide-react";
import PlanSelector from "@/components/PlanSelector";
import { planOptions } from "@/data/planData";

const OBJECTIVES = [
  { value: "completo", label: "Ler a Bíblia completa", icon: BookOpen, emoji: "📖" },
  { value: "fe", label: "Aprofundar minha fé", icon: Heart, emoji: "🙏" },
  { value: "estudo", label: "Estudar livros específicos", icon: GraduationCap, emoji: "📚" },
  { value: "habito", label: "Criar um hábito diário", icon: Sprout, emoji: "🌱" },
] as const;

const TIME_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [objective, setObjective] = useState("completo");
  const [dailyMinutes, setDailyMinutes] = useState(15);
  const [selectedPlanId, setSelectedPlanId] = useState("6months");

  const chaptersPerDay = useMemo(() => Math.max(1, Math.round(dailyMinutes / 3)), [dailyMinutes]);

  const goNext = () => {
    if ((document as any).startViewTransition) {
      (document as any).startViewTransition(() => setStep((s) => s + 1));
    } else {
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if ((document as any).startViewTransition) {
      (document as any).startViewTransition(() => setStep((s) => s - 1));
    } else {
      setStep((s) => s - 1);
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    await supabase
      .from("profiles")
      .update({
        onboarding_complete: true,
        daily_goal_minutes: dailyMinutes,
        reading_objective: objective,
        selected_plan: selectedPlanId,
        plan_start_date: today,
      } as any)
      .eq("user_id", user.id);
    navigate("/");
  };

  const plans = planOptions.filter((p) => p.id !== "custom").map((p, i) => ({
    id: String(i + 1).padStart(2, "0"),
    planId: p.id,
    name: p.label,
    description: p.description,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="text-center pt-8 pb-4">
        <p className="text-xs text-muted-foreground">Passo {step} de 3</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full">
        {/* Step 1 */}
        {step === 1 && (
          <div className="w-full section-enter">
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">Qual é o seu objetivo?</h2>
            <p className="text-sm text-muted-foreground text-center mb-8">Vamos personalizar sua experiência</p>
            <div className="grid grid-cols-2 gap-3">
              {OBJECTIVES.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setObjective(o.value)}
                  className={`p-5 rounded-2xl border text-left transition-all duration-200 ${
                    objective === o.value
                      ? "border-primary bg-primary/10 scale-[1.03]"
                      : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  <span className="text-2xl mb-2 block">{o.emoji}</span>
                  <p className="text-sm font-semibold text-foreground">{o.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="w-full section-enter">
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">Quanto tempo por dia?</h2>
            <p className="text-sm text-muted-foreground text-center mb-8">Escolha o que funciona pra você</p>

            <div className="text-center mb-8">
              <span className="text-6xl font-black text-foreground">{dailyMinutes}</span>
              <span className="text-xl text-muted-foreground ml-2">min</span>
            </div>

            <input
              type="range"
              min={0}
              max={TIME_OPTIONS.length - 1}
              value={TIME_OPTIONS.indexOf(dailyMinutes)}
              onChange={(e) => setDailyMinutes(TIME_OPTIONS[Number(e.target.value)])}
              className="w-full accent-primary mb-4"
            />

            <div className="flex justify-between text-[10px] text-muted-foreground mb-6">
              {TIME_OPTIONS.map((t) => (
                <span key={t} className={t === dailyMinutes ? "text-primary font-bold" : ""}>{t}m</span>
              ))}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Isso equivale a ~<span className="font-bold text-foreground">{chaptersPerDay}</span> capítulo{chaptersPerDay !== 1 ? "s" : ""} por dia
            </p>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="w-full section-enter">
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">Escolha seu plano de leitura</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">Você pode mudar depois</p>

            <div className="space-y-3">
              {plans.map((p) => (
                <button
                  key={p.planId}
                  onClick={() => setSelectedPlanId(p.planId)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${
                    selectedPlanId === p.planId
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  <p className="text-sm font-bold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-6 pb-8 max-w-lg mx-auto w-full space-y-3">
        {step < 3 ? (
          <button
            onClick={goNext}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Próximo →
          </button>
        ) : (
          <button
            onClick={handleFinish}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Começar minha jornada
          </button>
        )}
        {step > 1 && (
          <button
            onClick={goBack}
            className="w-full py-3 rounded-2xl text-muted-foreground text-sm hover:text-foreground transition-colors"
          >
            ← Voltar
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
