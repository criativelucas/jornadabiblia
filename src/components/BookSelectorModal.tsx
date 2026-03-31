import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { useThemeContext } from "@/contexts/ThemeContext";

interface BookInfo {
  abbrev: string;
  name: string;
  chapters: number;
}

const AT_BOOKS: BookInfo[] = [
  { abbrev: "gn", name: "Gênesis", chapters: 50 },
  { abbrev: "ex", name: "Êxodo", chapters: 40 },
  { abbrev: "lv", name: "Levítico", chapters: 27 },
  { abbrev: "nm", name: "Números", chapters: 36 },
  { abbrev: "dt", name: "Deuteronômio", chapters: 34 },
  { abbrev: "js", name: "Josué", chapters: 24 },
  { abbrev: "jz", name: "Juízes", chapters: 21 },
  { abbrev: "rt", name: "Rute", chapters: 4 },
  { abbrev: "1sm", name: "1 Samuel", chapters: 31 },
  { abbrev: "2sm", name: "2 Samuel", chapters: 24 },
  { abbrev: "1rs", name: "1 Reis", chapters: 22 },
  { abbrev: "2rs", name: "2 Reis", chapters: 25 },
  { abbrev: "1cr", name: "1 Crônicas", chapters: 29 },
  { abbrev: "2cr", name: "2 Crônicas", chapters: 36 },
  { abbrev: "ed", name: "Esdras", chapters: 10 },
  { abbrev: "ne", name: "Neemias", chapters: 13 },
  { abbrev: "et", name: "Ester", chapters: 10 },
  { abbrev: "jó", name: "Jó", chapters: 42 },
  { abbrev: "sl", name: "Salmos", chapters: 150 },
  { abbrev: "pv", name: "Provérbios", chapters: 31 },
  { abbrev: "ec", name: "Eclesiastes", chapters: 12 },
  { abbrev: "ct", name: "Cantares", chapters: 8 },
  { abbrev: "is", name: "Isaías", chapters: 66 },
  { abbrev: "jr", name: "Jeremias", chapters: 52 },
  { abbrev: "lm", name: "Lamentações", chapters: 5 },
  { abbrev: "ez", name: "Ezequiel", chapters: 48 },
  { abbrev: "dn", name: "Daniel", chapters: 12 },
  { abbrev: "os", name: "Oseias", chapters: 14 },
  { abbrev: "jl", name: "Joel", chapters: 3 },
  { abbrev: "am", name: "Amós", chapters: 9 },
  { abbrev: "ob", name: "Obadias", chapters: 1 },
  { abbrev: "jn", name: "Jonas", chapters: 4 },
  { abbrev: "mq", name: "Miquéias", chapters: 7 },
  { abbrev: "na", name: "Naum", chapters: 3 },
  { abbrev: "hc", name: "Habacuque", chapters: 3 },
  { abbrev: "sf", name: "Sofonias", chapters: 3 },
  { abbrev: "ag", name: "Ageu", chapters: 2 },
  { abbrev: "zc", name: "Zacarias", chapters: 14 },
  { abbrev: "ml", name: "Malaquias", chapters: 4 },
];

const NT_BOOKS: BookInfo[] = [
  { abbrev: "mt", name: "Mateus", chapters: 28 },
  { abbrev: "mc", name: "Marcos", chapters: 16 },
  { abbrev: "lc", name: "Lucas", chapters: 24 },
  { abbrev: "jo", name: "João", chapters: 21 },
  { abbrev: "at", name: "Atos", chapters: 28 },
  { abbrev: "rm", name: "Romanos", chapters: 16 },
  { abbrev: "1co", name: "1 Coríntios", chapters: 16 },
  { abbrev: "2co", name: "2 Coríntios", chapters: 13 },
  { abbrev: "gl", name: "Gálatas", chapters: 6 },
  { abbrev: "ef", name: "Efésios", chapters: 6 },
  { abbrev: "fp", name: "Filipenses", chapters: 4 },
  { abbrev: "cl", name: "Colossenses", chapters: 4 },
  { abbrev: "1ts", name: "1 Tessalonicenses", chapters: 5 },
  { abbrev: "2ts", name: "2 Tessalonicenses", chapters: 3 },
  { abbrev: "1tm", name: "1 Timóteo", chapters: 6 },
  { abbrev: "2tm", name: "2 Timóteo", chapters: 4 },
  { abbrev: "tt", name: "Tito", chapters: 3 },
  { abbrev: "fm", name: "Filemom", chapters: 1 },
  { abbrev: "hb", name: "Hebreus", chapters: 13 },
  { abbrev: "tg", name: "Tiago", chapters: 5 },
  { abbrev: "1pe", name: "1 Pedro", chapters: 5 },
  { abbrev: "2pe", name: "2 Pedro", chapters: 3 },
  { abbrev: "1jo", name: "1 João", chapters: 5 },
  { abbrev: "2jo", name: "2 João", chapters: 1 },
  { abbrev: "3jo", name: "3 João", chapters: 1 },
  { abbrev: "jd", name: "Judas", chapters: 1 },
  { abbrev: "ap", name: "Apocalipse", chapters: 22 },
];

