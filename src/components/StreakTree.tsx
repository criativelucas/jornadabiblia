import { useMemo } from "react";

interface Props {
  streak: number;
}

const StreakTree = ({ streak }: Props) => {
  const stage = useMemo(() => {
    if (streak <= 0) return "seed";
    if (streak <= 6) return "sprout";
    if (streak <= 29) return "young";
    if (streak <= 99) return "tree";
    return "fruit";
  }, [streak]);

  const leafColor = streak > 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";
  const trunkColor = "hsl(var(--foreground) / 0.5)";

  return (
    <div className="flex flex-col items-center mb-5">
      <svg
        viewBox="0 0 120 140"
        className="w-28 h-32"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ground */}
        <ellipse cx="60" cy="130" rx="40" ry="6" fill="hsl(var(--muted))" />

        {stage === "seed" && (
          <>
            <ellipse cx="60" cy="122" rx="6" ry="5" fill="#8B6914" />
          </>
        )}

        {stage === "sprout" && (
          <g>
            {/* Stem */}
            <line x1="60" y1="125" x2="60" y2="100" stroke={leafColor} strokeWidth="2.5" strokeLinecap="round" />
            {/* Leaves */}
            <ellipse cx="50" cy="100" rx="10" ry="5" fill={leafColor} opacity="0.8"
              className="animate-sway" style={{ transformOrigin: "60px 100px" }} />
            <ellipse cx="70" cy="105" rx="10" ry="5" fill={leafColor} opacity="0.7"
              className="animate-sway-reverse" style={{ transformOrigin: "60px 105px" }} />
          </g>
        )}

        {stage === "young" && (
          <g>
            {/* Trunk */}
            <line x1="60" y1="128" x2="60" y2="70" stroke={trunkColor} strokeWidth="4" strokeLinecap="round" />
            {/* Branches + leaves */}
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
            {/* Trunk */}
            <path d="M56 128 Q58 90 55 60 L65 60 Q62 90 64 128 Z" fill={trunkColor} />
            {/* Dense canopy */}
            <circle cx="60" cy="50" r="28" fill={leafColor} opacity="0.8" className="animate-sway" style={{ transformOrigin: "60px 128px" }} />
            <circle cx="45" cy="60" r="18" fill={leafColor} opacity="0.7" className="animate-sway-reverse" style={{ transformOrigin: "60px 128px" }} />
            <circle cx="75" cy="60" r="18" fill={leafColor} opacity="0.7" className="animate-sway" style={{ transformOrigin: "60px 128px", animationDelay: "0.4s" }} />
            <circle cx="60" cy="35" r="16" fill={leafColor} opacity="0.6" />
            {/* Shadow */}
            <ellipse cx="60" cy="132" rx="25" ry="4" fill="hsl(var(--foreground) / 0.08)" />
          </g>
        )}

        {stage === "fruit" && (
          <g>
            {/* Trunk */}
            <path d="M56 128 Q58 90 55 55 L65 55 Q62 90 64 128 Z" fill={trunkColor} />
            {/* Dense canopy */}
            <circle cx="60" cy="45" r="30" fill={leafColor} opacity="0.8" className="animate-sway" style={{ transformOrigin: "60px 128px" }} />
            <circle cx="42" cy="58" r="20" fill={leafColor} opacity="0.7" className="animate-sway-reverse" style={{ transformOrigin: "60px 128px" }} />
            <circle cx="78" cy="58" r="20" fill={leafColor} opacity="0.7" className="animate-sway" style={{ transformOrigin: "60px 128px", animationDelay: "0.4s" }} />
            <circle cx="60" cy="30" r="18" fill={leafColor} opacity="0.6" />
            {/* Fruits */}
            {[
              { cx: 48, cy: 38 },
              { cx: 72, cy: 42 },
              { cx: 58, cy: 28 },
              { cx: 40, cy: 52 },
              { cx: 80, cy: 50 },
            ].map((f, i) => (
              <circle key={i} cx={f.cx} cy={f.cy} r="4" fill="#F59E0B" opacity="0.9" />
            ))}
            {/* Shadow */}
            <ellipse cx="60" cy="132" rx="28" ry="5" fill="hsl(var(--foreground) / 0.08)" />
          </g>
        )}
      </svg>

      <p className="text-xs font-medium text-muted-foreground mt-1">
        {streak > 0 ? (
          <>Dia {streak} 🌿</>
        ) : (
          "Plante sua sequência de leitura"
        )}
      </p>
    </div>
  );
};

export default StreakTree;
