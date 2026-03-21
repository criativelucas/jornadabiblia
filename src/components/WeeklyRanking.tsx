import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Trophy } from "lucide-react";
import { useThemeContext } from "@/contexts/ThemeContext";

interface Entry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  weekly_points: number;
  chapters_this_week: number;
  quiz_bonus: number;
}

export default function WeeklyRanking() {
  const { user } = useAuth();
  const { T } = useThemeContext();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("weekly_ranking")
        .select("*")
        .order("weekly_points", { ascending: false })
        .limit(20);
      setEntries(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 animate-pulse" style={{ borderRadius: "0.75rem", background: T.card2 }}>
            <div className="w-6 h-6" style={{ borderRadius: "9999px", background: T.border }} />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 rounded" style={{ background: T.border }} />
              <div className="h-2 w-16 rounded" style={{ background: T.border }} />
            </div>
            <div className="h-4 w-10 rounded" style={{ background: T.border }} />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
        <Trophy size={32} style={{ color: T.textDim, margin: "0 auto 0.75rem" }} />
        <p style={{ fontWeight: 700, fontSize: "14px", color: T.textPrimary }}>
          Seja o primeiro desta semana
        </p>
        <p style={{ fontSize: "12px", color: T.textMuted, marginTop: "4px" }}>
          Leia um capítulo hoje para entrar no ranking
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {entries.map((entry, index) => {
        const isMe = entry.user_id === user?.id;
        const isFirst = index === 0;
        return (
          <div
            key={entry.user_id}
            style={{
              display: "flex", alignItems: "center", gap: "0.875rem",
              padding: "0.75rem",
              borderRadius: "0.75rem",
              background: isMe ? T.accentDim : "transparent",
              border: `1px solid ${isMe ? T.borderAc : "transparent"}`,
              transition: "background 0.2s",
            }}
          >
            {/* Position */}
            <span style={{
              width: "24px", textAlign: "center", flexShrink: 0,
              fontSize: isFirst ? "16px" : "13px",
              fontWeight: 900,
              color: isFirst ? T.accent : T.textMuted,
            }}>
              {index + 1}
            </span>

            {/* Avatar */}
            <div style={{
              width: "36px", height: "36px", borderRadius: "9999px",
              overflow: "hidden", flexShrink: 0,
              border: `2px solid ${isFirst ? T.accent : T.border}`,
            }}>
              {entry.avatar_url ? (
                <img src={entry.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  background: T.accentDim,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontSize: "14px", color: T.accent,
                }}>
                  {(entry.display_name || "?")[0]?.toUpperCase()}
                </div>
              )}
            </div>

            {/* Name + details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontWeight: isMe ? 900 : 700,
                fontSize: "14px",
                color: isMe ? T.accent : T.textPrimary,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {entry.display_name} {isMe && "(você)"}
              </p>
              <p style={{ fontSize: "11px", color: T.textMuted }}>
                {entry.chapters_this_week} caps · {entry.quiz_bonus} pts quiz
              </p>
            </div>

            {/* Total points */}
            <span style={{
              fontWeight: 900, fontSize: "16px",
              color: isFirst ? T.accent : T.textPrimary,
              letterSpacing: "-0.03em", flexShrink: 0,
            }}>
              {entry.weekly_points}
            </span>
          </div>
        );
      })}
    </div>
  );
}
