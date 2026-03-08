import { useMemo } from "react";

const DynamicGreeting = ({ displayName }: { displayName: string }) => {
  const hour = new Date().getHours();

  const config = useMemo(() => {
    if (hour >= 5 && hour < 12) {
      return {
        icon: "☀️",
        greeting: `Bom dia${displayName ? `, ${displayName}` : ""}!`,
        message: "Pronto para começar o dia com sabedoria?",
        bgClass: "bg-amber-500/5 border-amber-500/15",
        textClass: "text-amber-600 dark:text-amber-400",
      };
    }
    if (hour >= 12 && hour < 18) {
      return {
        icon: "📖",
        greeting: `Boa tarde${displayName ? `, ${displayName}` : ""}!`,
        message: "Continue de onde parou.",
        bgClass: "bg-card border-border",
        textClass: "text-foreground",
      };
    }
    // Night: 18–23, 0–4
    const psalmNumber = Math.floor(Math.random() * 150) + 1;
    return {
      icon: "🌙",
      greeting: `Boa noite${displayName ? `, ${displayName}` : ""}!`,
      message: `Hora de acalmar a mente. Que tal ler o Salmo ${psalmNumber}?`,
      bgClass: "bg-card border-border relative overflow-hidden",
      textClass: "text-foreground",
      overlay: true,
    };
  }, [hour, displayName]);

  return (
    <div
      className={`mb-5 p-5 border transition-all duration-700 ${config.bgClass}`}
      style={{ borderRadius: "0.875rem" }}
    >
      {config.overlay && (
        <div className="absolute inset-0 bg-black/5 dark:bg-black/20 pointer-events-none" style={{ borderRadius: "0.875rem" }} />
      )}
      <div className="relative flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{config.icon}</span>
        <div>
          <h2 className={`text-lg font-bold ${config.textClass}`}>
            {config.greeting}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {config.message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DynamicGreeting;
