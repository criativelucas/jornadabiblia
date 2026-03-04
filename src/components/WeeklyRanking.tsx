import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Trophy, Crown } from "lucide-react";

const MEDAL_STYLES = [
  { border: "border-yellow-500/40", bg: "bg-yellow-500/10", icon: "🥇" },
  { border: "border-gray-400/40", bg: "bg-gray-400/10", icon: "🥈" },
  { border: "border-amber-700/40", bg: "bg-amber-700/10", icon: "🥉" },
];

interface RankedUser {
  user_id: string;
  display_name: string;
  chapters_this_week: number;
}

const WeeklyRanking = ({ currentUserId }: { currentUserId?: string }) => {
  const [ranking, setRanking] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateStr = sevenDaysAgo.toISOString().split("T")[0];

      // Get completed_days in last 7 days grouped by user
      const { data: days } = await supabase
        .from("completed_days")
        .select("user_id")
        .gte("read_date", dateStr);

      if (!days || days.length === 0) {
        setRanking([]);
        setLoading(false);
        return;
      }

      // Count per user
      const counts = new Map<string, number>();
      for (const d of days) {
        counts.set(d.user_id, (counts.get(d.user_id) || 0) + 1);
      }

      // Get profiles for those users
      const userIds = [...counts.keys()];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = new Map<string, string>();
      for (const p of profiles || []) {
        profileMap.set(p.user_id, p.display_name || "Leitor");
      }

      const ranked: RankedUser[] = [...counts.entries()]
        .map(([uid, count]) => ({
          user_id: uid,
          display_name: profileMap.get(uid) || "Leitor",
          chapters_this_week: count,
        }))
        .sort((a, b) => b.chapters_this_week - a.chapters_this_week)
        .slice(0, 10);

      setRanking(ranked);
      setLoading(false);
    };

    fetchRanking();
  }, []);

  const currentUserRank = useMemo(() => {
    if (!currentUserId) return null;
    const idx = ranking.findIndex((r) => r.user_id === currentUserId);
    return idx >= 0 ? idx + 1 : null;
  }, [ranking, currentUserId]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-card border border-border text-center">
        <Trophy className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma leitura registrada esta semana.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Crown className="w-5 h-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">Ranking Semanal</h3>
      </div>

      {/* Top 3 */}
      <div className="grid grid-cols-3 gap-2">
        {ranking.slice(0, 3).map((user, i) => (
          <div
            key={user.user_id}
            className={`p-4 rounded-2xl border text-center transition-all ${MEDAL_STYLES[i].border} ${MEDAL_STYLES[i].bg} ${
              user.user_id === currentUserId ? "ring-2 ring-primary/30" : ""
            }`}
          >
            <span className="text-2xl">{MEDAL_STYLES[i].icon}</span>
            <p className="text-xs font-bold text-foreground mt-1 truncate">{user.display_name}</p>
            <p className="text-lg font-black text-foreground">{user.chapters_this_week}</p>
            <p className="text-[10px] text-muted-foreground">capítulos</p>
          </div>
        ))}
      </div>

      {/* 4th–10th */}
      {ranking.length > 3 && (
        <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
          {ranking.slice(3).map((user, i) => (
            <div
              key={user.user_id}
              className={`flex items-center gap-3 px-4 py-3 ${
                user.user_id === currentUserId ? "bg-primary/5" : ""
              }`}
            >
              <span className="text-sm font-bold text-muted-foreground w-6 text-center">{i + 4}</span>
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">
                  {user.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground flex-grow truncate">{user.display_name}</p>
              <div className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-sm font-bold text-foreground">{user.chapters_this_week}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current user position */}
      {currentUserRank && currentUserRank > 3 && (
        <p className="text-xs text-center text-muted-foreground">
          Você está em <span className="font-bold text-foreground">{currentUserRank}º</span> lugar
        </p>
      )}
    </div>
  );
};

export default WeeklyRanking;
