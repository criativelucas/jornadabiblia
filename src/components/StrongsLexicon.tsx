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
const warmedChapters = new Map<string, Promise<void>>();

const PORTUGUESE_MARKERS = /(\b(o|a|os|as|de|do|da|dos|das|e|em|no|na|nos|nas|que|por|para|com|sem|céus|terra|princípio|palavra|deus)\b|[ãáàâéêíóôõúç])/i;
const ENGLISH_MARKERS = /\b(the|and|god|earth|heaven|created|beginning|word|light|was|with|upon|from|without|let|said)\b/i;

function isPortugueseText(text?: string | null) {
  if (!text) return false;
  const normalized = text.trim();
  if (!normalized) return false;
  return PORTUGUESE_MARKERS.test(normalized) || !ENGLISH_MARKERS.test(normalized);
}

function savePtCache(num: string, value: { def: string; kjv: string }) {
  if (!value.def || !isPortugueseText(value.def)) return;
  ptCache[num] = value;
  try {
    sessionStorage.setItem(`strongs_pt_${num}`, JSON.stringify(value));
  } catch {}
}

// Restore sessionStorage cache on load
try {
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith("strongs_pt_")) {
      const num = key.replace("strongs_pt_", "");
      const val = JSON.parse(sessionStorage.getItem(key)!);
      if (val?.def && isPortugueseText(val.def)) {
        ptCache[num] = val;
      } else {
        sessionStorage.removeItem(key);
      }
    }
  }
} catch {}

async function translateSingleViaBibleChat(entry: {
  num: string;
  word: string;
  def: string;
  kjv: string;
}): Promise<{ def: string; kjv: string } | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bible-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        type: "strongs_translation",
        messages: [{
          role: "user",
          content: `Número Strong: ${entry.num}\nword: "${entry.word}"\ndef: "${entry.def}"\nkjv: "${entry.kjv}"\n\nTraduza TODOS os campos para português brasileiro teológico e preciso. Responda APENAS com JSON: {"word":"...","def":"...","kjv":"..."}`,
        }],
      }),
    });

    if (!response.ok || !response.body) return null;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx = buffer.indexOf("\n");
      while (idx !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line.startsWith("data: ")) {
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const chunk = parsed.choices?.[0]?.delta?.content;
            if (chunk) fullText += chunk;
          } catch {}
        }
        idx = buffer.indexOf("\n");
      }
    }

    const clean = fullText.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);
    if (result?.def && isPortugueseText(result.def)) {
      return { def: result.def, kjv: result.kjv || entry.kjv || "" };
    }
  } catch (err) {
    console.warn("[StrongsLexicon] Fallback translation failed:", err);
  }

  return null;
}

/**
 * Batch translate multiple Strong's entries via the translate-strongs edge function.
 * Uses no auth — public function.
 */
async function batchTranslatePT(
  entries: { num: string; word: string; def: string; kjv: string }[]
): Promise<Record<string, { def: string; kjv: string }>> {
  // Filter out already cached
  const needed = entries.filter(e => (!ptCache[e.num] || !isPortugueseText(ptCache[e.num]?.def)) && (e.def || e.kjv));
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
        if (isPortugueseText(row.def_pt)) {
          savePtCache(row.strongs_num, { def: row.def_pt, kjv: "" });
        }
      }
    }
    for (const e of needed) {
      if (!ptCache[e.num] || !isPortugueseText(ptCache[e.num]?.def)) uncached.push(e);
    }
  } catch {
    uncached.push(...needed.filter(e => !ptCache[e.num] || !isPortugueseText(ptCache[e.num]?.def)));
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
        if (t?.num && t?.def && isPortugueseText(t.def)) {
          savePtCache(t.num, { def: t.def, kjv: t.kjv || "" });
          // Save to Supabase global cache
          supabase.from("strongs_translations").upsert({ strongs_num: t.num, def_pt: t.def }).then(() => {});
        }
      }
    }
  } catch (err) {
    console.warn("[StrongsLexicon] Batch translation failed:", err);
  }

  const missing = uncached.filter(entry => !ptCache[entry.num] || !isPortugueseText(ptCache[entry.num]?.def));
  if (missing.length > 0) {
    await Promise.all(
      missing.map(async (entry) => {
        const fallback = await translateSingleViaBibleChat({
          num: entry.num,
          word: entry.word,
          def: entry.def,
          kjv: entry.kjv,
        });

        if (fallback) {
          savePtCache(entry.num, fallback);
          supabase.from("strongs_translations").upsert({ strongs_num: entry.num, def_pt: fallback.def }).then(() => {});
        }
      })
    );
  }

  return ptCache;
}

