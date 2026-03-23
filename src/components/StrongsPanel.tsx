import { useState, useEffect } from "react";
import { X, Search, BookOpen } from "lucide-react";
import { useThemeContext } from "@/contexts/ThemeContext";
import { fetchStrongs, lookupStrong, type StrongsEntry } from "@/hooks/useStrongs";

interface Props {
  verse: { number: number; text: string };
  bookTestament: "AT" | "NT";
  onClose: () => void;
}

export default function StrongsPanel({ verse, bookTestament, onClose }: Props) {
  const { T } = useThemeContext();
  const lang = bookTestament === "AT" ? "hebrew" : "greek";
  const langLabel = lang === "hebrew" ? "Hebraico" : "Grego";
  const prefix = lang === "hebrew" ? "H" : "G";

  const [dict, setDict] = useState<Record<string, StrongsEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ key: string; entry: StrongsEntry } | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetchStrongs(lang)
      .then(setDict)
      .finally(() => setLoading(false));
  }, [lang]);

  const handleSearch = () => {
    if (!dict || !query.trim()) return;
    const found = lookupStrong(dict, query);
    setResult(found);
    setSearched(true);
  };

  return (
    <div
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: T.card,
        borderRadius: "1.25rem 1.25rem 0 0",
        border: `1px solid ${T.border}`,
        borderBottom: "none",
        maxHeight: "80vh",
        display: "flex", flexDirection: "column",
        boxShadow: `0 -8px 32px ${T.shadow}`,
      }}
    >
      {/* Drag handle */}
      <div style={{ display: "flex", justifyContent: "center", padding: "0.75rem" }}>
        <div style={{ width: "36px", height: "4px", borderRadius: "9999px", background: T.border }} />
      </div>

      {/* Header */}
      <div style={{ padding: "0 1.25rem 0.875rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}` }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Dicionário Strong · {langLabel}
          </p>
          <p style={{ fontSize: "13px", fontWeight: 700, color: T.textPrimary, marginTop: "2px" }}>
            Versículo {verse.number}
          </p>
        </div>
        <button onClick={onClose} style={{ background: T.card2, border: "none", borderRadius: "9999px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={14} color={T.textMuted} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ overflowY: "auto", padding: "1.25rem", flex: 1 }}>
        {/* Selected verse */}
        <div style={{ borderRadius: "0.875rem", padding: "0.875rem", background: T.card2, borderLeft: `3px solid ${T.accent}`, marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "13px", color: T.textPrimary, lineHeight: 1.65 }}>{verse.text}</p>
        </div>

        {/* Search */}
        <p style={{ fontSize: "11px", fontWeight: 700, color: T.textMuted, marginBottom: "8px" }}>
          Buscar palavra no original ({prefix}número ou transliteração):
        </p>
        <div style={{ display: "flex", gap: "8px", marginBottom: "1.25rem" }}>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSearched(false); }}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder={`Ex: ${prefix}1, ${prefix}3056, logos, ab`}
            style={{
              flex: 1, borderRadius: "0.75rem",
              padding: "0.75rem 1rem",
              background: T.card2, color: T.textPrimary,
              border: `1.5px solid ${T.border}`,
              fontSize: "14px", outline: "none",
            }}
          />
          <button onClick={handleSearch}
            style={{
              padding: "0.75rem 1.25rem",
              background: T.accent, color: T.page,
              border: "none", borderRadius: "0.75rem",
              fontWeight: 700, fontSize: "13px", cursor: "pointer",
            }}>
            {loading ? "..." : <Search size={16} />}
          </button>
        </div>

        {/* Result */}
        {searched && !result && (
          <div style={{ textAlign: "center", padding: "1.5rem" }}>
            <p style={{ fontSize: "13px", color: T.textMuted }}>
              Nenhum resultado para "{query}"
            </p>
            <p style={{ fontSize: "11px", color: T.textDim, marginTop: "4px" }}>
              Tente o número Strong (ex: {prefix}1) ou a transliteração em inglês
            </p>
          </div>
        )}

        {result && (
          <div style={{ borderRadius: "0.875rem", background: T.card2, border: `1px solid ${T.borderAc}`, overflow: "hidden" }}>
            {/* Number + original word */}
            <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: 700, color: T.accent, letterSpacing: "0.06em" }}>{result.key}</span>
                <p style={{ fontSize: "1.5rem", color: T.textPrimary, fontWeight: 900, marginTop: "2px", letterSpacing: "0.05em" }}>
                  {result.entry.lemma}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "13px", color: T.textMuted, fontStyle: "italic" }}>{result.entry.xlit}</p>
                <p style={{ fontSize: "11px", color: T.textDim, marginTop: "2px" }}>{result.entry.pron}</p>
              </div>
            </div>

            {/* Definition */}
            <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${T.border}` }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                Definição Strong
              </p>
              <p style={{ fontSize: "13px", color: T.textPrimary, lineHeight: 1.6 }}>
                {result.entry.strongs_def}
              </p>
            </div>

            {/* Derivation */}
            {result.entry.derivation && (
              <div style={{ padding: "0.75rem 1.25rem", borderBottom: `1px solid ${T.border}` }}>
                <p style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                  Origem
                </p>
                <p style={{ fontSize: "12px", color: T.textMuted, lineHeight: 1.5 }}>{result.entry.derivation}</p>
              </div>
            )}

            {/* KJV usage */}
            <div style={{ padding: "0.75rem 1.25rem" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                Traduzido como (KJV)
              </p>
              <p style={{ fontSize: "12px", color: T.textMuted, fontStyle: "italic" }}>{result.entry.kjv_def}</p>
            </div>
          </div>
        )}

        {/* Usage hint */}
        {!searched && (
          <div style={{ borderRadius: "0.875rem", padding: "0.875rem", background: T.page, border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: "11px", color: T.textMuted, lineHeight: 1.6 }}>
              <BookOpen size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px", color: T.accent }} />{" "}
              <strong style={{ color: T.textPrimary }}>Como usar:</strong> Digite o número Strong com o prefixo ({lang === "hebrew" ? "H para hebraico, ex: H430 = Elohim" : "G para grego, ex: G3056 = Logos"}) ou a transliteração da palavra em inglês.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
