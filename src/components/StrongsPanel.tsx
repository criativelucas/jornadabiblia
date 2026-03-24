import { useState, useEffect } from "react";
import { X, Loader2, Search } from "lucide-react";
import { useThemeContext } from "@/contexts/ThemeContext";
import { fetchVerseWords, getStrongsDefinition, type OrigWord, type StrongsEntry } from "@/services/StrongsService";

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
  const [result, setResult] = useState<StrongsEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const q = query.trim().toUpperCase();
    const searchKey = /^[HG]/i.test(q) ? q : `${prefix}${q}`;
    const def = await getStrongsDefinition(searchKey);
    setResult(def);
    setSearched(true);
    setLoading(false);
  };

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSearched(false); }}
          onKeyDown={(e) => e.key === "Enter" && search()}
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
      {searched && !result && (
        <p style={{ fontSize: "12px", color: T.textMuted, marginTop: "8px", textAlign: "center" }}>
          Nenhum resultado encontrado
        </p>
      )}
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
  const [words, setWords] = useState<OrigWord[]>([]);
  const [loadingWords, setLoadingWords] = useState(true);
  const [selectedWord, setSelectedWord] = useState<OrigWord | null>(null);
  const [definition, setDefinition] = useState<StrongsEntry | null>(null);
  const [loadingDef, setLoadingDef] = useState(false);

  useEffect(() => {
    setLoadingWords(true);
    setWords([]);
    setSelectedWord(null);
    setDefinition(null);
    fetchVerseWords(bookId, chapter, verse.number, bookTestament)
      .then(setWords)
      .finally(() => setLoadingWords(false));
  }, [bookId, chapter, verse.number, bookTestament]);

  const handleWordClick = async (word: OrigWord) => {
    setSelectedWord(word);
    setDefinition(null);
    setLoadingDef(true);
    const def = await getStrongsDefinition(word.strongs);
    setDefinition(def);
    setLoadingDef(false);
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 99 }}
      />

      {/* Centered modal */}
      <div
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 100,
          width: "calc(100% - 2rem)",
          maxWidth: "420px",
          maxHeight: "80vh",
          background: T.card,
          borderRadius: "1.25rem",
          border: `1px solid ${T.border}`,
          display: "flex",
          flexDirection: "column",
          boxShadow: `0 20px 60px ${T.shadow}`,
          overflow: "hidden",
        }}
        className="animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0" style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${T.border}` }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Dicionário Strong · {bookTestament === "AT" ? "Hebraico" : "Grego"}
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
            <div style={{ marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                Palavras originais
              </p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton-shimmer" style={{ width: "52px", height: "48px", borderRadius: "0.625rem" }} />
                ))}
              </div>
            </div>
          ) : words.length > 0 ? (
            <div style={{ marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                Toque em uma palavra para ver a definição
              </p>
              <div className="flex flex-wrap gap-2">
                {words.map((w, i) => {
                  const isSelected = selectedWord?.strongs === w.strongs && selectedWord?.word === w.word;
                  return (
                    <button
                      key={`${w.strongs}-${i}`}
                      onClick={() => handleWordClick(w)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "0.75rem",
                        background: isSelected ? T.accentDim : T.card2,
                        border: `1.5px solid ${isSelected ? T.accent : T.border}`,
                        cursor: "pointer",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                        transition: "all 0.15s",
                        minWidth: "52px",
                      }}
                    >
                      <span style={{
                        fontSize: bookTestament === "AT" ? "17px" : "14px",
                        color: isSelected ? T.accent : T.textPrimary,
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
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: "1.25rem", padding: "1rem", borderRadius: "0.75rem", background: T.card2, textAlign: "center" }}>
              <p style={{ fontSize: "12px", color: T.textMuted }}>
                Palavras originais não disponíveis para este versículo.
              </p>
              <p style={{ fontSize: "11px", color: T.textDim, marginTop: "4px" }}>
                Use a busca manual abaixo.
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

          {/* Not found */}
          {!loadingDef && selectedWord && !definition && (
            <p style={{ fontSize: "12px", color: T.textMuted, textAlign: "center", marginBottom: "1rem" }}>
              Definição não encontrada para "{selectedWord.strongs}"
            </p>
          )}

          {/* Manual search */}
          <details style={{ marginTop: "0.5rem" }}>
            <summary style={{ fontSize: "11px", color: T.textMuted, cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: "4px" }}>
              <Search size={10} />
              Buscar outro número Strong manualmente
            </summary>
            <ManualSearch testament={bookTestament} />
          </details>
        </div>
      </div>
    </>
  );
}
