import { useState } from "react";
import { BookOpen, CheckCircle2, Award } from "lucide-react";
import { bibleBooks, getReadChaptersByBook } from "@/data/bibleBooks";
import { useThemeContext } from "@/contexts/ThemeContext";
import type { SectionId } from "./AppSidebar";

interface Props {
  completedDays: Set<string>;
  allDays: string[];
  months: string[][];
  onBookClick?: (bookName: string) => void;
  onNavigate?: (section: SectionId) => void;
}
type Filter = "all" | "AT" | "NT" | "done";

const TrophiesTab = ({ completedDays, allDays, months, onBookClick, onNavigate }: Props) => {
  const { T } = useThemeContext();
  const [filter, setFilter] = useState<Filter>("all");
  const readChapters = getReadChaptersByBook(completedDays, allDays, months);

  const getBookProgress = (bookName: string) => readChapters.get(bookName)?.size || 0;
  const completedBooks = bibleBooks.filter((b) => getBookProgress(b.name) >= b.chapters);

  const filtered = bibleBooks.filter((b) => {
    if (filter === "AT") return b.testament === "AT";
    if (filter === "NT") return b.testament === "NT";
    if (filter === "done") return getBookProgress(b.name) >= b.chapters;
    return true;
  });

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "AT", label: "AT" },
    { id: "NT", label: "NT" },
    { id: "done", label: "Concluídos" },
  ];

  const clipCard = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: "1.25rem",
    clipPath: "polygon(0 0, calc(100% - 1rem) 0, 100% 1rem, 100% 100%, 0 100%)",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black flex items-center gap-2" style={{ color: T.textPrimary, letterSpacing: "-0.03em" }}>
          <Award className="w-5 h-5" style={{ color: T.accent }} />
          Troféus
        </h3>
        <span className="font-black text-lg" style={{ color: T.accent }}>
          {completedBooks.length}
          <span className="font-normal text-sm" style={{ color: T.textMuted }}>/66</span>
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
            style={
              filter === f.id
                ? { background: T.accent, color: T.page }
                : { background: T.card2, color: T.textMuted, border: `1px solid ${T.border}` }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter === "done" && completedBooks.length === 0 ? (
        <div className="p-8 text-center" style={clipCard}>
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: T.textDim }} />
          <p className="text-sm mb-4" style={{ color: T.textMuted }}>Nenhum livro concluído ainda.</p>
          {onNavigate && (
            <button onClick={() => onNavigate("plans")} className="px-5 py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-all" style={{ background: T.accent, color: T.page }}>
              Começar pelo Gênesis →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {filtered.map((book) => {
            const read = getBookProgress(book.name);
            const isDone = read >= book.chapters;
            const progress = Math.min(100, (read / book.chapters) * 100);
            return (
              <button
                key={book.name}
                onClick={() => isDone && onBookClick?.(book.name)}
                className="relative p-3 text-center transition-all"
                style={{
                  ...clipCard,
                  background: isDone ? T.accentDim : T.card,
                  border: `1px solid ${isDone ? T.borderAc : T.border}`,
                  cursor: isDone ? "pointer" : "default",
                }}
              >
                {isDone && <CheckCircle2 className="absolute top-1.5 right-1.5 w-3.5 h-3.5" style={{ color: T.accent }} />}
                <BookOpen className="w-6 h-6 mx-auto" style={{ color: isDone ? T.accent : T.textDim }} />
                <p className="text-[10px] font-medium mt-1.5 truncate" style={{ color: T.textPrimary }}>{book.name}</p>
                <p className="text-[9px]" style={{ color: T.textMuted }}>{read}/{book.chapters}</p>
                <div className="mt-1">
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: T.card2, color: T.textMuted }}>
                    {book.testament}
                  </span>
                </div>
                {!isDone && (
                  <div className="h-1 w-full rounded-full overflow-hidden mt-1.5" style={{ background: T.card2 }}>
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: T.accent }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrophiesTab;
