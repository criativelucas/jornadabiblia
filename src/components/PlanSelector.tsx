import { useState, useCallback, useEffect, useRef } from "react";

interface Plan {
  id: string;
  label: string;
  description: string;
}

interface Props {
  plans: Plan[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const PlanSelector = ({ plans, selectedId, onSelect }: Props) => {
  const selectedIdx = plans.findIndex((p) => p.id === selectedId);
  const [activeIdx, setActiveIdx] = useState(selectedIdx >= 0 ? selectedIdx : 0);
  const touchStartY = useRef<number | null>(null);

  const move = useCallback(
    (dir: 1 | -1) => {
      setActiveIdx((prev) => Math.max(0, Math.min(plans.length - 1, prev + dir)));
    },
    [plans.length],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      if (e.key === "Enter") onSelect(plans[activeIdx].id);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [move, activeIdx, onSelect, plans]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 30) move(diff > 0 ? 1 : -1);
    touchStartY.current = null;
  };

  // Position offsets for items relative to active
  const getStyle = (idx: number): React.CSSProperties => {
    const offset = idx - activeIdx;
    const absOffset = Math.abs(offset);
    if (absOffset > 3) return { display: "none" };

    const size = Math.max(32, 72 - absOffset * 14);
    const opacity = absOffset === 0 ? 1 : Math.max(0.2, 0.6 - absOffset * 0.15);
    const translateY = offset * 80;

    return {
      fontSize: `${size}px`,
      opacity,
      transform: `translateY(${translateY}px)`,
      transition: "all 300ms cubic-bezier(0.16, 1, 0.3, 1)",
    };
  };

  return (
    <div
      className="relative flex items-center gap-8 min-h-[340px] overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={(e) => {
        if (Math.abs(e.deltaY) > 10) move(e.deltaY > 0 ? 1 : -1);
      }}
    >
      {/* Arc line */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 w-[2px] h-[260px] bg-border rounded-full" />

      {/* Items */}
      <div className="relative ml-16 flex-grow" style={{ height: "340px" }}>
        {plans.map((plan, idx) => {
          const isActive = idx === activeIdx;
          const itemStyle = getStyle(idx);

          if (itemStyle.display === "none") return null;

          return (
            <div
              key={plan.id}
              className="absolute left-0 right-0 flex items-center gap-4 cursor-pointer"
              style={{
                ...itemStyle,
                top: "50%",
                marginTop: "-30px",
              }}
              onClick={() => {
                setActiveIdx(idx);
                onSelect(plan.id);
              }}
            >
              {/* Dot on the arc */}
              <div
                className={`absolute -left-[52px] w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                  isActive
                    ? "bg-primary border-primary scale-125"
                    : "bg-muted border-border"
                }`}
              />

              {/* Number */}
              <span
                className={`font-black tabular-nums transition-all duration-300 ${
                  isActive ? "text-foreground" : "text-muted-foreground/40"
                }`}
                style={{ fontSize: itemStyle.fontSize, lineHeight: 1 }}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>

              {/* Info - only for active */}
              {isActive && (
                <div className="animate-fade-in">
                  <p className="text-lg font-semibold text-foreground">{plan.label}</p>
                  <p className="text-[13px] text-muted-foreground line-clamp-2 max-w-[240px]">
                    {plan.description}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll hints */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 text-muted-foreground/30">
        <button onClick={() => move(-1)} className="hover:text-foreground transition-colors text-lg">▲</button>
        <button onClick={() => move(1)} className="hover:text-foreground transition-colors text-lg">▼</button>
      </div>
    </div>
  );
};

export default PlanSelector;
