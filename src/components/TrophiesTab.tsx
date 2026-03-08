import { useState } from "react";
import { BookOpen, Check, Award } from "lucide-react";
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

      {/* Filter pills — LEVEL 3: rounded-full */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="flex-shrink-0 px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-300"
            style={{
              borderRadius: "9999px",
              ...(filter === f.id
                ? { background: T.accent, color: T.page }
                : { background: T.card2, color: T.textMuted, border: `1px solid ${T.border}` }
              ),
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter === "done" && completedBooks.length === 0 ? (
        <div
          className="p-8 text-center"
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: "1.25rem",
            clipPath: "polygon(0 0, calc(100% - 1rem) 0, 100% 1rem, 100% 100%, 0 100%)",
          }}
        >
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: T.textDim }} />
          <p className="text-sm mb-4" style={{ color: T.textMuted }}>Nenhum livro concluído ainda.</p>
          {onNavigate && (
            <button
              onClick={() => onNavigate("plans")}
              className="px-5 py-2.5 text-sm font-bold hover:opacity-90 transition-all duration-300"
              style={{ borderRadius: "9999px", background: T.accent, color: T.page }}
            >
              Começar pelo Gênesis →
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
          {filtered.map((book) => {
            const read = getBookProgress(book.name);
            const isDone = read >= book.chapters;
            const progress = Math.min(100, (read / book.chapters) * 100);
            return (
              <button
                key={book.name}
                onClick={() => isDone && onBookClick?.(book.name)}
                className="relative text-center transition-all duration-300"
                style={{
                  borderRadius: "0.875rem",
                  overflow: "hidden",
                  background: isDone ? T.accentDim : T.card,
                  border: `1px solid ${isDone ? T.borderAc : T.border}`,
                  cursor: isDone ? "pointer" : "default",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "120px",
                }}
              >
                {/* Check badge for completed — rounded-full */}
                {isDone && (
                  <div
                    style={{
                      position: "absolute",
                      top: "0.5rem",
                      right: "0.5rem",
                      width: "1.25rem",
                      height: "1.25rem",
                      borderRadius: "9999px",
                      background: T.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={10} color={T.page} />
                  </div>
                )}

                {/* Content */}
                <div style={{ padding: "1rem", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={28} color={isDone ? T.accent : T.textDim} />
                  <p className="text-[10px] font-medium mt-1.5 truncate w-full" style={{ color: T.textPrimary }}>{book.name}</p>
                  <p className="text-[9px]" style={{ color: T.textMuted }}>{read}/{book.chapters}</p>
                  <span
                    style={{
                      borderRadius: "9999px",
                      padding: "2px 8px",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      background: T.card2,
                      color: T.textMuted,
                      border: `1px solid ${T.border}`,
                      marginTop: "0.375rem",
                      display: "inline-block",
                    }}
                  >
                    {book.testament}
                  </span>
                </div>

                {/* Progress bar — always at bottom */}
                {!isDone && (
                  <div style={{ height: "3px", background: T.card2 }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: T.accent, transition: "width 0.5s" }} />
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
