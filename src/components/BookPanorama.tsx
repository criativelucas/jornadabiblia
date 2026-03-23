import { ArrowLeft, Clock, Lightbulb, BookOpen } from "lucide-react";
import { useThemeContext, Eyebrow } from "@/contexts/ThemeContext";
import { getBookSummary } from "@/data/bookSummaries";
import type { BibleBook } from "@/data/bibleBooks";

interface Props {
  book: BibleBook;
  chaptersRead: number;
  onContinue: () => void;
  onBack: () => void;
  onNavigateBook?: (bookName: string) => void;
}

export default function BookPanorama({ book, chaptersRead, onContinue, onBack, onNavigateBook }: Props) {
  const { T } = useThemeContext();
  const summary = getBookSummary(book.id);
  const percent = book.chapters > 0 ? Math.round((chaptersRead / book.chapters) * 100) : 0;
  const circumference = 2 * Math.PI * 30;

  return (
    <div style={{ minHeight: "calc(100vh - 8rem)" }}>
      {/* Sticky header with compact "Ler" button */}
      <div
        className="flex items-center gap-3"
        style={{
          position: "sticky", top: 0, zIndex: 20,
          background: T.page,
          borderBottom: `1px solid ${T.border}`,
          padding: "0.875rem 0",
          marginBottom: "1rem",
        }}
      >
        <button onClick={onBack} style={{ color: T.textMuted, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <ArrowLeft size={18} />
        </button>
        <span className="flex-1 truncate" style={{ fontWeight: 900, fontSize: "15px", color: T.textPrimary, letterSpacing: "-0.02em" }}>
          {book.name}
        </span>
        <button
          onClick={onContinue}
          style={{
            padding: "0.5rem 1.25rem",
            background: T.accent, color: T.page,
            border: "none", borderRadius: "9999px",
            fontWeight: 900, fontSize: "13px", cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Ler →
        </button>
      </div>

      {/* Content */}
      <div style={{ paddingBottom: "6rem" }} className="space-y-4">

        {/* Hero with progress ring */}
        <div
          className="flex items-center gap-5"
          style={{
            padding: "1.25rem",
            background: T.card,
            borderRadius: "0.875rem",
            border: `1px solid ${T.border}`,
          }}
        >
          {/* SVG progress ring */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="30" fill="none" stroke={T.card2} strokeWidth="5" />
              <circle
                cx="36" cy="36" r="30" fill="none"
                stroke={T.accent} strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={`${circumference * (1 - percent / 100)}`}
                transform="rotate(-90 36 36)"
                style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.65,0.05,0,1)" }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: 900, color: T.accent, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {percent}%
              </span>
            </div>
          </div>

          {/* Book info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ fontSize: "9px", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {book.testament}
              </span>
              <span style={{ fontSize: "9px", color: T.textDim }}>·</span>
              <span style={{ fontSize: "9px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {summary?.category || book.category}
              </span>
            </div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: T.textPrimary, letterSpacing: "-0.04em", lineHeight: 1 }}>
              {book.name}
            </h1>
            {summary && (
              <p className="truncate" style={{ fontSize: "12px", color: T.textMuted, marginTop: "4px" }}>
                {chaptersRead}/{book.chapters} caps · {summary.author} · {summary.period}
              </p>
            )}
          </div>
        </div>

        {summary && (
          <>
            {/* Summary */}
            <div style={{ borderRadius: "0.875rem", padding: "1rem", background: T.card, border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: "14px", color: T.textPrimary, lineHeight: 1.7 }}>{summary.summary}</p>
            </div>

            {/* Historical context */}
            <div style={{ borderRadius: "0.875rem", padding: "1rem", background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Clock size={12} color={T.accent} />
                <span style={{ fontSize: "10px", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>Contexto Histórico</span>
              </div>
              <p style={{ fontSize: "13px", color: T.textMuted, lineHeight: 1.65 }}>{summary.historicalContext}</p>
            </div>

            {/* Why it matters */}
            <div style={{ borderRadius: "0.875rem", padding: "1rem", background: T.accentDim, border: `1px solid ${T.borderAc}` }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb size={12} color={T.accent} />
                <span style={{ fontSize: "10px", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>Por que importa hoje</span>
              </div>
              <p style={{ fontSize: "13px", color: T.textPrimary, lineHeight: 1.65 }}>{summary.whyItMatters}</p>
            </div>

            {/* Themes */}
            <div>
              <p style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Temas</p>
              <div className="flex flex-wrap gap-1.5">
                {summary.themes.map(t => (
                  <span key={t} style={{ borderRadius: "9999px", padding: "5px 12px", fontSize: "11px", fontWeight: 700, background: T.accentDim, color: T.accent, border: `1px solid ${T.borderAc}` }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Characters as chips with initial */}
            <div>
              <p style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Personagens</p>
              <div className="flex flex-wrap gap-2">
                {summary.characters.map(c => (
                  <div key={c} className="flex items-center gap-1.5" style={{ padding: "4px 10px 4px 4px", borderRadius: "9999px", background: T.card, border: `1px solid ${T.border}` }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "9999px", background: T.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 900, color: T.accent }}>{c[0]}</div>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: T.textPrimary }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key verse */}
            <div style={{ borderRadius: "0.875rem", padding: "1rem", background: T.card2, borderLeft: `3px solid ${T.accent}` }}>
              <p style={{ fontSize: "14px", color: T.textPrimary, fontStyle: "italic", lineHeight: 1.7 }}>"{summary.keyVerse}"</p>
              <p style={{ fontSize: "11px", color: T.accent, fontWeight: 700, marginTop: "8px" }}>— {summary.keyVerseRef}</p>
            </div>

            {/* Connected books */}
            {summary.connectedBooks.length > 0 && (
              <div>
                <p style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Livros relacionados</p>
                <div className="flex gap-2 flex-wrap">
                  {summary.connectedBooks.map(b => (
                    <button
                      key={b}
                      onClick={() => onNavigateBook?.(b)}
                      style={{ padding: "5px 12px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700, background: T.card, color: T.textMuted, border: `1px solid ${T.border}`, cursor: "pointer" }}
                    >
                      {b} →
                    </button>
                  ))}
                </div>
              </div>
            )}
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