interface Props {
  currentBookAbbrev: string;
  currentChapter: number;
  onSelect: (abbrev: string, chapter: number, bookName: string) => void;
  onClose: () => void;
}

export default function BookSelectorModal({ currentBookAbbrev, currentChapter, onSelect, onClose }: Props) {
  const { T } = useThemeContext();
  const [viewMode, setViewMode] = useState<"books" | "chapters">("books");
  const [testament, setTestament] = useState<"AT" | "NT">(() => {
    return NT_BOOKS.some((b) => b.abbrev === currentBookAbbrev) ? "NT" : "AT";
  });
  const [search, setSearch] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookInfo | null>(null);

  const books = testament === "AT" ? AT_BOOKS : NT_BOOKS;
  const filtered = books.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
      />

      <div
        style={{
          position: "fixed",
          zIndex: 201,
          bottom: 0,
          left: 0,
          right: 0,
          background: T.card,
          borderRadius: "1.25rem 1.25rem 0 0",
          border: `1px solid ${T.border}`,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "0.75rem 0 0" }}>
          <div style={{ width: "40px", height: "4px", borderRadius: "9999px", background: T.border }} />
        </div>

        {/* Header */}
        <div style={{ padding: "0.75rem 1.25rem 0" }}>
          {viewMode === "books" ? (
            <>
              <div style={{ display: "flex", gap: "8px", marginBottom: "0.875rem" }}>
                {(["AT", "NT"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTestament(t)}
                    style={{
                      padding: "6px 20px",
                      borderRadius: "9999px",
                      fontWeight: 700,
                      fontSize: "13px",
                      background: testament === t ? T.accent : T.card2,
                      color: testament === t ? T.page : T.textMuted,
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {t === "AT" ? "Antigo Testamento" : "Novo Testamento"}
                  </button>
                ))}
              </div>
              <div style={{ position: "relative", marginBottom: "0.75rem" }}>
                <Search
                  size={14}
                  style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: T.textDim }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar livro..."
                  style={{
                    width: "100%",
                    borderRadius: "0.75rem",
                    padding: "0.625rem 0.875rem 0.625rem 2rem",
                    background: T.card2,
                    color: T.textPrimary,
                    border: `1.5px solid ${T.border}`,
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
              <button
                onClick={() => setViewMode("books")}
                style={{ color: T.textMuted, background: "none", border: "none", cursor: "pointer" }}
              >
                <ArrowLeft size={18} />
              </button>
              <span style={{ fontWeight: 900, fontSize: "16px", color: T.textPrimary }}>
                {selectedBook?.name}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0 1.25rem 2rem" }}>
          {viewMode === "books" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "8px" }}>
              {filtered.map((book) => (
                <button
                  key={book.abbrev}
                  onClick={() => {
                    setSelectedBook(book);
                    setViewMode("chapters");
                  }}
                  style={{
                    borderRadius: "0.75rem",
                    padding: "0.75rem",
                    background: book.abbrev === currentBookAbbrev ? T.accentDim : T.card2,
                    border: `1.5px solid ${book.abbrev === currentBookAbbrev ? T.accent : T.border}`,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: "13px",
                      color: book.abbrev === currentBookAbbrev ? T.accent : T.textPrimary,
                    }}
                  >
                    {book.name}
                  </p>
                  <p style={{ fontSize: "10px", color: T.textDim, marginTop: "2px" }}>{book.chapters} caps</p>
                </button>
              ))}
            </div>
          ) : selectedBook ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => {
                const isActive = selectedBook.abbrev === currentBookAbbrev && ch === currentChapter;
                return (
                  <button
                    key={ch}
                    onClick={() => {
                      onSelect(selectedBook.abbrev, ch, selectedBook.name);
                      onClose();
                    }}
                    style={{
                      aspectRatio: "1",
                      borderRadius: "0.625rem",
                      fontWeight: 700,
                      fontSize: "14px",
                      background: isActive ? T.accent : T.card2,
                      color: isActive ? T.page : T.textPrimary,
                      border: `1px solid ${T.border}`,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
