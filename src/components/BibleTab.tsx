import { useState, useEffect, useRef } from "react";
import { ArrowLeft, BookOpen, ChevronRight, Minus, Plus, Check, Loader2 } from "lucide-react";
import { bibleBooks, AT_BOOKS, NT_BOOKS } from "@/data/bibleBooks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useThemeContext, Eyebrow } from "@/contexts/ThemeContext";
import { toast } from "sonner";

// ─── Book name → bible-api slug mapping ───────────────────────────────────────
const SLUG_MAP: Record<string, string> = {
  "Gênesis": "genesis", "Êxodo": "exodus", "Levítico": "leviticus", "Números": "numbers",
  "Deuteronômio": "deuteronomy", "Josué": "joshua", "Juízes": "judges", "Rute": "ruth",
  "1 Samuel": "1samuel", "2 Samuel": "2samuel", "1 Reis": "1kings", "2 Reis": "2kings",
  "1 Crônicas": "1chronicles", "2 Crônicas": "2chronicles", "Esdras": "ezra", "Neemias": "nehemiah",
  "Ester": "esther", "Jó": "job", "Salmos": "psalms", "Provérbios": "proverbs",
  "Eclesiastes": "ecclesiastes", "Cantares": "song of solomon", "Isaías": "isaiah", "Jeremias": "jeremiah",
  "Lamentações": "lamentations", "Ezequiel": "ezekiel", "Daniel": "daniel", "Oséias": "hosea",
  "Joel": "joel", "Amós": "amos", "Obadias": "obadiah", "Jonas": "jonah", "Miquéias": "micah",
  "Naum": "nahum", "Habacuque": "habakkuk", "Sofonias": "zephaniah", "Ageu": "haggai",
  "Zacarias": "zechariah", "Malaquias": "malachi", "Mateus": "matthew", "Marcos": "mark",
  "Lucas": "luke", "João": "john", "Atos": "acts", "Romanos": "romans",
  "1 Coríntios": "1corinthians", "2 Coríntios": "2corinthians", "Gálatas": "galatians",
  "Efésios": "ephesians", "Filipenses": "philippians", "Colossenses": "colossians",
  "1 Tessalonicenses": "1thessalonians", "2 Tessalonicenses": "2thessalonians",
  "1 Timóteo": "1timothy", "2 Timóteo": "2timothy", "Tito": "titus", "Filemom": "philemon",
  "Hebreus": "hebrews", "Tiago": "james", "1 Pedro": "1peter", "2 Pedro": "2peter",
  "1 João": "1john", "2 João": "2john", "3 João": "3john", "Judas": "jude", "Apocalipse": "revelation",
};

interface Verse {
  verse: number;
  text: string;
}

// Cache
const chapterCache = new Map<string, Verse[]>();

async function fetchChapter(bookName: string, chapter: number): Promise<Verse[]> {
  const key = `${bookName}:${chapter}`;
  if (chapterCache.has(key)) return chapterCache.get(key)!;

  const slug = SLUG_MAP[bookName];
  if (!slug) return [];

  try {
    const resp = await fetch(`https://bible-api.com/${slug}+${chapter}?translation=almeida`);
    if (!resp.ok) throw new Error("fetch failed");
    const data = await resp.json();
    const verses: Verse[] = (data.verses || []).map((v: { verse: number; text: string }) => ({
      verse: v.verse,
      text: v.text.trim(),
    }));
    chapterCache.set(key, verses);
    return verses;
  } catch {
    return [];
  }
}

type View = "testament" | "books" | "chapters" | "reading";

