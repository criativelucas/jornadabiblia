import { BookOpen, ArrowLeft, Calendar, PenTool } from "lucide-react";
import { useThemeContext, Eyebrow } from "@/contexts/ThemeContext";
import { getBookSummary } from "@/data/bookSummaries";
import type { BibleBook } from "@/data/bibleBooks";

interface Props {
  book: BibleBook;
  chaptersRead: number;
  onContinue: () => void;
  onBack: () => void;
}

export default function BookPanorama({ book, chaptersRead, onContinue, onBack }: Props) {
  const { T } = useThemeContext();
  const summary = getBookSummary(book.id);
  const percent = book.chapters > 0 ? (chaptersRead / book.chapters) * 100 : 0;

  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 8rem)" }}>
      {/* Scrollable content */}
      <div style={{ paddingBottom: "5rem" }} className="space-y-5">
        {/* Back */}
        <button onClick={onBack} className="flex items-center gap-2 hover:opacity-70 transition-opacity" style={{ color: T.textMuted }}>
          <ArrowLeft size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
        </button>

        {/* Title + meta */}
        <div>
          <p style={{ fontSize: "10px", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {book.testament} · {book.category}
          </p>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 900, color: T.textPrimary, letterSpacing: "-0.04em", lineHeight: 1, marginTop: "4px" }}>
            {book.name}
          </h1>
          {summary && (
            <p style={{ fontSize: "13px", color: T.textMuted, marginTop: "4px" }}>por {summary.author} · {summary.period}</p>
          )}
        </div>

        {/* Progress */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", color: T.textMuted, fontWeight: 600 }}>Progresso</span>
            <span style={{ fontSize: "11px", color: T.accent, fontWeight: 700 }}>{chaptersRead}/{book.chapters} capítulos</span>
          </div>
          <div style={{ height: "6px", borderRadius: "9999px", background: T.card2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${percent}%`, background: T.accent, borderRadius: "9999px", transition: "width 0.8s ease" }} />
          </div>
        </div>

        {summary && (
          <>
            {/* Summary — ABOVE the button */}
            <div style={{ borderRadius: "0.875rem", padding: "1rem", background: T.card, border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: "14px", color: T.textPrimary, lineHeight: 1.65 }}>
                {summary.summary}
              </p>
            </div>

            {/* Themes */}
            <div>
              <Eyebrow accent>Temas Principais</Eyebrow>
              <div className="flex flex-wrap gap-2 mt-2">
                {summary.themes.map(t => (
                  <span key={t} style={{ borderRadius: "9999px", padding: "4px 12px", fontSize: "11px", fontWeight: 700, background: T.accentDim, color: T.accent, border: `1px solid ${T.borderAc}` }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Characters */}
            <div>
              <Eyebrow accent>Personagens</Eyebrow>
              <p className="text-sm mt-2" style={{ color: T.textMuted }}>
                {summary.characters.join(" · ")}
              </p>
            </div>

            {/* Key Verse */}
            <div style={{ borderRadius: "0.875rem", padding: "1rem", background: T.card2, borderLeft: `3px solid ${T.accent}` }}>
              <p style={{ color: T.textPrimary, fontStyle: "italic", fontSize: "14px", lineHeight: 1.6 }}>
                "{summary.keyVerse}"
              </p>
              <p style={{ color: T.accent, fontSize: "11px", fontWeight: 700, marginTop: "6px" }}>
                — {summary.keyVerseRef}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Fixed bottom CTA */}
      <div style={{
        position: "sticky", bottom: 0, left: 0, right: 0,
        padding: "1rem 0",
        paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
        background: `linear-gradient(to top, ${T.page} 80%, transparent)`,
      }}>
        <button
          onClick={onContinue}
          style={{
            width: "100%", padding: "1rem",
            background: T.accent, color: T.page,
            fontWeight: 900, fontSize: "15px",
            border: "none", borderRadius: "0.875rem",
            clipPath: "polygon(0 0, calc(100% - 0.75rem) 0, 100% 0.75rem, 100% 100%, 0 100%)",
            cursor: "pointer", letterSpacing: "-0.02em",
          }}
        >
          Ler Capítulos →
        </button>
      </div>
    </div>
  );
}
