import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { bibleBooks, getReadChaptersByBook } from "@/data/bibleBooks";

interface Props {
  completedDays: Set<string>;
  allDays: string[];
  months: string[][];
}

const NextAchievement = ({ completedDays, allDays, months }: Props) => {
  const next = useMemo(() => {
    const readChapters = getReadChaptersByBook(completedDays, allDays, months);
    let best: { name: string; read: number; total: number; pct: number } | null = null;

    for (const book of bibleBooks) {
      const read = readChapters.get(book.name)?.size || 0;
      if (read >= book.chapters) continue; // already completed
      if (read === 0) continue; // not started
      const pct = Math.round((read / book.chapters) * 100);
      if (!best || pct > best.pct) {
        best = { name: book.name, read, total: book.chapters, pct };
      }
    }
    return best;
  }, [completedDays, allDays, months]);

  if (!next) return null;

  const remaining = next.total - next.read;

  return (
    <div className="mb-5 p-4 rounded-2xl border border-primary/20 bg-primary/5 transition-transform duration-150 hover:scale-[1.01]">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-primary uppercase tracking-wider">
          Próxima conquista
        </span>
      </div>
      <p className="text-sm font-semibold text-foreground">
        {next.name}{" "}
        <span className="text-muted-foreground font-normal">
          — {remaining === 1 ? "falta 1 capítulo" : `faltam ${remaining} capítulos`}
        </span>
      </p>
      <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700 progress-shimmer"
          style={{ width: `${next.pct}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1 text-right">{next.pct}%</p>
    </div>
  );
};

export default NextAchievement;
