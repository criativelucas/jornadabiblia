import { useState, useEffect, useRef } from "react";
import { ArrowLeft, BookMarked, Loader2, X, ChevronRight } from "lucide-react";
import { bibleBooks, AT_BOOKS, NT_BOOKS } from "@/data/bibleBooks";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchTranslation,
  type BibleVersion,
  type BibleBook as BibleDataBook,
} from "@/hooks/useBibleData";
import {
  fetchChapterStrongs,
  enrichChapterWords,
  fetchStrongsDefinition,
  type StrongsWord,
  type StrongsDefinition,
} from "@/services/StrongsService";

type LexView = "testament" | "books" | "chapters" | "verses" | "detail";

// Translation cache
const ptCache: Record<string, { def: string; kjv: string }> = {};

// Restore sessionStorage cache on load
try {
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith("strongs_pt_")) {
      const num = key.replace("strongs_pt_", "");
      const val = JSON.parse(sessionStorage.getItem(key)!);
      if (val?.def) ptCache[num] = val;
    }
  }
} catch {}

/**
 * Batch translate multiple Strong's entries via the translate-strongs edge function.
 * Uses no auth — public function.
 */
async function batchTranslatePT(
  entries: { num: string; def: string; kjv: string }[]
): Promise<Record<string, { def: string; kjv: string }>> {
  // Filter out already cached
  const needed = entries.filter(e => !ptCache[e.num] && (e.def || e.kjv));
  if (needed.length === 0) return ptCache;

  // Check Supabase cache first
  const uncached: typeof needed = [];
  try {
    const nums = needed.map(e => e.num);
    const { data } = await supabase
      .from("strongs_translations")
      .select("strongs_num, def_pt")
      .in("strongs_num", nums);
    if (data) {
      for (const row of data) {
        ptCache[row.strongs_num] = { def: row.def_pt, kjv: "" };
        try { sessionStorage.setItem(`strongs_pt_${row.strongs_num}`, JSON.stringify(ptCache[row.strongs_num])); } catch {}
      }
    }
    for (const e of needed) {
      if (!ptCache[e.num]) uncached.push(e);
    }
  } catch {
    uncached.push(...needed.filter(e => !ptCache[e.num]));
  }

  if (uncached.length === 0) return ptCache;

  // Translate via edge function (batch, no auth)
  try {
    const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-strongs`;
    const res = await fetch(FUNC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ entries: uncached }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { translations } = await res.json();
    if (Array.isArray(translations)) {
      for (const t of translations) {
        if (t?.num && t?.def) {
          ptCache[t.num] = { def: t.def, kjv: t.kjv || "" };
          try { sessionStorage.setItem(`strongs_pt_${t.num}`, JSON.stringify(ptCache[t.num])); } catch {}
          // Save to Supabase global cache
          supabase.from("strongs_translations").upsert({ strongs_num: t.num, def_pt: t.def }).then(() => {});
        }
      }
    }
  } catch (err) {
    console.warn("[StrongsLexicon] Batch translation failed:", err);
  }

  return ptCache;
}

interface WordDetail {
  strongWord: StrongsWord;
  definition: StrongsDefinition | null;
  translated: { def: string; kjv: string } | null;
}

export default function StrongsLexicon() {
  const { T } = useThemeContext();
  const { user } = useAuth();

  const [view, setView] = useState<LexView>("testament");
  const [testament, setTestament] = useState<"AT" | "NT">("AT");
  const [selectedBook, setSelectedBook] = useState<(typeof bibleBooks)[0] | null>(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

  const [verses, setVerses] = useState<{ verse: number; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [wordDetails, setWordDetails] = useState<WordDetail[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);

  const booksToShow = testament === "AT" ? AT_BOOKS : NT_BOOKS;

  // Load chapter text
  const loadChapterText = async (book: (typeof bibleBooks)[0], ch: number) => {
    setLoading(true);
    try {
      const data = await fetchTranslation("nvi");
      const idx = bibleBooks.findIndex(b => b.id === book.id);
      const chData = data[idx]?.chapters[ch - 1];
      if (chData) {
        setVerses(chData.map((text, i) => ({ verse: i + 1, text: text.trim() })));
      }
    } catch {
      setVerses([]);
    }
    setLoading(false);
  };

  // Load verse words with Strong's
  const loadVerseWords = async (book: (typeof bibleBooks)[0], ch: number, verseNum: number) => {
    setLoadingWords(true);
    setWordDetails([]);
    try {
      const bkIdx = bibleBooks.findIndex(b => b.id === book.id) + 1;
      const allWords = await fetchChapterStrongs(bkIdx, ch);
      const enriched = await enrichChapterWords(allWords);
      const verseWords = enriched[verseNum - 1] ?? [];

      // Fetch all definitions in parallel
      const defs = await Promise.all(
        verseWords.map(w => fetchStrongsDefinition(w.strongNumber))
      );

      // Batch translate all at once
      const toTranslate = verseWords
        .map((w, i) => defs[i] ? { num: w.strongNumber, def: defs[i]!.definition || "", kjv: defs[i]!.shortDefinition || "" } : null)
        .filter((e): e is { num: string; def: string; kjv: string } => e !== null);
      
      await batchTranslatePT(toTranslate);

      // Build details
      const details: WordDetail[] = verseWords.map((w, i) => ({
        strongWord: w,
        definition: defs[i],
        translated: ptCache[w.strongNumber] || null,
      }));
      setWordDetails(details);
    } catch (err) {
      console.error("[StrongsLexicon] Error:", err);
    }
    setLoadingWords(false);
  };

  const handleSelectTestament = (t: "AT" | "NT") => {
    setTestament(t);
    setView("books");
  };

  const handleSelectBook = (book: (typeof bibleBooks)[0]) => {
    setSelectedBook(book);
    setView("chapters");
  };

  const handleSelectChapter = (ch: number) => {
    if (!selectedBook) return;
    setSelectedChapter(ch);
    loadChapterText(selectedBook, ch);
    setView("verses");
  };

  const handleSelectVerse = (verseNum: number) => {
    if (!selectedBook) return;
    setSelectedVerse(verseNum);
    loadVerseWords(selectedBook, selectedChapter, verseNum);
    setView("detail");
  };

  const goBack = () => {
    if (view === "detail") { setView("verses"); setWordDetails([]); }
    else if (view === "verses") setView("chapters");
    else if (view === "chapters") setView("books");
    else if (view === "books") setView("testament");
  };

  // ── Testament selection ──
  if (view === "testament") {
    return (
      <div style={{ padding: "1.5rem", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <BookMarked size={32} color={T.accent} />
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: T.textPrimary, marginTop: 8 }}>
            Léxico de Strong
          </h1>
          <p style={{ fontSize: "13px", color: T.textMuted, marginTop: 4 }}>
            Explore cada palavra no original hebraico e grego
          </p>
        </div>
        {(["AT", "NT"] as const).map(t => (
          <button
            key={t}
            onClick={() => handleSelectTestament(t)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "1.25rem 1.5rem",
              marginBottom: "0.75rem",
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: "1rem",
              cursor: "pointer",
              color: T.textPrimary,
              fontSize: "1rem",
              fontWeight: 700,
            }}
          >
            <span>{t === "AT" ? "📜 Antigo Testamento" : "✝️ Novo Testamento"}</span>
            <ChevronRight size={18} color={T.textMuted} />
          </button>
        ))}
      </div>
    );
  }

  // ── Book selection ──
  if (view === "books") {
    const categories = [...new Set(booksToShow.map(b => b.category))];
    return (
      <div style={{ padding: "1rem 1.5rem", maxWidth: 600, margin: "0 auto" }}>
        <button onClick={goBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.accent, fontSize: "13px", fontWeight: 700, cursor: "pointer", marginBottom: "1rem" }}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: T.textPrimary, marginBottom: "1rem" }}>
          {testament === "AT" ? "Antigo Testamento" : "Novo Testamento"}
        </h2>
        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: "1rem" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{cat}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
              {booksToShow.filter(b => b.category === cat).map(book => (
                <button
                  key={book.id}
                  onClick={() => handleSelectBook(book)}
                  style={{
                    padding: "10px 12px",
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: "0.75rem",
                    cursor: "pointer",
                    color: T.textPrimary,
                    fontSize: "13px",
                    fontWeight: 600,
                    textAlign: "left",
                  }}
                >
                  {book.emoji} {book.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Chapter selection ──
  if (view === "chapters" && selectedBook) {
    return (
      <div style={{ padding: "1rem 1.5rem", maxWidth: 600, margin: "0 auto" }}>
        <button onClick={goBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.accent, fontSize: "13px", fontWeight: 700, cursor: "pointer", marginBottom: "1rem" }}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: T.textPrimary, marginBottom: "1rem" }}>
          {selectedBook.emoji} {selectedBook.name}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(ch => (
            <button
              key={ch}
              onClick={() => handleSelectChapter(ch)}
              style={{
                padding: "10px",
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: "0.625rem",
                cursor: "pointer",
                color: T.textPrimary,
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Verse selection ──
  if (view === "verses" && selectedBook) {
    return (
      <div style={{ padding: "1rem 1.5rem", maxWidth: 600, margin: "0 auto" }}>
        <button onClick={goBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.accent, fontSize: "13px", fontWeight: 700, cursor: "pointer", marginBottom: "1rem" }}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: T.textPrimary, marginBottom: "1rem" }}>
          {selectedBook.name} {selectedChapter}
        </h2>
        <p style={{ fontSize: "12px", color: T.textMuted, marginBottom: "1rem" }}>
          Selecione um versículo para ver o léxico
        </p>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
            <Loader2 size={28} color={T.accent} className="animate-spin" />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {verses.map(v => (
              <button
                key={v.verse}
                onClick={() => handleSelectVerse(v.verse)}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "12px 14px",
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: "0.75rem",
                  cursor: "pointer",
                  textAlign: "left",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 800, color: T.accent, flexShrink: 0, marginTop: 2 }}>
                  {v.verse}
                </span>
                <span style={{ fontSize: "14px", color: T.textPrimary, lineHeight: 1.6, fontFamily: '"Georgia", serif' }}>
                  {v.text}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Detail view — words with Strong's ──
  if (view === "detail" && selectedBook && selectedVerse !== null) {
    const verseText = verses.find(v => v.verse === selectedVerse)?.text ?? "";
    const isHebrew = selectedBook.testament === "AT";

    return (
      <div style={{ padding: "1rem 1.5rem", maxWidth: 600, margin: "0 auto", paddingBottom: "6rem" }}>
        <button onClick={goBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.accent, fontSize: "13px", fontWeight: 700, cursor: "pointer", marginBottom: "1rem" }}>
          <ArrowLeft size={16} /> {selectedBook.name} {selectedChapter}
        </button>

        {/* Verse reference */}
        <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: T.textPrimary, marginBottom: "0.5rem" }}>
          {selectedBook.name} {selectedChapter}:{selectedVerse}
        </h2>

        {/* Portuguese text */}
        <p style={{ fontSize: "15px", color: T.textPrimary, lineHeight: 1.8, fontFamily: '"Georgia", serif', marginBottom: "1.5rem", padding: "1rem", background: T.card, borderRadius: "0.75rem", border: `1px solid ${T.border}` }}>
          {verseText}
        </p>

        <p style={{ fontSize: "11px", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>
          Léxico de Strong
        </p>

        {loadingWords ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "3rem" }}>
            <Loader2 size={28} color={T.accent} className="animate-spin" />
            <p style={{ fontSize: "12px", color: T.textMuted }}>Carregando léxico...</p>
          </div>
        ) : wordDetails.length === 0 ? (
          <p style={{ fontSize: "13px", color: T.textMuted, textAlign: "center", padding: "2rem" }}>
            Nenhuma palavra com Strong's encontrada para este versículo.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {wordDetails.map((wd, i) => {
              const { strongWord: w, definition: def, translated } = wd;
              const displayWord = translated?.word || w.originalWord || w.word;
              const originalChar = w.originalWord || def?.lexeme || w.word;
              const xlit = def?.transliteration || w.transliteration || "";
              const pron = def?.pronunciation || "";
              const defText = translated?.def || def?.definition || "";
              const kjvText = translated?.kjv || def?.shortDefinition || "";

              return (
                <div
                  key={`${w.strongNumber}-${i}`}
                  style={{
                    padding: "16px",
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: "1rem",
                  }}
                >
                  {/* Word in Portuguese */}
                  <p style={{ fontSize: "17px", fontWeight: 800, color: T.textPrimary, marginBottom: 8 }}>
                    {displayWord}
                  </p>

                  {/* Original + transliteration */}
                  <p style={{ fontSize: "14px", marginBottom: 4 }}>
                    <span style={{ color: T.accent, fontWeight: 700, fontFamily: "serif", fontSize: isHebrew ? "20px" : "16px", direction: isHebrew ? "rtl" : "ltr" }}>
                      {originalChar}
                    </span>
                    {xlit && (
                      <span style={{ color: T.textMuted, fontStyle: "italic", marginLeft: 8, fontSize: "13px" }}>
                        ({xlit})
                      </span>
                    )}
                  </p>

                  {/* Pronunciation */}
                  {pron && (
                    <p style={{ fontSize: "12px", color: T.textMuted, marginBottom: 6 }}>
                      /{pron}/
                    </p>
                  )}

                  {/* Strong number + definition */}
                  <p style={{ fontSize: "13px", color: T.textPrimary, lineHeight: 1.7, marginTop: 8 }}>
                    <span style={{ color: T.accent, fontWeight: 700 }}>
                      Strong {isHebrew ? "Hebraico" : "Grego"} {w.strongNumber.replace(/[HG]/, "")}:
                    </span>{" "}
                    {defText || "Definição não disponível."}
                  </p>

                  {/* KJV usage */}
                  {kjvText && (
                    <p style={{ fontSize: "12px", color: T.textMuted, marginTop: 6, fontStyle: "italic" }}>
                      Usos: {kjvText}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}
