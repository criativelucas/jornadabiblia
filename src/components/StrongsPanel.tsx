import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useThemeContext, type Theme } from "@/contexts/ThemeContext";
import { translateDefinition, type OrigWord } from "@/services/StrongsService";

interface Props {
  word: OrigWord;
  onClose: () => void;
}

function StrongsWordDetail({ word, T }: { word: OrigWord; T: Theme }) {
  const [defPT, setDefPT] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setDefPT("");
    translateDefinition(word.num, word.def)
      .then(setDefPT)
      .finally(() => setLoading(false));
  }, [word.num, word.def]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        {/* Word block */}
        <div
          style={{
            flexShrink: 0,
            width: "88px",
            minHeight: "88px",
            borderRadius: "1rem",
            background: T.accentDim,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 6px",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "9px", fontWeight: 900, color: T.accent, letterSpacing: "0.06em" }}>
            {word.num}
          </span>
          <span
            style={{
              fontSize: word.lang === "hebrew" ? "24px" : "20px",
              fontWeight: 700,
              color: T.textPrimary,
              lineHeight: 1.1,
              direction: word.lang === "hebrew" ? "rtl" : "ltr",
              fontFamily: "serif",
              textAlign: "center",
            }}
          >
            {word.lemma || word.word}
          </span>
          {word.xlit && (
            <span style={{ fontSize: "10px", color: T.accent, fontStyle: "italic", textAlign: "center" }}>
              {word.xlit}
            </span>
          )}
          {word.pron && (
            <span style={{ fontSize: "9px", color: T.textDim, textAlign: "center" }}>
              /{word.pron}/
            </span>
          )}
        </div>

        {/* Language info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
            {word.lang === "hebrew" ? "Hebraico" : "Grego"} · {word.num}
          </p>
          <p style={{ fontSize: "20px", fontWeight: 900, color: T.textPrimary, letterSpacing: "-0.02em" }}>
            {word.xlit || word.lemma}
          </p>
        </div>
      </div>

      {/* Definition */}
      <div>
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
          Definição
        </p>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 0" }}>
            <Loader2 size={14} style={{ color: T.accent, animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "12px", color: T.textMuted }}>Traduzindo para português...</span>
          </div>
        ) : (
          <p style={{ fontSize: "14px", color: T.textPrimary, lineHeight: 1.8, fontFamily: '"Georgia", "Times New Roman", serif' }}>
            {defPT || word.def}
          </p>
        )}
      </div>
    </div>
  );
}

export default function StrongsPanel({ word, onClose }: Props) {
  const { T } = useThemeContext();

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(6px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "50%",
          left: "50%",
          transform: "translate(-50%, 50%)",
          zIndex: 101,
          width: "calc(100% - 2rem)",
          maxWidth: "420px",
          background: T.card,
          borderRadius: "1.5rem",
          border: `1px solid ${T.border}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          padding: "1.5rem",
          animation: "slideUp 0.25s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "32px",
            height: "32px",
            borderRadius: "9999px",
            background: T.card2,
            border: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={14} color={T.textMuted} />
        </button>

        <StrongsWordDetail word={word} T={T} />
      </div>
    </>
  );
}
