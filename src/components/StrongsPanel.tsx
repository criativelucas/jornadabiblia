import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useThemeContext } from "@/contexts/ThemeContext";
import { fetchStrongsDefinition, type StrongsWord, type StrongsDefinition } from "@/services/StrongsService";

interface Props {
  word: StrongsWord;
  onClose: () => void;
}

export default function StrongsPanel({ word, onClose }: Props) {
  const { T } = useThemeContext();
  const [definition, setDefinition] = useState<StrongsDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isHebrew = word.strongNumber.startsWith("H");

  useEffect(() => {
    setDefinition(null);
    setError(false);
    setLoading(true);

    fetchStrongsDefinition(word.strongNumber)
      .then(def => {
        setDefinition(def);
        if (!def) setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [word.strongNumber]);

  const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: "14px" }}>
      <p style={{ fontSize: "9px", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
        {label}
      </p>
      {children}
    </div>
  );

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
        }}
      />
      <div
        style={{
          position: "fixed", bottom: "50%", left: "50%",
          transform: "translate(-50%, 50%)", zIndex: 101,
          width: "calc(100% - 2rem)", maxWidth: "420px",
          background: T.card, borderRadius: "1.5rem",
          border: `1px solid ${T.border}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          padding: "1.5rem",
          maxHeight: "80vh", overflowY: "auto",
          animation: "slideUp 0.25s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "12px", right: "12px",
            width: "32px", height: "32px", borderRadius: "9999px",
            background: T.card2, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          <X size={14} color={T.textMuted} />
        </button>

        {/* Header with word */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.25rem" }}>
          <div
            style={{
              flexShrink: 0, width: "88px", minHeight: "88px", borderRadius: "1rem",
              background: T.accentDim, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", padding: "10px 6px", gap: "4px",
            }}
          >
            <span style={{ fontSize: "9px", fontWeight: 900, color: T.accent, letterSpacing: "0.06em" }}>
              {word.strongNumber}
            </span>
            <span
              style={{
                fontSize: isHebrew ? "24px" : "20px", fontWeight: 700,
                color: T.textPrimary, lineHeight: 1.1,
                direction: isHebrew ? "rtl" : "ltr", fontFamily: "serif", textAlign: "center",
              }}
            >
              {definition?.lexeme || word.word}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
              {isHebrew ? "Hebraico" : "Grego"} · {word.strongNumber}
            </p>
            <p style={{ fontSize: "20px", fontWeight: 900, color: T.textPrimary, letterSpacing: "-0.02em" }}>
              {definition?.transliteration || word.word}
            </p>
            {definition?.pronunciation && (
              <p style={{ fontSize: "11px", color: T.textDim, marginTop: "4px" }}>
                /{definition.pronunciation}/
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "20px 0" }}>
            <Loader2 size={14} style={{ color: T.accent, animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "12px", color: T.textMuted }}>Carregando definição...</span>
          </div>
        )}

        {error && !loading && (
          <p style={{ fontSize: "13px", color: T.textMuted, padding: "12px 0" }}>
            Definição não encontrada para {word.strongNumber}.
          </p>
        )}

        {definition && !loading && (
          <>
            {definition.shortDefinition && (
              <Section label="Definição resumida">
                <p style={{ fontSize: "15px", fontWeight: 700, color: T.textPrimary, lineHeight: 1.6 }}>
                  {definition.shortDefinition}
                </p>
              </Section>
            )}

            {definition.definition && (
              <Section label="Definição Strong">
                <p style={{ fontSize: "14px", color: T.textPrimary, lineHeight: 1.8, fontFamily: '"Georgia", "Times New Roman", serif' }}>
                  {definition.definition}
                </p>
              </Section>
            )}
          </>
        )}
      </div>
    </>
  );
}
