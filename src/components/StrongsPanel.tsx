import { useState, useEffect } from "react";
import { X, Loader2, BookOpen, Search } from "lucide-react";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useVerseStrongs, fetchStrongsDefinition, type OriginalWord, type StrongsDefinition } from "@/hooks/useVerseStrongs";

interface Props {
  verse: { number: number; text: string };
  bookId: string;
  chapter: number;
  bookTestament: "AT" | "NT";
  onClose: () => void;
}

function ManualSearch({ testament }: { testament: "AT" | "NT" }) {
  const { T } = useThemeContext();
  const prefix = testament === "AT" ? "H" : "G";
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<StrongsDefinition | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const q = query.trim().toUpperCase();
    const searchKey = /^[HG]/i.test(q) ? q : `${prefix}${q}`;
    const def = await fetchStrongsDefinition(searchKey);
    setResult(def);
    setLoading(false);
  };

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder={`Ex: ${prefix}430, ${prefix}3056`}
          className="flex-1"
          style={{ borderRadius: "0.75rem", padding: "0.625rem 0.875rem", background: T.card2, color: T.textPrimary, border: `1.5px solid ${T.border}`, fontSize: "13px", outline: "none" }}
        />
        <button
          onClick={search}
          style={{ padding: "0.625rem 1rem", background: T.accent, color: T.page, border: "none", borderRadius: "0.75rem", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
        >
          {loading ? "..." : "Ir"}
        </button>
      </div>
      {result && (
        <div style={{ marginTop: "8px", padding: "0.75rem", borderRadius: "0.75rem", background: T.card2, border: `1px solid ${T.border}` }}>
          <p style={{ fontSize: "13px", color: T.textPrimary }}>
            <strong style={{ color: T.accent }}>{result.lemma}</strong>{" "}
            <span style={{ color: T.textMuted, fontStyle: "italic" }}>({result.xlit})</span>
          </p>
          <p style={{ fontSize: "12px", color: T.textMuted, marginTop: "4px", lineHeight: 1.5 }}>
            {result.definition.slice(0, 200)}{result.definition.length > 200 ? "…" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

export default function StrongsPanel({ verse, bookId, chapter, bookTestament, onClose }: Props) {
  const { T } = useThemeContext();
  const { words, loading: loadingWords } = useVerseStrongs(bookId, chapter, verse.number, bookTestament);
  const [selectedWord, setSelectedWord] = useState<OriginalWord | null>(null);
  const [definition, setDefinition] = useState<StrongsDefinition | null>(null);
  const [loadingDef, setLoadingDef] = useState(false);

  const handleWordClick = async (word: OriginalWord) => {
    setSelectedWord(word);
    setDefinition(null);
    setLoadingDef(true);
    const def = await fetchStrongsDefinition(word.strongs);
    setDefinition(def);
    setLoadingDef(false);
  };

  return (
    <div
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: T.card,
        borderRadius: "1.25rem 1.25rem 0 0",
        border: `1px solid ${T.border}`, borderBottom: "none",
        maxHeight: "78vh", display: "flex", flexDirection: "column",
        boxShadow: `0 -8px 40px ${T.shadow}`,
      }}
    >
      {/* Handle */}
      <div className="flex justify-center" style={{ paddingTop: "0.75rem", paddingBottom: "0.25rem" }}>
        <div style={{ width: "36px", height: "4px", borderRadius: "9999px", background: T.border }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: "0.5rem 1.25rem 0.875rem", borderBottom: `1px solid ${T.border}` }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Strong's · {bookTestament === "AT" ? "Hebraico" : "Grego"}
          </p>
          <p style={{ fontSize: "13px", fontWeight: 700, color: T.textPrimary, marginTop: "1px" }}>
            Versículo {verse.number}
          </p>
        </div>
        <button onClick={onClose} style={{ background: T.card2, border: "none", borderRadius: "9999px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={14} color={T.textMuted} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ overflowY: "auto", flex: 1, padding: "1rem 1.25rem" }}>
        {/* Verse text */}
        <div style={{ borderRadius: "0.75rem", padding: "0.875rem", background: T.card2, borderLeft: `3px solid ${T.accent}`, marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "13px", color: T.textPrimary, lineHeight: 1.7 }}>{verse.text}</p>
        </div>

        {/* Original words chips */}
        {loadingWords ? (
          <div className="flex items-center gap-2" style={{ marginBottom: "1.25rem" }}>
            <Loader2 size={14} color={T.textMuted} className="animate-spin" />
            <span style={{ fontSize: "12px", color: T.textMuted }}>Carregando palavras originais...</span>
          </div>
        ) : words.length > 0 ? (
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
              Toque em uma palavra para ver sua definição
            </p>
            <div className="flex flex-wrap gap-2">
              {words.map((w, i) => (
                <button
                  key={`${w.strongs}-${i}`}
                  onClick={() => handleWordClick(w)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "0.625rem",
                    background: selectedWord?.strongs === w.strongs && selectedWord?.word === w.word ? T.accentDim : T.card2,
                    border: `1.5px solid ${selectedWord?.strongs === w.strongs && selectedWord?.word === w.word ? T.accent : T.border}`,
                    cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{
                    fontSize: bookTestament === "AT" ? "17px" : "14px",
                    color: selectedWord?.strongs === w.strongs ? T.accent : T.textPrimary,
                    fontWeight: 700,
                    direction: bookTestament === "AT" ? "rtl" : "ltr",
                    lineHeight: 1.2,
                  }}>
                    {w.word}
                  </span>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: T.textMuted, letterSpacing: "0.04em" }}>
                    {w.strongs}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={{ fontSize: "12px", color: T.textMuted, marginBottom: "4px" }}>
              <BookOpen size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px", color: T.accent }} />
              Busca manual — digite o número Strong (ex: H430, G3056)
            </p>
          </div>
        )}

        {/* Loading definition */}
        {loadingDef && (
          <div className="flex items-center gap-2 mb-4">
            <Loader2 size={14} color={T.accent} className="animate-spin" />
            <span style={{ fontSize: "12px", color: T.textMuted }}>Buscando definição...</span>
          </div>
        )}

        {/* Definition card */}
        {definition && !loadingDef && (
          <div style={{ borderRadius: "0.875rem", background: T.card2, border: `1px solid ${T.borderAc}`, overflow: "hidden", marginBottom: "1rem" }}>
            {/* Word header */}
            <div className="flex items-start justify-between" style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${T.border}` }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: 700, color: T.accent, letterSpacing: "0.06em" }}>{definition.strongs_num}</span>
                <p style={{
                  fontSize: definition.language === "hebrew" ? "2rem" : "1.75rem",
                  color: T.textPrimary, fontWeight: 900, marginTop: "2px",
                  direction: definition.language === "hebrew" ? "rtl" : "ltr",
                  letterSpacing: "0.03em", lineHeight: 1,
                }}>
                  {definition.lemma}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "13px", color: T.textMuted, fontStyle: "italic" }}>{definition.xlit}</p>
                <p style={{ fontSize: "11px", color: T.textDim, marginTop: "2px" }}>{definition.pronunciation}</p>
              </div>
            </div>

            {/* Definition */}
            {definition.definition && (
              <div style={{ padding: "0.875rem 1.25rem", borderBottom: `1px solid ${T.border}` }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                  Definição
                </p>
                <p
                  style={{ fontSize: "13px", color: T.textPrimary, lineHeight: 1.65 }}
                  dangerouslySetInnerHTML={{ __html: definition.definition }}
                />
              </div>
            )}

            {/* KJV usage */}
            {definition.kjv_usage && (
              <div style={{ padding: "0.75rem 1.25rem" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                  Traduzido como (KJV)
                </p>
                <p style={{ fontSize: "12px", color: T.textMuted, fontStyle: "italic" }}>{definition.kjv_usage}</p>
              </div>
            )}
          </div>
        )}

        {/* Manual search fallback */}
        <details style={{ marginTop: "0.5rem" }}>
          <summary style={{ fontSize: "11px", color: T.textMuted, cursor: "pointer", userSelect: "none" }}>
            <Search size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
            Buscar outro número Strong manualmente
          </summary>
          <ManualSearch testament={bookTestament} />
        </details>
      </div>
    </div>
  );
}
