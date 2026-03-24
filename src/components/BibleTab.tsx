import { useState, useEffect, useRef } from "react";
import { ArrowLeft, BookOpen, ChevronRight, Minus, Plus, Check, Loader2 } from "lucide-react";
import { bibleBooks, AT_BOOKS, NT_BOOKS } from "@/data/bibleBooks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useThemeContext, Eyebrow } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { fetchTranslation, getTestament, VERSION_LABELS, type BibleVersion, type BibleBook as BibleDataBook } from "@/hooks/useBibleData";
import { Skeleton } from "@/components/ui/skeleton";
import BookPanorama from "@/components/BookPanorama";
import QuizModal from "@/components/QuizModal";
import StrongsPanel from "@/components/StrongsPanel";

type View = "testament" | "books" | "panorama" | "chapters" | "reading";

export default function BibleTab() {
  const { T } = useThemeContext();
  const { user } = useAuth();
  const [view, setView] = useState<View>("testament");
  const [testament, setTestament] = useState<"AT" | "NT">("AT");
  const [selectedBook, setSelectedBook] = useState<typeof bibleBooks[0] | null>(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState<{ verse: number; text: string }[]>([]);
  const [loadingText, setLoadingText] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [markedRead, setMarkedRead] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chaptersReadForBook, setChaptersReadForBook] = useState(0);

  const [version, setVersion] = useState<BibleVersion>("nvi");
  const [bibleData, setBibleData] = useState<BibleDataBook[] | null>(null);
  const [loadingBible, setLoadingBible] = useState(false);

  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizBookName, setQuizBookName] = useState("");

  // Strong's panel state
  const [selectedVerse, setSelectedVerse] = useState<{ number: number; text: string } | null>(null);

  useEffect(() => {
    setLoadingBible(true);
    fetchTranslation(version)
      .then(setBibleData)
      .finally(() => setLoadingBible(false));
  }, [version]);

  const findBookData = (bookName: string): BibleDataBook | undefined => {
    if (!bibleData) return undefined;
    const bookIndex = bibleBooks.findIndex((b) => b.name === bookName);
    if (bookIndex >= 0 && bibleData[bookIndex]) return bibleData[bookIndex];
    return undefined;
  };

  const handleSelectTestament = (t: "AT" | "NT") => {
    setTestament(t);
    setView("books");
  };

  const handleSelectBook = async (book: typeof bibleBooks[0]) => {
    setSelectedBook(book);
    let readCount = 0;
    if (user) {
      const { count } = await supabase
        .from("achievements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .like("achievement_key", `chapter_${book.id}_%`);
      readCount = count ?? 0;
    }
    setChaptersReadForBook(readCount);
    setView("panorama");
  };

  const handleSelectChapter = (ch: number) => {
    if (!selectedBook) return;
    setSelectedChapter(ch);
    setView("reading");
    setMarkedRead(false);
    setSelectedVerse(null);
    setLoadingText(true);

    const bookData = findBookData(selectedBook.name);
    if (bookData && bookData.chapters[ch - 1]) {
      const chapterVerses = bookData.chapters[ch - 1].map((text, i) => ({
        verse: i + 1,
        text: text.trim(),
      }));
      setVerses(chapterVerses);
    } else {
      setVerses([]);
    }
    setLoadingText(false);
    scrollRef.current?.scrollTo(0, 0);
  };

  const handleMarkRead = async () => {
    if (!user || !selectedBook) {
      toast.error("Faça login para marcar como lido.");
      return;
    }
    setMarkedRead(true);
    await supabase
      .from("achievements")
      .upsert({
        user_id: user.id,
        achievement_key: `chapter_${selectedBook.id}_${selectedChapter}`,
      }, { onConflict: 'user_id,achievement_key' });

    toast.success(`${selectedBook.name} ${selectedChapter} marcado como lido!`);

    // Check if the entire book is now complete
    const { count } = await supabase
      .from("achievements")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .like("achievement_key", `chapter_${selectedBook.id}_%`);

    const totalRead = count ?? 0;
    setChaptersReadForBook(totalRead);

    if (totalRead >= selectedBook.chapters) {
      // Check if quiz was already done for this book
      const { data: existingQuiz } = await supabase
        .from("quiz_results")
        .select("id")
        .eq("user_id", user.id)
        .eq("book_name", selectedBook.name)
        .limit(1);

      if (!existingQuiz || existingQuiz.length === 0) {
        // Record book achievement
        await supabase
          .from("achievements")
          .upsert({
            user_id: user.id,
            achievement_key: `book_${selectedBook.id}`,
          }, { onConflict: 'user_id,achievement_key' });

        // Show quiz after a short delay
        setTimeout(() => {
          setQuizBookName(selectedBook.name);
          setShowQuiz(true);
        }, 800);
      }
    }
  };

  const goBack = () => {
    if (view === "reading") { setSelectedVerse(null); setView("chapters"); }
    else if (view === "chapters") setView("panorama");
    else if (view === "panorama") setView("books");
    else if (view === "books") setView("testament");
  };

  const clipCard = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: "1.25rem",
    clipPath: "polygon(0 0, calc(100% - 1rem) 0, 100% 1rem, 100% 100%, 0 100%)",
  };

  const versions: BibleVersion[] = ["nvi", "acf", "aa"];

  const versionPills = (
    <div className="flex gap-2 mb-4">
      {versions.map((v) => (
        <button
          key={v}
          onClick={() => setVersion(v)}
          className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
          style={
            version === v
              ? { background: T.accent, color: T.page }
              : { background: T.card2, color: T.textMuted, border: `1px solid ${T.border}` }
          }
        >
          {VERSION_LABELS[v]}
        </button>
      ))}
    </div>
  );

  // Quiz modal
  if (showQuiz && quizBookName) {
    return <QuizModal bookName={quizBookName} onClose={() => { setShowQuiz(false); setQuizBookName(""); }} />;
  }

  if (loadingBible && !bibleData) {
    return (
      <div className="space-y-4">
        {versionPills}
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="skeleton-shimmer h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── Testament selector
  if (view === "testament") {
    return (
      <div className="space-y-6">
        {versionPills}
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

  // ── Book grid
  if (view === "books") {
    const books = testament === "AT" ? AT_BOOKS : NT_BOOKS;
    return (
      <div className="space-y-4">
        {versionPills}
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
              <BookOpen size={20} style={{ color: T.accent, flexShrink: 0 }} />
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

  // ── Panorama view
  if (view === "panorama" && selectedBook) {
    return (
      <div>
        {versionPills}
        <BookPanorama
          book={selectedBook}
          chaptersRead={chaptersReadForBook}
          onContinue={() => setView("chapters")}
          onBack={goBack}
        />
      </div>
    );
  }

  // ── Chapter list
  if (view === "chapters" && selectedBook) {
    return (
      <div className="space-y-4">
        {versionPills}
        <button onClick={goBack} className="flex items-center gap-2 hover:opacity-70 transition-opacity" style={{ color: T.textMuted }}>
          <ArrowLeft size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
        </button>
        <div className="flex items-center gap-3">
          <BookOpen size={24} style={{ color: T.accent }} />
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

  // ── Reading view
  if (view === "reading" && selectedBook) {
    return (
      <div className="space-y-4" ref={scrollRef}>
        <div className="flex items-center justify-between">
          <button onClick={goBack} className="flex items-center gap-2 hover:opacity-70 transition-opacity" style={{ color: T.textMuted }}>
            <ArrowLeft size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Capítulos</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.accentDim, color: T.accent }}>
              {VERSION_LABELS[version]}
            </span>
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
          <BookOpen size={20} style={{ color: T.accent }} />
          <div>
            <Eyebrow accent>{selectedBook.name}</Eyebrow>
            <h2 className="text-2xl font-black" style={{ color: T.textPrimary, letterSpacing: "-0.04em" }}>
              Capítulo {selectedChapter}
            </h2>
          </div>
        </div>

        {/* Hint: tap verse for Strong's */}
        <p style={{ fontSize: "10px", color: T.textMuted, fontStyle: "italic" }}>
          Toque em um versículo para abrir o Dicionário Strong
        </p>

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
              <span
                key={v.verse}
                onClick={() => setSelectedVerse({ number: v.verse, text: v.text })}
                style={{
                  cursor: "pointer",
                  borderRadius: selectedVerse?.number === v.verse ? "4px" : undefined,
                  background: selectedVerse?.number === v.verse ? T.accentDim : undefined,
                  padding: selectedVerse?.number === v.verse ? "2px 4px" : undefined,
                  transition: "background 0.2s",
                }}
              >
                <sup className="font-black mr-1" style={{ color: T.accent, fontSize: "0.65em" }}>{v.verse}</sup>
                <span style={{ color: T.textPrimary }}>{v.text} </span>
              </span>
            ))}
          </div>
        )}

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

        <button
          onClick={handleMarkRead}
          disabled={markedRead}
          className="w-full py-4 rounded-full text-base font-black transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: markedRead ? T.card2 : T.accent, color: markedRead ? T.textMuted : T.page, letterSpacing: "-0.02em" }}
        >
          {markedRead ? (
            <span className="flex items-center justify-center gap-2"><Check size={18} /> Lido</span>
          ) : (
            "Marcar como lido"
          )}
        </button>

        {/* Strong's modal */}
        {selectedVerse && (
          <StrongsPanel
            verse={selectedVerse}
            bookId={selectedBook.id}
            chapter={selectedChapter}
            bookTestament={selectedBook.testament}
            onClose={() => setSelectedVerse(null)}
          />
        )}
      </div>
    );
  }

  return null;
}
