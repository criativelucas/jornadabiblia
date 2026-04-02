import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, BookOpen, ChevronRight, ChevronDown, Minus, Plus, Check, Loader2, Columns2, X } from "lucide-react";
import { bibleBooks, AT_BOOKS, NT_BOOKS } from "@/data/bibleBooks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useThemeContext, Eyebrow } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import {
  fetchTranslation,
  isVersionCached,
  VERSION_LABELS,
  VERSION_DESCRIPTIONS,
  type BibleVersion,
  type BibleBook as BibleDataBook,
} from "@/hooks/useBibleData";
import BookPanorama from "@/components/BookPanorama";
import QuizModal from "@/components/QuizModal";
import StrongsPanel from "@/components/StrongsPanel";
import BookSelectorModal from "@/components/BookSelectorModal";
import { fetchChapterStrongs, enrichChapterWords, type StrongsWord } from "@/services/StrongsService";

type View = "testament" | "books" | "panorama" | "chapters" | "reading";
const ALL_VERSIONS: BibleVersion[] = ["nvi", "naa", "ntlh"];

// ── Dropdown de versão ─────────────────────────────────────────────────────
function VersionPicker({
  value,
  onChange,
  T,
  label,
}: {
  value: BibleVersion;
  onChange: (v: BibleVersion | "compare") => void;
  T: any;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px 10px",
          borderRadius: "9999px",
          background: T.accentDim,
          color: T.accent,
          fontSize: "11px",
          fontWeight: 700,
          border: `1.5px solid ${T.accent}33`,
          cursor: "pointer",
        }}
      >
        {label && <span style={{ color: T.textMuted, fontWeight: 500 }}>{label}:</span>}
        {VERSION_LABELS[value]}
        <ChevronDown
          size={11}
          style={{ opacity: 0.7, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
        />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: "0.875rem",
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            zIndex: 200,
            minWidth: "160px",
          }}
        >
          {ALL_VERSIONS.map((v) => (
            <button
              key={v}
              onClick={() => {
                onChange(v);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "10px 14px",
                background: value === v ? T.accentDim : "transparent",
                color: value === v ? T.accent : T.textPrimary,
                fontSize: "13px",
                fontWeight: value === v ? 700 : 500,
                borderBottom: `1px solid ${T.border}`,
                cursor: "pointer",
              }}
            >
              <span>{VERSION_LABELS[v]}</span>
              <span style={{ fontSize: "9px", color: T.textDim }}>{VERSION_DESCRIPTIONS[v]}</span>
            </button>
          ))}
          <button
            onClick={() => {
              onChange("compare");
              setOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              width: "100%",
              padding: "10px 14px",
              background: "transparent",
              color: T.textMuted,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Columns2 size={13} /> Comparar versões
          </button>
        </div>
      )}
    </div>
  );
}

function CompareVersionPicker({
  leftVersion,
  rightVersion,
  onChangeLeft,
  onChangeRight,
  T,
}: {
  leftVersion: BibleVersion;
  rightVersion: BibleVersion;
  onChangeLeft: (v: BibleVersion) => void;
  onChangeRight: (v: BibleVersion) => void;
  T: any;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <VersionPicker value={leftVersion} onChange={(v) => v !== "compare" && onChangeLeft(v)} T={T} label="A" />
      <span style={{ fontSize: "10px", color: T.textDim }}>vs</span>
      <VersionPicker value={rightVersion} onChange={(v) => v !== "compare" && onChangeRight(v)} T={T} label="B" />
    </div>
  );
}

