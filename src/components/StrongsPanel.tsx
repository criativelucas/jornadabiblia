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
      {/* Overlay with blur */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />

      {/* Centered modal */}
      <div
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          width: "min(480px, calc(100vw - 2rem))",
          maxHeight: "82vh",
          background: T.card,
          borderRadius: "1.25rem",
          border: `1px solid ${T.border}`,
          display: "flex",
          flexDirection: "column",
          boxShadow: `0 32px 80px rgba(0,0,0,0.5)`,
          overflow: "hidden",
        }}
        className="page-enter"
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0" style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${T.border}` }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Dicionário Strong · {bookTestament === "AT" ? "Hebraico" : "Grego"}
            </p>
            <p style={{ fontSize: "15px", fontWeight: 900, color: T.textPrimary, letterSpacing: "-0.02em", marginTop: "2px" }}>
              Versículo {verse.number}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: "32px", height: "32px", borderRadius: "9999px",
            background: T.card2, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0,
          }}>
            <X size={14} color={T.textMuted} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "1.25rem" }}>
          {/* Verse text */}
          <div style={{ borderRadius: "0.75rem", padding: "0.875rem", background: T.card2, borderLeft: `3px solid ${T.accent}`, marginBottom: "1.25rem" }}>
            <p style={{ fontSize: "13px", color: T.textPrimary, lineHeight: 1.7 }}>{verse.text}</p>
          </div>

          {/* Original words chips */}
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={{
              fontSize: "10px", fontWeight: 700, color: T.textMuted,
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px",
            }}>
              {loadingWords
                ? "Carregando palavras originais..."
                : words.length > 0
                ? "Toque em uma palavra para ver a definição"
                : "Palavras indisponíveis — use busca manual"}
            </p>

            {/* Skeleton loading */}
            {loadingWords && (
              <div className="flex flex-wrap gap-2">
                {[52, 64, 48, 72, 56].map((w, i) => (
                  <div key={i} style={{
                    width: `${w}px`, height: "56px", borderRadius: "0.75rem",
                    background: T.card2, opacity: 0.6,
                    animation: "pulse 1.5s ease-in-out infinite",
                  }} />
                ))}
              </div>
            )}

            {/* Word chips */}
            {!loadingWords && words.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {words.map((w, i) => {
                  const isSelected = selectedWord?.strongs === w.strongs && selectedWord?.word === w.word;
                  return (
                    <button
                      key={`${w.strongs}-${i}`}
                      onClick={() => handleWordClick(w)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "0.75rem",
                        background: isSelected ? T.accentDim : T.card2,
                        border: `1.5px solid ${isSelected ? T.accent : T.border}`,
                        cursor: "pointer",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", gap: "4px",
                        transition: "all 0.15s",
                        minWidth: "48px",
                      }}
                    >
                      <span style={{
                        fontSize: bookTestament === "AT" ? "19px" : "15px",
                        fontWeight: 600, lineHeight: 1.2,
                        color: isSelected ? T.accent : T.textPrimary,
                        direction: bookTestament === "AT" ? "rtl" : "ltr",
                        letterSpacing: "0.02em",
                      }}>
                        {w.word}
                      </span>
                      <span style={{
                        fontSize: "9px", fontWeight: 700, letterSpacing: "0.04em",
                        color: isSelected ? T.accent : T.textDim,
                      }}>
                        {w.strongs}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Manual search — always visible */}
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={{
              fontSize: "10px", fontWeight: 700, color: T.textMuted,
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px",
            }}>
              Busca direta por número
            </p>
            <ManualSearch testament={bookTestament} />
          </div>

          {/* Loading definition */}
          {loadingDef && (
            <div className="flex items-center gap-2 mb-4" style={{
              borderRadius: "0.875rem", background: T.card2,
              padding: "1.25rem",
            }}>
              <div style={{
                width: "16px", height: "16px", borderRadius: "9999px",
                border: `2px solid ${T.accent}`, borderTopColor: "transparent",
                animation: "spin 0.7s linear infinite", flexShrink: 0,
              }} />
              <span style={{ fontSize: "13px", color: T.textMuted }}>
                Buscando definição de {selectedWord?.strongs}...
              </span>
            </div>
          )}

          {/* Definition card */}
          {definition && !loadingDef && (
            <div style={{ borderRadius: "0.875rem", border: `1px solid ${T.borderAc}`, overflow: "hidden", marginBottom: "1rem" }}>
              {/* Header with lemma */}
              <div className="flex items-start justify-between" style={{
                padding: "1rem 1.25rem",
                background: T.accentDim,
                borderBottom: `1px solid ${T.borderAc}`,
              }}>
                <div>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: T.accent, letterSpacing: "0.06em" }}>
                    {definition.strongs_num}
                  </span>
                  {definition.lemma && (
                    <p style={{
                      fontSize: definition.language === "hebrew" ? "2rem" : "1.75rem",
                      fontWeight: 900, color: T.textPrimary,
                      marginTop: "4px", lineHeight: 1,
                      direction: definition.language === "hebrew" ? "rtl" : "ltr",
                    }}>
                      {definition.lemma}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "1rem" }}>
                  {definition.xlit && (
                    <p style={{ fontSize: "14px", color: T.textMuted, fontStyle: "italic" }}>{definition.xlit}</p>
                  )}
                  {definition.pronunciation && (
                    <p style={{ fontSize: "11px", color: T.textDim, marginTop: "3px" }}>/{definition.pronunciation}/</p>
                  )}
                </div>
              </div>

              {/* Definition text */}
              {definition.definition && (
                <div style={{ padding: "0.875rem 1.25rem", borderBottom: `1px solid ${T.border}` }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                    Definição Strong's
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

          {/* Not found */}
          {!loadingDef && selectedWord && !definition && (
            <div style={{
              borderRadius: "0.875rem", background: T.card2,
              padding: "1.25rem", textAlign: "center", marginBottom: "1rem",
            }}>
              <p style={{ fontSize: "13px", color: T.textMuted }}>
                Nenhuma definição para <strong style={{ color: T.textPrimary }}>{selectedWord.strongs}</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
