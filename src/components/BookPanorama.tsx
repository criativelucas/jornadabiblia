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
    <div className="space-y-5">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 hover:opacity-70 transition-opacity" style={{ color: T.textMuted }}>
        <ArrowLeft size={16} />
        <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
      </button>

      {/* Hero */}
      <div className="flex flex-col items-center text-center gap-3 pt-2">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: T.accentDim, border: `1px solid ${T.borderAc}` }}>
          {book.emoji}
        </div>
        <div>
          <h2 className="text-2xl font-black" style={{ color: T.textPrimary, letterSpacing: "-0.04em" }}>{book.name}</h2>
          <p className="text-xs mt-1" style={{ color: T.textMuted }}>
            {book.testament} · {book.chapters} capítulos · {book.category}
          </p>
        </div>
        {/* Progress */}
        <div className="w-full max-w-xs">
          <div style={{ background: T.card2, borderRadius: "9999px", height: "8px", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: "9999px", width: `${percent}%`, background: T.accent, transition: "width 0.8s cubic-bezier(0.65,0.05,0,1)" }} />
          </div>
          <p style={{ color: T.textMuted, fontSize: "11px", marginTop: "4px" }}>
            {chaptersRead} de {book.chapters} capítulos lidos
          </p>
        </div>
      </div>

      {summary && (
        <>
          {/* Panorama */}
          <div>
            <Eyebrow accent>Panorama</Eyebrow>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: T.textPrimary }}>{summary.summary}</p>
            <div className="flex gap-3 mt-3 text-xs" style={{ color: T.textMuted }}>
              <span className="flex items-center gap-1"><Calendar size={11} /> {summary.period}</span>
              <span className="flex items-center gap-1"><PenTool size={11} /> {summary.author}</span>
            </div>
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
            <p className="text-sm mt-2" style={{ color: T.textPrimary }}>
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

      {/* CTA */}
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
  );
}