export default function BibleTab() {
  const { T } = useThemeContext();
  const { user } = useAuth();
  const [view, setView] = useState<View>("testament");
  const [testament, setTestament] = useState<"AT" | "NT">("AT");
  const [selectedBook, setSelectedBook] = useState<typeof bibleBooks[0] | null>(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loadingText, setLoadingText] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [markedRead, setMarkedRead] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Read progress for selected book
  const [readChapters, setReadChapters] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user || !selectedBook) return;
    // Load which chapters of this book have been read
    supabase
      .from("completed_days")
      .select("day_index, month_index")
      .eq("user_id", user.id)
      .then(({ data }) => {
        // This is a simplified check - for a full implementation you'd parse the plan days
        // For now we track via achievements
      });
  }, [user, selectedBook]);

  const handleSelectTestament = (t: "AT" | "NT") => {
    setTestament(t);
    setView("books");
  };

  const handleSelectBook = (book: typeof bibleBooks[0]) => {
    setSelectedBook(book);
    setView("chapters");
  };

  const handleSelectChapter = async (ch: number) => {
    if (!selectedBook) return;
    setSelectedChapter(ch);
    setView("reading");
    setMarkedRead(false);
    setLoadingText(true);
    const v = await fetchChapter(selectedBook.name, ch);
    setVerses(v);
    setLoadingText(false);
    scrollRef.current?.scrollTo(0, 0);
  };

  const handleMarkRead = async () => {
    if (!user || !selectedBook) {
      toast.error("Faça login para marcar como lido.");
      return;
    }
    setMarkedRead(true);
    // Insert achievement
    await (supabase as unknown as { from: (t: string) => { insert: (r: Record<string, unknown>) => { select: () => Promise<unknown> } } })
      .from("achievements")
      .insert({
        user_id: user.id,
        achievement_key: `chapter_${selectedBook.id}_${selectedChapter}`,
      })
      .select();
    toast.success(`${selectedBook.name} ${selectedChapter} marcado como lido! ✓`);
  };

  const goBack = () => {
    if (view === "reading") setView("chapters");
    else if (view === "chapters") setView("books");
    else if (view === "books") setView("testament");
  };

  const clipCard = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: "1.25rem",
    clipPath: "polygon(0 0, calc(100% - 1rem) 0, 100% 1rem, 100% 100%, 0 100%)",
  };

  // ── Testament selector ─────────────────────────────
  if (view === "testament") {
    return (
      <div className="space-y-6">
        <Eyebrow accent>Bíblia Sagrada</Eyebrow>
        <h2 className="text-3xl font-black" style={{ color: T.textPrimary, letterSpacing: "-0.04em" }}>
          Escolha o Testamento
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {(["AT", "NT"] as const).map((t) => {
            const count = t === "AT" ? AT_BOOKS.length : NT_BOOKS.length;
            return (
              <button
                key={t}
                onClick={() => handleSelectTestament(t)}
                className="p-6 text-left transition-all hover:opacity-90"
                style={clipCard}
              >
                <BookOpen className="w-8 h-8 mb-3" style={{ color: T.accent }} />
                <p className="text-lg font-black" style={{ color: T.textPrimary, letterSpacing: "-0.03em" }}>
                  {t === "AT" ? "Antigo" : "Novo"}
                </p>
                <p className="text-sm font-bold" style={{ color: T.textPrimary }}>Testamento</p>
                <p className="text-xs mt-2" style={{ color: T.textMuted }}>{count} livros</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Book grid ──────────────────────────────────────
  if (view === "books") {
    const books = testament === "AT" ? AT_BOOKS : NT_BOOKS;
    return (
      <div className="space-y-4">
        <button onClick={goBack} className="flex items-center gap-2 hover:opacity-70 transition-opacity" style={{ color: T.textMuted }}>
          <ArrowLeft size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
        </button>
        <Eyebrow accent>{testament === "AT" ? "Antigo Testamento" : "Novo Testamento"}</Eyebrow>
        <div className="grid grid-cols-2 gap-2">
          {books.map((book) => (
            <button
              key={book.id}
              onClick={() => handleSelectBook(book)}
              className="p-4 text-left transition-all hover:opacity-90 flex items-center gap-3"
              style={clipCard}
            >
              <span className="text-xl">{book.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: T.textPrimary }}>{book.name}</p>
                <p className="text-[10px]" style={{ color: T.textMuted }}>{book.chapters} capítulos</p>
              </div>
              <ChevronRight size={14} style={{ color: T.textDim }} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Chapter list ───────────────────────────────────
  if (view === "chapters" && selectedBook) {
    return (
      <div className="space-y-4">
        <button onClick={goBack} className="flex items-center gap-2 hover:opacity-70 transition-opacity" style={{ color: T.textMuted }}>
          <ArrowLeft size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{selectedBook.emoji}</span>
          <div>
            <Eyebrow accent>{selectedBook.category}</Eyebrow>
            <h2 className="text-2xl font-black" style={{ color: T.textPrimary, letterSpacing: "-0.04em" }}>{selectedBook.name}</h2>
          </div>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
          {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
            <button
              key={ch}
              onClick={() => handleSelectChapter(ch)}
              className="aspect-square flex items-center justify-center text-sm font-bold rounded-xl transition-all hover:opacity-80"
              style={{ background: T.card2, color: T.textPrimary, border: `1px solid ${T.border}` }}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Reading view ───────────────────────────────────
  if (view === "reading" && selectedBook) {
    return (
      <div className="space-y-4" ref={scrollRef}>
        <div className="flex items-center justify-between">
          <button onClick={goBack} className="flex items-center gap-2 hover:opacity-70 transition-opacity" style={{ color: T.textMuted }}>
            <ArrowLeft size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Capítulos</span>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setFontSize((s) => Math.max(12, s - 2))} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.card2, color: T.textMuted }}>
              <Minus size={14} />
            </button>
            <span className="text-xs font-bold" style={{ color: T.textMuted }}>A</span>
            <button onClick={() => setFontSize((s) => Math.min(28, s + 2))} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.card2, color: T.textMuted }}>
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xl">{selectedBook.emoji}</span>
          <div>
            <Eyebrow accent>{selectedBook.name}</Eyebrow>
            <h2 className="text-2xl font-black" style={{ color: T.textPrimary, letterSpacing: "-0.04em" }}>
              Capítulo {selectedChapter}
            </h2>
          </div>
        </div>

        {loadingText ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: T.accent }} />
          </div>
        ) : verses.length === 0 ? (
          <div className="py-12 text-center">
            <p style={{ color: T.textMuted }}>Texto não disponível nesta tradução.</p>
          </div>
        ) : (
          <div className="p-5 leading-relaxed" style={{ ...clipCard, fontSize }}>
            {verses.map((v) => (
              <span key={v.verse}>
                <sup className="font-black mr-1" style={{ color: T.accent, fontSize: "0.65em" }}>{v.verse}</sup>
                <span style={{ color: T.textPrimary }}>{v.text} </span>
              </span>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {selectedChapter > 1 && (
            <button
              onClick={() => handleSelectChapter(selectedChapter - 1)}
              className="flex-1 py-3 rounded-full text-sm font-semibold transition-all"
              style={{ border: `1.5px solid ${T.border}`, color: T.textMuted }}
            >
              ← Capítulo {selectedChapter - 1}
            </button>
          )}
          {selectedChapter < selectedBook.chapters && (
            <button
              onClick={() => handleSelectChapter(selectedChapter + 1)}
              className="flex-1 py-3 rounded-full text-sm font-semibold transition-all"
              style={{ border: `1.5px solid ${T.border}`, color: T.textMuted }}
            >
              Capítulo {selectedChapter + 1} →
            </button>
          )}
        </div>

        {/* Mark as read */}
        <button
          onClick={handleMarkRead}
          disabled={markedRead}
          className="w-full py-4 rounded-full text-base font-black transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: markedRead ? T.card2 : T.accent, color: markedRead ? T.textMuted : T.page, letterSpacing: "-0.02em" }}
        >
          {markedRead ? (
            <span className="flex items-center justify-center gap-2"><Check size={18} /> Lido ✓</span>
          ) : (
            "Marcar como lido"
          )}
        </button>
      </div>
    );
  }

  return null;
}
