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
        borderRadius: "0.875rem",
        background: T.card2,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        marginBottom: "10px",
      }}
    >
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.875rem",
          padding: "0.875rem",
          cursor: "pointer",
        }}
      >
        {/* Bloco da palavra original */}
        <div
          style={{
            flexShrink: 0,
            width: "72px",
            minHeight: "72px",
            borderRadius: "0.75rem",
            background: T.accentDim,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 4px",
            gap: "3px",
          }}
        >
          <span style={{ fontSize: "8px", fontWeight: 900, color: T.accent, letterSpacing: "0.04em" }}>
            {entry.num}
          </span>
          <span
            style={{
              fontSize: entry.lang === "hebrew" ? "20px" : "17px",
              fontWeight: 700,
              color: T.textPrimary,
              lineHeight: 1.1,
              direction: entry.lang === "hebrew" ? "rtl" : "ltr",
              fontFamily: "serif",
              textAlign: "center",
            }}
          >
            {entry.lemma || entry.word}
          </span>
          {entry.xlit && (
            <span
              style={{
                fontSize: "9px",
                color: T.accent,
                fontStyle: "italic",
                textAlign: "center",
                lineHeight: 1,
                maxWidth: "68px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {entry.xlit}
            </span>
          )}
          {entry.pron && (
            <span style={{ fontSize: "8px", color: T.textDim, textAlign: "center" }}>/{entry.pron}/</span>
          )}
        </div>

        {/* Conteúdo textual */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Título = xlit (transliteração), não kjv_def */}
          <p
            style={{
              fontWeight: 900,
              fontSize: "15px",
              color: T.textPrimary,
              letterSpacing: "-0.02em",
              marginBottom: "4px",
            }}
          >
            {entry.xlit || entry.lemma || entry.word}
          </p>
          {entry.grammar && (
            <p style={{ fontSize: "11px", color: T.accent, fontStyle: "italic", marginBottom: "4px" }}>
              {entry.grammar}
            </p>
          )}
          <p
            style={{
              fontSize: "13px",
              color: T.textMuted,
              lineHeight: 1.6,
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

      {expanded && (
        <div
          style={{
            padding: "0 0.875rem 0.875rem",
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
              <p style={{ fontSize: "12px", color: T.textMuted, fontStyle: "italic", lineHeight: 1.6 }}>
                {entry.kjv}
              </p>
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
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "rgba(0,0,0,0.5)",
        }}
      />

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
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 0" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "9999px", background: T.textDim, opacity: 0.5 }} />
        </div>

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

        <div
          style={{
            overflowY: "auto",
            flex: 1,
            padding: "1.25rem",
            paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
          }}
        >
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

          {!loading &&
            entries.length > 0 &&
            entries.map((entry, i) => <StrongsWordCard key={`${entry.num}-${i}`} entry={entry} T={T} />)}
        </div>
      </div>
    </>
  );
}
