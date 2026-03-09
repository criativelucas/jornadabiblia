import { useMemo } from "react";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useTilt } from "@/hooks/useTilt";
import { Flame } from "lucide-react";

interface Props {
  streak: number;
  compact?: boolean;
}

const StreakTree = ({ streak, compact = false }: Props) => {
  const { T } = useThemeContext();
  const tilt = useTilt(6);

  const stage = useMemo(() => {
    if (streak <= 0) return "seed";
    if (streak <= 6) return "sprout";
    if (streak <= 29) return "young";
    if (streak <= 99) return "tree";
    return "fruit";
  }, [streak]);

  const stageLabel = useMemo(() => {
    if (streak <= 0) return "Semente";
    if (streak <= 6) return "Broto";
    if (streak <= 29) return "Jovem";
    if (streak <= 99) return "Árvore";
    return "Frutífera";
  }, [streak]);

  const leafColor = streak > 0 ? T.accent : T.textMuted;
  const trunkColor = T.textMuted;

  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="mb-5 transition-transform duration-200 ease-out"
      style={{
        background: `linear-gradient(135deg, ${T.card} 0%, ${T.card2} 100%)`,
        border: `1px solid ${T.border}`,
        borderRadius: "1.25rem",
        padding: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle glow effect */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          right: "-30%",
          width: "60%",
          height: "100%",
          background: `radial-gradient(circle, ${T.accentDim} 0%, transparent 70%)`,
          opacity: streak > 0 ? 0.5 : 0.2,
          pointerEvents: "none",
        }}
      />

      <div className="flex items-center gap-4 relative z-10">
        {/* Tree SVG in a glass container */}
        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "1rem",
            background: `linear-gradient(180deg, ${T.page}90 0%, ${T.card2} 100%)`,
            border: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 8px 32px -8px ${T.accent}20, inset 0 1px 0 ${T.page}40`,
            flexShrink: 0,
          }}
        >
          <svg
            viewBox="0 0 120 140"
            className="w-20 h-24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Ground */}
            <ellipse cx="60" cy="130" rx="40" ry="6" fill={T.card2} />

            {stage === "seed" && (
              <ellipse cx="60" cy="122" rx="6" ry="5" fill="#8B6914" />
            )}

            {stage === "sprout" && (
              <g>
                <line x1="60" y1="125" x2="60" y2="100" stroke={leafColor} strokeWidth="2.5" strokeLinecap="round" />
                <ellipse cx="50" cy="100" rx="10" ry="5" fill={leafColor} opacity="0.8"
                  className="animate-sway" style={{ transformOrigin: "60px 100px" }} />
                <ellipse cx="70" cy="105" rx="10" ry="5" fill={leafColor} opacity="0.7"
                  className="animate-sway-reverse" style={{ transformOrigin: "60px 105px" }} />
              </g>
            )}

            {stage === "young" && (
              <g>
                <line x1="60" y1="128" x2="60" y2="70" stroke={trunkColor} strokeWidth="4" strokeLinecap="round" />
                {[
                  { cx: 42, cy: 85, rx: 14, ry: 7, delay: "0s" },
                  { cx: 78, cy: 80, rx: 14, ry: 7, delay: "0.3s" },
                  { cx: 45, cy: 70, rx: 12, ry: 6, delay: "0.6s" },
                  { cx: 75, cy: 65, rx: 12, ry: 6, delay: "0.2s" },
                  { cx: 55, cy: 58, rx: 10, ry: 5, delay: "0.5s" },
                  { cx: 65, cy: 55, rx: 10, ry: 5, delay: "0.1s" },
                ].map((l, i) => (
                  <ellipse
                    key={i}
                    cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry}
                    fill={leafColor} opacity="0.75"
                    className="animate-sway"
                    style={{ transformOrigin: "60px 128px", animationDelay: l.delay }}
                  />
                ))}
              </g>
            )}

            {stage === "tree" && (
              <g>
                <path d="M56 128 Q58 90 55 60 L65 60 Q62 90 64 128 Z" fill={trunkColor} />
                <circle cx="60" cy="50" r="28" fill={leafColor} opacity="0.8" className="animate-sway" style={{ transformOrigin: "60px 128px" }} />
                <circle cx="45" cy="60" r="18" fill={leafColor} opacity="0.7" className="animate-sway-reverse" style={{ transformOrigin: "60px 128px" }} />
                <circle cx="75" cy="60" r="18" fill={leafColor} opacity="0.7" className="animate-sway" style={{ transformOrigin: "60px 128px", animationDelay: "0.4s" }} />
                <circle cx="60" cy="35" r="16" fill={leafColor} opacity="0.6" />
                <ellipse cx="60" cy="132" rx="25" ry="4" fill={`${T.textPrimary}15`} />
              </g>
            )}

            {stage === "fruit" && (
              <g>
                <path d="M56 128 Q58 90 55 55 L65 55 Q62 90 64 128 Z" fill={trunkColor} />
                <circle cx="60" cy="45" r="30" fill={leafColor} opacity="0.8" className="animate-sway" style={{ transformOrigin: "60px 128px" }} />
                <circle cx="42" cy="58" r="20" fill={leafColor} opacity="0.7" className="animate-sway-reverse" style={{ transformOrigin: "60px 128px" }} />
                <circle cx="78" cy="58" r="20" fill={leafColor} opacity="0.7" className="animate-sway" style={{ transformOrigin: "60px 128px", animationDelay: "0.4s" }} />
                <circle cx="60" cy="30" r="18" fill={leafColor} opacity="0.6" />
                {[
                  { cx: 48, cy: 38 },
                  { cx: 72, cy: 42 },
                  { cx: 58, cy: 28 },
                  { cx: 40, cy: 52 },
                  { cx: 80, cy: 50 },
                ].map((f, i) => (
                  <circle key={i} cx={f.cx} cy={f.cy} r="4" fill="#F59E0B" opacity="0.9" />
                ))}
                <ellipse cx="60" cy="132" rx="28" ry="5" fill={`${T.textPrimary}10`} />
              </g>
            )}
          </svg>
        </div>

        {/* Stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={14} style={{ color: T.accent }} />
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: T.textMuted,
              }}
            >
              Sequência
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span
              style={{
                fontSize: "2.5rem",
                fontWeight: 900,
                color: T.textPrimary,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              {streak}
            </span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: T.textMuted }}>
              {streak === 1 ? "dia" : "dias"}
            </span>
          </div>

          {/* Stage badge */}
          <div
            className="mt-2 inline-flex items-center gap-1.5"
            style={{
              padding: "4px 10px",
              borderRadius: "9999px",
              background: T.accentDim,
              border: `1px solid ${T.borderAc}`,
            }}
          >
            <span style={{ fontSize: "11px" }}>
              {stage === "seed" && "🌰"}
              {stage === "sprout" && "🌱"}
              {stage === "young" && "🌿"}
              {stage === "tree" && "🌳"}
              {stage === "fruit" && "🍎"}
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: T.accent,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {stageLabel}
            </span>
          </div>

          {streak === 0 && (
            <p style={{ fontSize: "11px", color: T.textMuted, marginTop: "8px" }}>
              Leia hoje e plante sua sequência
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StreakTree;
