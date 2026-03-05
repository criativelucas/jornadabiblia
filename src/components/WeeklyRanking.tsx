import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Zap, BookOpen } from "lucide-react";

interface Entry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  weekly_points: number;
  chapters_this_week: number;
  quiz_bonus: number;
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function WeeklyRanking() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("weekly_ranking")
        .select("*")
        .order("weekly_points", { ascending: false })
        .limit(20);
      setEntries((data as unknown as Entry[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-2 w-16 bg-muted rounded" />
            </div>
            <div className="h-4 w-10 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Nenhuma leitura registrada essa semana ainda. Seja o primeiro! 📖
      </div>
    );
  }

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);
  const myRank = entries.findIndex((e) => e.user_id === user?.id);

  return (
    <div className="p-4 space-y-3">
      {/* Legenda de pontuação */}
      <div className="flex gap-3 text-[10px] text-muted-foreground mb-1">
        <span className="flex items-center gap-1">
          <BookOpen className="w-3 h-3" /> capítulo = 10 pts
        </span>
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-primary" /> resposta certa = 25 pts
        </span>
      </div>

      {/* Top 3 destaque */}
      <div className="flex items-end justify-center gap-2 mb-4">
        {/* 2º lugar */}
        {topThree[1] && (
          <div className="flex flex-col items-center gap-1 w-[30%]">
            <Avatar entry={topThree[1]} size="md" />
            <span className="text-lg">🥈</span>
            <p className="text-[10px] font-semibold text-foreground truncate max-w-full text-center">
              {topThree[1].display_name}
            </p>
            <p className="text-xs font-bold text-primary">{topThree[1].weekly_points} pts</p>
          </div>
        )}
        {/* 1º lugar */}
        {topThree[0] && (
          <div className="flex flex-col items-center gap-1 w-[36%] -mb-1">
            <div className="relative">
              <Avatar entry={topThree[0]} size="lg" />
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xl">👑</span>
            </div>
            <span className="text-xl">🥇</span>
            <p className="text-[11px] font-bold text-foreground truncate max-w-full text-center">
              {topThree[0].display_name}
            </p>
            <p className="text-sm font-bold text-primary">{topThree[0].weekly_points} pts</p>
          </div>
        )}
        {/* 3º lugar */}
        {topThree[2] && (
          <div className="flex flex-col items-center gap-1 w-[30%]">
            <Avatar entry={topThree[2]} size="md" />
            <span className="text-lg">🥉</span>
            <p className="text-[10px] font-semibold text-foreground truncate max-w-full text-center">
              {topThree[2].display_name}
            </p>
            <p className="text-xs font-bold text-primary">{topThree[2].weekly_points} pts</p>
          </div>
        )}
      </div>

      {/* Restante */}
      {rest.length > 0 && (
        <div className="space-y-1.5">
          {rest.map((entry, i) => {
            const rank = i + 4;
            const isMe = entry.user_id === user?.id;
            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  isMe ? "bg-primary/10 border-primary/30" : "bg-muted/20 border-transparent"
                }`}
              >
                <span className="text-xs font-bold text-muted-foreground w-5 text-center">{rank}</span>
                <Avatar entry={entry} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                    {entry.display_name} {isMe && "(você)"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {entry.chapters_this_week} cap. · +{entry.quiz_bonus} quiz
                  </p>
                </div>
                <p className={`text-xs font-bold ${isMe ? "text-primary" : "text-foreground"}`}>
                  {entry.weekly_points} pts
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Minha posição se fora do top */}
      {myRank >= 3 && (
        <div className="mt-2 text-center text-xs text-muted-foreground">
          Sua posição: <span className="font-bold text-foreground">#{myRank + 1}</span>
        </div>
      )}

      {/* Reset info */}
      <p className="text-center text-[10px] text-muted-foreground pt-1">🔄 Ranking reseta toda segunda-feira</p>
    </div>
  );
}

// ─── Avatar helper ────────────────────────────────────────────────────────────
function Avatar({ entry, size }: { entry: Entry; size: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-14 h-14 text-lg" : size === "md" ? "w-10 h-10 text-sm" : "w-7 h-7 text-xs";
  return (
    <div
      className={`${sz} rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary overflow-hidden shrink-0`}
    >
      {entry.avatar_url ? (
        <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        (entry.display_name || "?").charAt(0).toUpperCase()
      )}
    </div>
  );
}
