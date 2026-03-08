import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Zap, BookOpen } from "lucide-react";
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
      const { data } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: Entry[] | null }> } } } })
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
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 animate-pulse" style={{ borderRadius: "0.875rem", background: T.card2 }}>
            <div className="w-8 h-8" style={{ borderRadius: "9999px", background: T.border }} />
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
      <div className="p-8 text-center text-sm" style={{ color: T.textMuted }}>
        Nenhuma leitura registrada essa semana ainda. Seja o primeiro! 📖
      </div>
    );
  }

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);
  const myRank = entries.findIndex((e) => e.user_id === user?.id);

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-3 text-[10px] mb-1" style={{ color: T.textMuted }}>
        <span className="flex items-center gap-1">
          <BookOpen className="w-3 h-3" /> capítulo = 10 pts
        </span>
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3" style={{ color: T.accent }} /> resposta certa = 25 pts
        </span>
      </div>

      {/* Top 3 */}
      <div className="flex items-end justify-center gap-2 mb-4">
        {topThree[1] && (
          <div className="flex flex-col items-center gap-1 w-[30%]">
            <RankAvatar entry={topThree[1]} size="md" />
            <span className="text-lg">🥈</span>
            <p className="text-[10px] font-semibold truncate max-w-full text-center" style={{ color: T.textPrimary }}>{topThree[1].display_name}</p>
            <p className="text-xs font-bold" style={{ color: T.accent }}>{topThree[1].weekly_points} pts</p>
          </div>
        )}
        {topThree[0] && (
          <div className="flex flex-col items-center gap-1 w-[36%] -mb-1">
            <div className="relative">
              <RankAvatar entry={topThree[0]} size="lg" />
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xl">👑</span>
            </div>
            <span className="text-xl">🥇</span>
            <p className="text-[11px] font-bold truncate max-w-full text-center" style={{ color: T.textPrimary }}>{topThree[0].display_name}</p>
            <p className="text-sm font-bold" style={{ color: T.accent }}>{topThree[0].weekly_points} pts</p>
          </div>
        )}
        {topThree[2] && (
          <div className="flex flex-col items-center gap-1 w-[30%]">
            <RankAvatar entry={topThree[2]} size="md" />
            <span className="text-lg">🥉</span>
            <p className="text-[10px] font-semibold truncate max-w-full text-center" style={{ color: T.textPrimary }}>{topThree[2].display_name}</p>
            <p className="text-xs font-bold" style={{ color: T.accent }}>{topThree[2].weekly_points} pts</p>
          </div>
        )}
      </div>

      {/* LEVEL 2 — list items */}
      {rest.length > 0 && (
        <div className="space-y-1.5">
          {rest.map((entry, i) => {
            const rank = i + 4;
            const isMe = entry.user_id === user?.id;
            return (
              <div
                key={entry.user_id}
                className="flex items-center gap-3 px-3 py-2.5 transition-all duration-300"
                style={{
                  borderRadius: "0.875rem",
                  background: isMe ? T.accentDim : T.card2,
                  border: `1px solid ${isMe ? T.borderAc : "transparent"}`,
                }}
              >
                <span className="text-xs font-bold w-5 text-center" style={{ color: T.textMuted }}>{rank}</span>
                <RankAvatar entry={entry} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: isMe ? T.accent : T.textPrimary }}>
                    {entry.display_name} {isMe && "(você)"}
                  </p>
                  <p className="text-[9px]" style={{ color: T.textMuted }}>
                    {entry.chapters_this_week} cap. · +{entry.quiz_bonus} quiz
                  </p>
                </div>
                <p className="text-xs font-bold" style={{ color: isMe ? T.accent : T.textPrimary }}>
                  {entry.weekly_points} pts
                </p>
              </div>
            );
          })}
        </div>
      )}

      {myRank >= 3 && (
        <div className="mt-2 text-center text-xs" style={{ color: T.textMuted }}>
          Sua posição: <span className="font-bold" style={{ color: T.textPrimary }}>#{myRank + 1}</span>
        </div>
      )}

      <p className="text-center text-[10px] pt-1" style={{ color: T.textMuted }}>🔄 Ranking reseta toda segunda-feira</p>
    </div>
  );
}

function RankAvatar({ entry, size }: { entry: Entry; size: "sm" | "md" | "lg" }) {
  const { T } = useThemeContext();
  const sz = size === "lg" ? "w-14 h-14 text-lg" : size === "md" ? "w-10 h-10 text-sm" : "w-7 h-7 text-xs";
  return (
    <div
      className={`${sz} flex items-center justify-center font-bold overflow-hidden shrink-0`}
      style={{ borderRadius: "9999px", background: T.accentDim, border: `1.5px solid ${T.borderAc}`, color: T.accent }}
    >
      {entry.avatar_url ? (
        <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        (entry.display_name || "?").charAt(0).toUpperCase()
      )}
    </div>
  );
}