export async function warmLexiconChapter(bookNumber: number, chapter: number) {
  const cacheKey = `${bookNumber}-${chapter}`;
  if (warmedChapters.has(cacheKey)) return warmedChapters.get(cacheKey)!;

  const promise = (async () => {
    const chapterWords = await fetchChapterStrongs(bookNumber, chapter);
    const enriched = await enrichChapterWords(chapterWords);
    const uniqueWords = Array.from(
      new Map(enriched.flat().map((word) => [word.strongNumber, word])).values()
    );

    const definitions = await Promise.all(
      uniqueWords.map(async (word) => ({
        word,
        definition: await fetchStrongsDefinition(word.strongNumber),
      }))
    );

    await batchTranslatePT(
      definitions
        .filter(({ definition }) => Boolean(definition))
        .map(({ word, definition }) => ({
          num: word.strongNumber,
          word: word.word,
          def: definition?.definition || "",
          kjv: definition?.shortDefinition || "",
        }))
    );
  })().catch((err) => {
    console.warn(`[StrongsLexicon] Warmup failed for ${cacheKey}:`, err);
  });

  warmedChapters.set(cacheKey, promise);
  return promise;
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
  const hasStartedWarmup = useRef(false);

  const booksToShow = testament === "AT" ? AT_BOOKS : NT_BOOKS;

  useEffect(() => {
    if (hasStartedWarmup.current) return;
    hasStartedWarmup.current = true;

    const runWarmup = () => {
      void Promise.allSettled([
        warmLexiconChapter(1, 1),
        warmLexiconChapter(40, 1),
        warmLexiconChapter(43, 1),
      ]);
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(runWarmup, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }

    const timeout = globalThis.setTimeout(runWarmup, 300);
    return () => globalThis.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!selectedBook) return;

    const bookNumber = bibleBooks.findIndex((book) => book.id === selectedBook.id) + 1;
    if (bookNumber <= 0) return;

    const chaptersToWarm = [selectedChapter, selectedChapter + 1, selectedChapter - 1]
      .filter((chapter, index, arr) => chapter >= 1 && chapter <= selectedBook.chapters && arr.indexOf(chapter) === index);

    const timeout = window.setTimeout(() => {
      void Promise.allSettled(chaptersToWarm.map((chapter) => warmLexiconChapter(bookNumber, chapter)));
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [selectedBook, selectedChapter]);

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
        .map((w, i) => defs[i] ? { num: w.strongNumber, word: w.word, def: defs[i]!.definition || "", kjv: defs[i]!.shortDefinition || "" } : null)
        .filter(Boolean) as { num: string; word: string; def: string; kjv: string }[];
      
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

        <p style={{ fontSize: "13px", fontWeight: 700, color: T.textPrimary, marginBottom: "1rem", borderBottom: `2px solid ${T.border}`, paddingBottom: 6 }}>
          Strong's Lexicon
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
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {wordDetails.map((wd, i) => {
              const { strongWord: w, definition: def, translated } = wd;
              const displayWord = translated?.def ? (w.word || w.originalWord) : (w.word || w.originalWord);
              const originalChar = w.originalWord || def?.lexeme || w.word;
              const xlit = def?.transliteration || w.transliteration || "";
              const morphology = def?.morphology || "";
              const defText = translated?.def || def?.definition || "";
              const strongNum = w.strongNumber.replace(/[HG]/, "");
              const langLabel = isHebrew ? "Hebrew" : "Greek";

              return (
                <div key={`${w.strongNumber}-${i}`}>
                  {/* Word (bold) */}
                  <p style={{ fontSize: "15px", fontWeight: 800, color: T.textPrimary, marginBottom: 2 }}>
                    {displayWord}
                  </p>

                  {/* Original + transliteration in accent color */}
                  <p style={{ fontSize: isHebrew ? "18px" : "15px", color: T.accent, marginBottom: 2, direction: isHebrew ? "rtl" : "ltr", textAlign: "left" }}>
                    {originalChar}
                    {xlit && (
                      <span style={{ fontSize: "14px", direction: "ltr", display: "inline" }}>
                        {" "}({xlit})
                      </span>
                    )}
                  </p>

                  {/* Morphology in orange */}
                  {morphology && (
                    <p style={{ fontSize: "13px", color: "#e88a30", fontWeight: 500, marginBottom: 2 }}>
                      {morphology}
                    </p>
                  )}

                  {/* Strong number + definition */}
                  <p style={{ fontSize: "13px", color: T.textPrimary, lineHeight: 1.7 }}>
                    <span style={{ color: T.accent, fontWeight: 700 }}>
                      Strong's {langLabel} {strongNum}:
                    </span>{" "}
                    {defText || "Definição não disponível."}
                  </p>
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
