import { useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { useThemeContext } from "@/contexts/ThemeContext";
import { getVerseStrongs, lookupStrongsAsync, type StrongsEntry } from "@/services/StrongsService";

interface Props {
  verse: { number: number; text: string };
  bookId: string;
  chapter: number;
  bookTestament: "AT" | "NT";
  onClose: () => void;
}

function StrongsWordCard({ entry, T }: { entry: StrongsEntry; T: any }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onClick={() => setExpanded((e) => !e)}
      style={{
        borderRadius: "0.875rem",
        background: T.card2,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.2s",
      }}
      className="ln4-glow"
    >
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0.75rem 0.875rem" }}>
        {/* Strong number + lemma */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: "52px",
            flexShrink: 0,
            padding: "4px 6px",
            borderRadius: "0.625rem",
            background: T.accentDim,
          }}
        >
          <span style={{ fontSize: "9px", fontWeight: 700, color: T.accent, letterSpacing: "0.04em" }}>
            {entry.num}
          </span>
          <span
            style={{
              fontSize: entry.lang === "hebrew" ? "18px" : "15px",
              fontWeight: 700,
              color: T.textPrimary,
              lineHeight: 1.2,
              direction: entry.lang === "hebrew" ? "rtl" : "ltr",
            }}
          >
            {entry.lemma || entry.word}
          </span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: T.textPrimary }}>{entry.word}</span>
            {entry.xlit && (
              <span style={{ fontSize: "11px", color: T.textMuted, fontStyle: "italic" }}>{entry.xlit}</span>
            )}
            {entry.pron && <span style={{ fontSize: "10px", color: T.textDim }}>/{entry.pron}/</span>}
          </div>
          <p
            style={{
              fontSize: "12px",
              color: T.textMuted,
              lineHeight: 1.5,
              marginTop: "3px",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: expanded ? 99 : 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {entry.def}
          </p>
        </div>

        {/* Chevron */}
        <ChevronDown
          size={14}
          style={{
            color: T.textDim,
            flexShrink: 0,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </div>

      {/* Expanded: uso traduzido */}
      {expanded && entry.kjv && (
        <div
          style={{
            padding: "0.5rem 0.875rem 0.75rem",
            borderTop: `1px solid ${T.border}`,
          }}
        >
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
          <p style={{ fontSize: "11px", color: T.textMuted, fontStyle: "italic", lineHeight: 1.5 }}>{entry.kjv}</p>
        </div>
      )}
    </div>
  );
}

export default function StrongsPanel({ verse, bookId, chapter, bookTestament, onClose }: Props) {
  const { T } = useThemeContext();
  const [entries, setEntries] = useState<StrongsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualNum, setManualNum] = useState("");
  const [manualResult, setManualResult] = useState<StrongsEntry | null>(null);
  const [manualSearched, setManualSearched] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setEntries([]);
    getVerseStrongs(bookId, chapter, verse.number, bookTestament)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [bookId, chapter, verse.number, bookTestament]);

  const searchManual = async () => {
    const q = manualNum.trim().toUpperCase();
    if (!q) return;
    const searchKey = /^[HG]/i.test(q) ? q : `${bookTestament === "AT" ? "H" : "G"}${q}`;
    setManualLoading(true);
    setManualSearched(false);
    try {
      const result = await lookupStrongsAsync(searchKey);
      setManualResult(result ? { ...result, word: "—" } : null);
    } finally {
      setManualLoading(false);
      setManualSearched(true);
    }
  };

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

      {/* Slide-up banner */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 101,
          maxHeight: "75vh",
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
            padding: "0.5rem 1.25rem 0.75rem",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
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
              }}
            >
              Dicionário Strong · Versículo {verse.number} · {bookTestament === "AT" ? "Hebraico" : "Grego"}
            </p>
            <p
              style={{
                fontSize: "13px",
                color: T.textMuted,
                marginTop: "3px",
                lineHeight: 1.5,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
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
              marginLeft: "12px",
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
            padding: "1rem 1.25rem",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          {/* Loading skeleton */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    height: "68px",
                    borderRadius: "0.875rem",
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
                padding: "1.5rem",
                textAlign: "center",
                borderRadius: "0.875rem",
                background: T.card2,
                marginBottom: "1rem",
              }}
            >
              <p style={{ fontSize: "13px", color: T.textMuted }}>
                Análise Strong's não disponível para este versículo.
              </p>
              <p style={{ fontSize: "11px", color: T.textDim, marginTop: "4px" }}>
                Use a busca manual abaixo para consultar por número.
              </p>
            </div>
          )}

          {/* Word cards */}
          {!loading && entries.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1rem" }}>
              {entries.map((entry, i) => (
                <StrongsWordCard key={`${entry.num}-${i}`} entry={entry} T={T} />
              ))}
            </div>
          )}

          {/* Manual search */}
          <div style={{ marginBottom: "0.5rem" }}>
            <p
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: T.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "8px",
              }}
            >
              Busca direta por número
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={manualNum}
                onChange={(e) => {
                  setManualNum(e.target.value);
                  setManualSearched(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && searchManual()}
                placeholder={bookTestament === "AT" ? "Ex: H430, H7225" : "Ex: G3056, G26"}
                style={{
                  flex: 1,
                  borderRadius: "0.75rem",
                  padding: "0.625rem 0.875rem",
                  background: T.card2,
                  color: T.textPrimary,
                  border: `1.5px solid ${T.border}`,
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <button
                onClick={searchManual}
                disabled={manualLoading}
                style={{
                  padding: "0.625rem 1rem",
                  background: T.accent,
                  color: T.page,
                  border: "none",
                  borderRadius: "0.75rem",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                  opacity: manualLoading ? 0.7 : 1,
                }}
              >
                {manualLoading ? "..." : "Ir"}
              </button>
            </div>
            {manualSearched && manualResult && (
              <div style={{ marginTop: "8px" }}>
                <StrongsWordCard entry={manualResult} T={T} />
              </div>
            )}
            {manualSearched && !manualResult && !manualLoading && (
              <p style={{ fontSize: "12px", color: T.textMuted, marginTop: "8px", textAlign: "center" }}>
                Nenhum resultado encontrado
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
