import { useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { useThemeContext } from "@/contexts/ThemeContext";
import { getVerseStrongs, type StrongsEntry } from "@/services/StrongsService";

interface Props {
  verse: { number: number; text: string };
  bookId: string;
  chapter: number;
  bookTestament: "AT" | "NT";
  onClose: () => void;
}

function StrongsWordCard({ entry, T }: { entry: StrongsEntry; T: any }) {
  const [expanded, setExpanded] = useState(false);

  // Formata a definição em tópicos se houver numeração tipo "1) ... 1a) ..."
  const formatDef = (def: string) => {
    if (!def) return null;
    const lines = def
      .split(/(?=\b\d+[a-z]?\d*\))/g)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      return <p style={{ fontSize: "13px", color: T.textMuted, lineHeight: 1.7 }}>{def}</p>;
    }

    return (
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {lines.map((line, i) => {
          const isSubItem = /^\d+[a-z]/.test(line);
          return (
            <li
              key={i}
              style={{
                fontSize: isSubItem ? "12px" : "13px",
                color: isSubItem ? T.textDim : T.textMuted,
                lineHeight: 1.7,
                paddingLeft: isSubItem ? "1rem" : "0",
                borderLeft: isSubItem ? `2px solid ${T.border}` : "none",
                marginLeft: isSubItem ? "0.5rem" : "0",
                marginBottom: "2px",
              }}
            >
              {line}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div
      style={{
        borderRadius: "1rem",
        background: T.card2,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        marginBottom: "10px",
      }}
    >
      {/* Cabeçalho sempre visível */}
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          padding: "1rem",
          cursor: "pointer",
        }}
      >
        {/* Número Strong + caractere original */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: "60px",
            flexShrink: 0,
            padding: "6px 8px",
            borderRadius: "0.625rem",
            background: T.accentDim,
          }}
        >
          <span style={{ fontSize: "9px", fontWeight: 700, color: T.accent, letterSpacing: "0.05em" }}>
            {entry.num}
          </span>
          <span
            style={{
              fontSize: entry.lang === "hebrew" ? "22px" : "17px",
              fontWeight: 700,
              color: T.textPrimary,
              lineHeight: 1.3,
              direction: entry.lang === "hebrew" ? "rtl" : "ltr",
              marginTop: "2px",
            }}
          >
            {entry.lemma || entry.word}
          </span>
          {/* Transliteração — tanto hebraico quanto grego */}
          {entry.xlit && (
            <span
              style={{
                fontSize: "9px",
                color: T.textMuted,
                fontStyle: "italic",
                marginTop: "2px",
                textAlign: "center",
              }}
            >
              {entry.xlit}
            </span>
          )}
          {/* Pronúncia — só hebraico tem do pacote */}
          {entry.pron && <span style={{ fontSize: "9px", color: T.textDim, marginTop: "1px" }}>/{entry.pron}/</span>}
        </div>

        {/* Gloss + def resumida */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "15px", fontWeight: 700, color: T.textPrimary }}>{entry.word}</span>
          {entry.grammar && (
            <p style={{ fontSize: "11px", color: T.accent, marginTop: "3px", fontStyle: "italic" }}>{entry.grammar}</p>
          )}
          <p
            style={{
              fontSize: "13px",
              color: T.textMuted,
              lineHeight: 1.6,
              marginTop: "4px",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: expanded ? 999 : 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {entry.def}
          </p>
        </div>

        <ChevronDown
          size={16}
          style={{
            color: T.textDim,
            flexShrink: 0,
            marginTop: "4px",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </div>

      {/* Definição expandida completa */}
      {expanded && (
        <div
          style={{
            padding: "0 1rem 1rem",
            borderTop: `1px solid ${T.border}`,
            paddingTop: "0.75rem",
          }}
        >
          <p
            style={{
              fontSize: "9px",
              fontWeight: 700,
              color: T.accent,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "8px",
            }}
          >
            Definição completa
          </p>
          {formatDef(entry.def)}

          {entry.kjv && (
            <div style={{ marginTop: "12px" }}>
              <p
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: T.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "4px",
                }}
              >
                Traduzido como (KJV)
              </p>
              <p style={{ fontSize: "12px", color: T.textMuted, fontStyle: "italic", lineHeight: 1.6 }}>{entry.kjv}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StrongsPanel({ verse, bookId, chapter, bookTestament, onClose }: Props) {
  const { T } = useThemeContext();
  const [entries, setEntries] = useState<StrongsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setEntries([]);
    getVerseStrongs(bookId, chapter, verse.number, bookTestament)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [bookId, chapter, verse.number, bookTestament]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "rgba(0,0,0,0.5)",
        }}
      />

      {/* Slide-up panel */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 101,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          background: T.card,
          borderRadius: "1.25rem 1.25rem 0 0",
          border: `1px solid ${T.border}`,
          borderBottom: "none",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
          animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 0" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "9999px", background: T.textDim, opacity: 0.5 }} />
        </div>

        {/* Header */}
        <div
          style={{
            padding: "0.75rem 1.25rem 0.875rem",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexShrink: 0,
            gap: "12px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: T.accent,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "6px",
              }}
            >
              Strong's Lexicon · Versículo {verse.number} · {bookTestament === "AT" ? "Hebraico" : "Grego"}
            </p>
            {/* Versículo destacado */}
            <p
              style={{
                fontSize: "15px",
                color: T.textPrimary,
                lineHeight: 1.7,
                fontStyle: "italic",
              }}
            >
              {verse.text}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "9999px",
              background: T.card2,
              border: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={14} color={T.textMuted} />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            overflowY: "auto",
            flex: 1,
            padding: "1.25rem",
            paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
          }}
        >
          {/* Loading skeleton */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    height: "88px",
                    borderRadius: "1rem",
                    background: T.card2,
                    opacity: 0.6,
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          )}

          {/* No data */}
          {!loading && entries.length === 0 && (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                borderRadius: "1rem",
                background: T.card2,
              }}
            >
              <p style={{ fontSize: "14px", color: T.textMuted }}>
                Análise Strong's não disponível para este versículo.
              </p>
            </div>
          )}

          {/* Word cards */}
          {!loading &&
            entries.length > 0 &&
            entries.map((entry, i) => <StrongsWordCard key={`${entry.num}-${i}`} entry={entry} T={T} />)}
        </div>
      </div>
    </>
  );
}