export default function BibleTab() {
  const { T } = useThemeContext();
  const { user } = useAuth();

  const [view, setView] = useState<View>("testament");
  const [testament, setTestament] = useState<"AT" | "NT">("AT");
  const [selectedBook, setSelectedBook] = useState<(typeof bibleBooks)[0] | null>(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState<{ verse: number; text: string }[]>([]);
  const [versesB, setVersesB] = useState<{ verse: number; text: string }[]>([]);
  const [loadingText, setLoadingText] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [markedRead, setMarkedRead] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chaptersReadForBook, setChaptersReadForBook] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizBookName, setQuizBookName] = useState("");
  const [selectedVerse, setSelectedVerse] = useState<{ number: number; text: string } | null>(null);
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [chapterWords, setChapterWords] = useState<StrongsWord[][]>([]);
  const [activeWord, setActiveWord] = useState<StrongsWord | null>(null);

  // Swipe
  const touchStart = useRef<number>(0);

  const [version, setVersionState] = useState<BibleVersion | "compare">(() => {
    const saved = localStorage.getItem("jb_preferred_version") as BibleVersion;
    return saved && ALL_VERSIONS.includes(saved) ? saved : "nvi";
  });
  const [compareLeft, setCompareLeft] = useState<BibleVersion>("nvi");
  const [compareRight, setCompareRight] = useState<BibleVersion>("naa");
  const isCompare = version === "compare";

  const [bibleData, setBibleData] = useState<BibleDataBook[] | null>(() => {
    const v = (localStorage.getItem("jb_preferred_version") as BibleVersion) || "nvi";
    if (!ALL_VERSIONS.includes(v)) return null;
    try {
      const raw = localStorage.getItem(`jb_bible_v3_${v}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [bibleDataB, setBibleDataB] = useState<BibleDataBook[] | null>(null);

  const handleVersionChange = useCallback((v: BibleVersion | "compare") => {
    setVersionState(v);
    if (v !== "compare") localStorage.setItem("jb_preferred_version", v);
  }, []);

  // Prefetch
  useEffect(() => {
    if (!isVersionCached("nvi")) fetchTranslation("nvi").then(setBibleData);
    const t1 = setTimeout(() => fetchTranslation("naa"), 2000);
    const t2 = setTimeout(() => fetchTranslation("ntlh"), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (isCompare) return;
    const v = version as BibleVersion;
    const loadData = async () => {
      if (!isVersionCached(v) && view === "reading") setLoadingText(true);
      const data = await fetchTranslation(v);
      setBibleData(data);
      setLoadingText(false);
      if (view === "reading" && selectedBook) {
        const idx = bibleBooks.findIndex((b) => b.id === selectedBook.id);
        const chData = idx >= 0 ? data[idx]?.chapters[selectedChapter - 1] : undefined;
        if (chData) setVerses(chData.map((text, i) => ({ verse: i + 1, text: text.trim() })));
      }
    };
    loadData();
  }, [version, selectedBook, selectedChapter, view, isCompare]);

  useEffect(() => {
    if (!isCompare) return;
    fetchTranslation(compareLeft).then(setBibleData);
    fetchTranslation(compareRight).then(setBibleDataB);
  }, [isCompare, compareLeft, compareRight]);

  const findBookIdx = (book: (typeof bibleBooks)[0]) => bibleBooks.findIndex((b) => b.id === book.id);

  const findBookData = (book: (typeof bibleBooks)[0], data: BibleDataBook[] | null) => {
    const idx = findBookIdx(book);
    return idx >= 0 && data ? data[idx] : undefined;
  };

  const handleSelectChapter = async (ch: number) => {
    if (!selectedBook) return;
    setSelectedChapter(ch);
    setView("reading");
    setMarkedRead(false);
    setSelectedVerse(null);
    setActiveWord(null);
    setChapterWords([]);

    // Preload interlinear data in background + enrich with lexemes
    const bkIdx = findBookIdx(selectedBook);
    if (bkIdx >= 0) {
      fetchChapterStrongs(bkIdx + 1, ch)
        .then(words => enrichChapterWords(words))
        .then(setChapterWords);
    }
    scrollRef.current?.scrollTo(0, 0);

    const bookIdx = findBookIdx(selectedBook);

    try {
      if (isCompare) {
        const bothCached = isVersionCached(compareLeft) && isVersionCached(compareRight);
        if (!bothCached) setLoadingText(true);
        const [dataA, dataB] = await Promise.all([fetchTranslation(compareLeft), fetchTranslation(compareRight)]);
        setBibleData(dataA);
        setBibleDataB(dataB);
        setVerses(dataA[bookIdx]?.chapters[ch - 1]?.map((t, i) => ({ verse: i + 1, text: t.trim() })) ?? []);
        setVersesB(dataB[bookIdx]?.chapters[ch - 1]?.map((t, i) => ({ verse: i + 1, text: t.trim() })) ?? []);
      } else {
        const ver = version as BibleVersion;
        if (!isVersionCached(ver)) setLoadingText(true);
        const data = await fetchTranslation(ver);
        setBibleData(data);
        setVerses(data[bookIdx]?.chapters[ch - 1]?.map((t, i) => ({ verse: i + 1, text: t.trim() })) ?? []);
      }
    } catch (err) {
      console.error("[BibleTab] Erro ao carregar capítulo:", err);
      toast.error("Erro ao carregar o texto. Tente novamente.");
    } finally {
      setLoadingText(false);
    }
  };

  useEffect(() => {
    if (isCompare && selectedBook && view === "reading") handleSelectChapter(selectedChapter);
  }, [compareLeft, compareRight]);

  const handleSelectTestament = (t: "AT" | "NT") => {
    setTestament(t);
    setView("books");
  };

  const handleSelectBook = async (book: (typeof bibleBooks)[0]) => {
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

  const handleMarkRead = async () => {
    if (!user || !selectedBook) {
      toast.error("Faça login para marcar como lido.");
      return;
    }
    setMarkedRead(true);
    await supabase
      .from("achievements")
      .upsert(
        { user_id: user.id, achievement_key: `chapter_${selectedBook.id}_${selectedChapter}` },
        { onConflict: "user_id,achievement_key" },
      );
    toast.success(`${selectedBook.name} ${selectedChapter} marcado como lido!`);
    const { count } = await supabase
      .from("achievements")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .like("achievement_key", `chapter_${selectedBook.id}_%`);
    const totalRead = count ?? 0;
    setChaptersReadForBook(totalRead);
    if (totalRead >= selectedBook.chapters) {
      const { data: existingQuiz } = await supabase
        .from("quiz_results")
        .select("id")
        .eq("user_id", user.id)
        .eq("book_name", selectedBook.name)
        .limit(1);
      if (!existingQuiz || existingQuiz.length === 0) {
        await supabase
          .from("achievements")
          .upsert(
            { user_id: user.id, achievement_key: `book_${selectedBook.id}` },
            { onConflict: "user_id,achievement_key" },
          );
        setTimeout(() => {
          setQuizBookName(selectedBook.name);
          setShowQuiz(true);
        }, 800);
      }
    }
  };

  const goBack = () => {
    if (view === "reading") {
      setSelectedVerse(null);
      setView("chapters");
    } else if (view === "chapters") setView("panorama");
    else if (view === "panorama") setView("books");
    else if (view === "books") setView("testament");
  };

  const goNextChapter = () => {
    if (selectedBook && selectedChapter < selectedBook.chapters) {
      handleSelectChapter(selectedChapter + 1);
    }
  };

  const goPrevChapter = () => {
    if (selectedChapter > 1) {
      handleSelectChapter(selectedChapter - 1);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 80) {
      if (diff > 0) goNextChapter();
      else goPrevChapter();
    }
  };

  // Book selector callback
  const handleBookSelectorSelect = (abbrev: string, ch: number, bookName: string) => {
    // Find matching bibleBook by searching for matching abbrev in bibleData
    const allBooks = [...AT_BOOKS, ...NT_BOOKS];
    const matchedBibleBook = allBooks.find((b) => {
      const dataBook = findBookData(b, bibleData);
      return dataBook && dataBook.abbrev === abbrev;
    });
    if (matchedBibleBook) {
      setSelectedBook(matchedBibleBook);
      handleSelectChapter(ch);
    }
  };

  const clipCard = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: "1.25rem",
    clipPath: "polygon(0 0, calc(100% - 1rem) 0, 100% 1rem, 100% 100%, 0 100%)",
  };

  const versionPills = (
    <div className="flex gap-2 mb-4 flex-wrap">
      {ALL_VERSIONS.map((v) => (
        <button
          key={v}
          onClick={() => handleVersionChange(v)}
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
      <button
        onClick={() => handleVersionChange("compare")}
        className="px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1"
        style={
          isCompare
            ? { background: T.accent, color: T.page }
            : { background: T.card2, color: T.textMuted, border: `1px solid ${T.border}` }
        }
      >
        <Columns2 size={11} /> Comparar
      </button>
    </div>
  );

  if (showQuiz && quizBookName) {
    return (
      <QuizModal
        bookName={quizBookName}
        onClose={() => {
          setShowQuiz(false);
          setQuizBookName("");
        }}
      />
    );
  }

  const activeVersion: BibleVersion = isCompare ? compareLeft : (version as BibleVersion);

  // ── Testament ──────────────────────────────────────────────────────────────
  if (view === "testament") {
    return (
      <div className="space-y-6">
        {versionPills}
        <Eyebrow accent>Bíblia Sagrada</Eyebrow>
        <h2 className="text-3xl font-black" style={{ color: T.textPrimary, letterSpacing: "-0.04em" }}>
          Escolha o Testamento
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {(["AT", "NT"] as const).map((t) => (
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
              <p className="text-sm font-bold" style={{ color: T.textPrimary }}>
                Testamento
              </p>
              <p className="text-xs mt-2" style={{ color: T.textMuted }}>
                {t === "AT" ? AT_BOOKS.length : NT_BOOKS.length} livros
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Books ──────────────────────────────────────────────────────────────────
  if (view === "books") {
    const books = testament === "AT" ? AT_BOOKS : NT_BOOKS;
    return (
      <div className="space-y-4">
        {versionPills}
        <button
          onClick={goBack}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          style={{ color: T.textMuted }}
        >
          <ArrowLeft size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
        </button>
        <Eyebrow accent>{testament === "AT" ? "Antigo Testamento" : "Novo Testamento"}</Eyebrow>
        <div className="grid grid-cols-2 gap-2">
          {books.map((book) => (
            <button
              key={book.id}
              onClick={() => handleSelectBook(book)}
              onMouseEnter={() => {
                if (!isCompare) fetchTranslation(version as BibleVersion);
                else {
                  fetchTranslation(compareLeft);
                  fetchTranslation(compareRight);
                }
              }}
              className="p-4 text-left transition-all hover:opacity-90 flex items-center gap-3"
              style={clipCard}
            >
              <BookOpen size={20} style={{ color: T.accent, flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: T.textPrimary }}>
                  {book.name}
                </p>
                <p className="text-[10px]" style={{ color: T.textMuted }}>
                  {book.chapters} capítulos
                </p>
              </div>
              <ChevronRight size={14} style={{ color: T.textDim }} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Panorama ───────────────────────────────────────────────────────────────
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

  // ── Chapters ───────────────────────────────────────────────────────────────
  if (view === "chapters" && selectedBook) {
    return (
      <div className="space-y-4">
        {versionPills}
        <button
          onClick={goBack}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          style={{ color: T.textMuted }}
        >
          <ArrowLeft size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
        </button>
        <div className="flex items-center gap-3">
          <BookOpen size={24} style={{ color: T.accent }} />
          <div>
            <Eyebrow accent>{selectedBook.category}</Eyebrow>
            <h2 className="text-2xl font-black" style={{ color: T.textPrimary, letterSpacing: "-0.04em" }}>
              {selectedBook.name}
            </h2>
            <span
              style={{
                display: "inline-block",
                marginTop: "4px",
                fontSize: "9px",
                fontWeight: 700,
                color: T.accent,
                background: T.accentDim,
                padding: "2px 8px",
                borderRadius: "9999px",
                letterSpacing: "0.05em",
              }}
            >
              {isCompare
                ? `${VERSION_LABELS[compareLeft]} vs ${VERSION_LABELS[compareRight]}`
                : VERSION_LABELS[activeVersion]}
            </span>
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

  // ── Reading — YouVersion style ─────────────────────────────────────────────
  if (view === "reading" && selectedBook) {
    const currentAbbrev = findBookData(selectedBook, bibleData)?.abbrev ?? "";

    return (
      <div ref={scrollRef}>
        {/* Sticky header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            background: T.page,
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            padding: "0.625rem 1rem",
            gap: "0.75rem",
          }}
        >
          <button
            onClick={goBack}
            style={{ color: T.textMuted, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
          >
            <ArrowLeft size={18} />
          </button>

          {/* Book + chapter selector */}
          <button
            onClick={() => setShowBookSelector(true)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: T.card2,
              border: `1px solid ${T.border}`,
              borderRadius: "9999px",
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            <span style={{ fontWeight: 900, fontSize: "14px", color: T.textPrimary, letterSpacing: "-0.02em" }}>
              {selectedBook.name} {selectedChapter}
            </span>
            <ChevronDown size={14} color={T.textMuted} />
          </button>

          {/* Version selector */}
          {isCompare ? (
            <CompareVersionPicker
              leftVersion={compareLeft}
              rightVersion={compareRight}
              onChangeLeft={setCompareLeft}
              onChangeRight={setCompareRight}
              T={T}
            />
          ) : (
            <VersionPicker value={version as BibleVersion} onChange={handleVersionChange} T={T} />
          )}

          {/* Font size controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
            <button
              onClick={() => setFontSize((s) => Math.max(14, s - 1))}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "9999px",
                background: T.card2,
                border: `1px solid ${T.border}`,
                color: T.textMuted,
                cursor: "pointer",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              −
            </button>
            <span style={{ fontSize: "11px", fontWeight: 700, color: T.textMuted, width: "28px", textAlign: "center" }}>
              {fontSize}
            </span>
            <button
              onClick={() => setFontSize((s) => Math.min(28, s + 1))}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "9999px",
                background: T.card2,
                border: `1px solid ${T.border}`,
                color: T.textMuted,
                cursor: "pointer",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </button>
          </div>

        </div>

        {/* Exit compare */}
        {isCompare && (
          <div style={{ padding: "0.5rem 1rem" }}>
            <button
              onClick={() => handleVersionChange("nvi")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                fontWeight: 700,
                color: T.accent,
                background: T.accentDim,
                border: `1px solid ${T.accent}44`,
                borderRadius: "9999px",
                padding: "5px 12px",
                cursor: "pointer",
              }}
            >
              <X size={11} /> Sair da comparação
            </button>
          </div>
        )}


        {/* Content area with swipe */}
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {loadingText ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: T.accent }} />
            </div>
          ) : isCompare ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: T.border, maxWidth: "1200px", margin: "0 auto" }}>
              {[
                { label: VERSION_LABELS[compareLeft], data: verses },
                { label: VERSION_LABELS[compareRight], data: versesB },
              ].map(({ label, data }) => (
                <div key={label} style={{ background: T.page, padding: "1.5rem" }}>
                  <p style={{ textAlign: "center", fontSize: "11px", fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.5rem" }}>
                    {label}
                  </p>
                  {data.length === 0 ? (
                    <p style={{ color: T.textMuted, fontSize: "12px" }}>Não disponível</p>
                  ) : (
                    data.map((v) => (
                      <span key={v.verse} style={{ display: "inline" }}>
                        <sup style={{ fontSize: "0.65em", fontWeight: 700, color: T.accent, marginRight: "3px", verticalAlign: "super", lineHeight: 0, userSelect: "none" }}>
                          {v.verse}
                        </sup>
                        <span style={{ fontSize: Math.max(13, fontSize - 2) + "px", color: T.textPrimary, lineHeight: 1.9, fontFamily: '"Georgia", "Times New Roman", serif' }}>
                          {v.text}{" "}
                        </span>
                      </span>
                    ))
                  )}
                </div>
              ))}
            </div>
          ) : verses.length === 0 ? (
            <div className="py-12 text-center">
              <p style={{ color: T.textMuted }}>Texto não disponível nesta tradução.</p>
            </div>
          ) : (
            /* YouVersion-style centered reading */
            <div style={{ maxWidth: "680px", margin: "0 auto", padding: "2rem 1.5rem 8rem" }}>
              <h1
                style={{
                  textAlign: "center",
                  fontSize: "1.125rem",
                  fontWeight: 900,
                  color: T.textPrimary,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: "2rem",
                  opacity: 0.9,
                }}
              >
                {selectedBook.name} {selectedChapter}
              </h1>

              {verses.map((v) => {
                const words = chapterWords[v.verse - 1] ?? [];
                const isHebrew = words[0]?.strongNumber?.startsWith("H");
                return (
                  <div key={v.verse}>
                    <span style={{ display: "inline" }}>
                      <sup
                        style={{
                          fontSize: "0.65em",
                          fontWeight: 700,
                          color: T.accent,
                          marginRight: "3px",
                          verticalAlign: "super",
                          lineHeight: 0,
                          userSelect: "none",
                        }}
                      >
                        {v.verse}
                      </sup>
                      <span
                        style={{
                          fontSize: fontSize + "px",
                          color: T.textPrimary,
                          lineHeight: 1.9,
                          fontFamily: '"Georgia", "Times New Roman", serif',
                        }}
                      >
                        {v.text}{" "}
                      </span>
                    </span>

                    {/* Interlinear chips */}
                    {words.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                          padding: "8px 0 16px",
                          direction: isHebrew ? "rtl" : "ltr",
                        }}
                      >
                        {words.map((w, wi) => (
                          <button
                            key={`${w.strongNumber}-${wi}`}
                            onClick={() => setActiveWord(w)}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "2px",
                              padding: "6px 10px",
                              borderRadius: "0.625rem",
                              background: activeWord?.strongNumber === w.strongNumber && activeWord?.word === w.word
                                ? T.accentDim : T.card2,
                              border: `1.5px solid ${activeWord?.strongNumber === w.strongNumber && activeWord?.word === w.word
                                ? T.accent : T.border}`,
                              cursor: "pointer",
                              transition: "all 0.15s",
                              minWidth: "44px",
                            }}
                          >
                            <span style={{ fontSize: "8px", fontWeight: 700, color: T.accent, letterSpacing: "0.04em" }}>
                              {w.strongNumber}
                            </span>
                            <span
                              style={{
                                fontSize: isHebrew ? "18px" : "15px",
                                fontWeight: 700,
                                color: T.textPrimary,
                                fontFamily: "serif",
                                direction: isHebrew ? "rtl" : "ltr",
                              }}
                            >
                              {w.originalWord || w.word}
                            </span>
                            {w.transliteration && (
                              <span style={{ fontSize: "9px", color: T.textMuted, fontStyle: "italic" }}>
                                {w.transliteration}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chapter navigation */}
        <div style={{ display: "flex", gap: "12px", padding: "0 1.5rem 1rem", maxWidth: "680px", margin: "0 auto" }}>
          {selectedChapter > 1 && (
            <button
              onClick={goPrevChapter}
              className="flex-1 py-3 rounded-full text-sm font-semibold transition-all"
              style={{ border: `1.5px solid ${T.border}`, color: T.textMuted }}
            >
              ← Capítulo {selectedChapter - 1}
            </button>
          )}
          {selectedChapter < selectedBook.chapters && (
            <button
              onClick={goNextChapter}
              className="flex-1 py-3 rounded-full text-sm font-semibold transition-all"
              style={{ border: `1.5px solid ${T.border}`, color: T.textMuted }}
            >
              Capítulo {selectedChapter + 1} →
            </button>
          )}
        </div>

        {/* Mark as read */}
        <div style={{ padding: "0 1.5rem 2rem", maxWidth: "680px", margin: "0 auto" }}>
          <button
            onClick={handleMarkRead}
            disabled={markedRead}
            className="w-full py-4 rounded-full text-base font-black transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: markedRead ? T.card2 : T.accent,
              color: markedRead ? T.textMuted : T.page,
              letterSpacing: "-0.02em",
            }}
          >
            {markedRead ? (
              <span className="flex items-center justify-center gap-2">
                <Check size={18} /> Lido
              </span>
            ) : (
              "Marcar como lido"
            )}
          </button>
        </div>

        {/* Strong's word detail modal */}
        {activeWord && (
          <StrongsPanel
            word={activeWord}
            onClose={() => setActiveWord(null)}
          />
        )}

        {/* Book selector modal */}
        {showBookSelector && (
          <BookSelectorModal
            currentBookAbbrev={currentAbbrev}
            currentChapter={selectedChapter}
            onSelect={handleBookSelectorSelect}
            onClose={() => setShowBookSelector(false)}
          />
        )}
      </div>
    );
  }

  return null;
}
