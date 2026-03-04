export interface BibleBook {
  id: string;
  name: string;
  chapters: number;
  emoji: string;
  category: string;
  testament: "AT" | "NT";
}

export const bibleBooks: BibleBook[] = [
  // Pentateuco
  { id: "GEN", name: "Gênesis", chapters: 50, emoji: "🌍", category: "Pentateuco", testament: "AT" },
  { id: "EXO", name: "Êxodo", chapters: 40, emoji: "🔥", category: "Pentateuco", testament: "AT" },
  { id: "LEV", name: "Levítico", chapters: 27, emoji: "⚖️", category: "Pentateuco", testament: "AT" },
  { id: "NUM", name: "Números", chapters: 36, emoji: "🏕️", category: "Pentateuco", testament: "AT" },
  { id: "DEU", name: "Deuteronômio", chapters: 34, emoji: "📜", category: "Pentateuco", testament: "AT" },
  // Históricos
  { id: "JOS", name: "Josué", chapters: 24, emoji: "⚔️", category: "Histórico", testament: "AT" },
  { id: "JDG", name: "Juízes", chapters: 21, emoji: "🏛️", category: "Histórico", testament: "AT" },
  { id: "RUT", name: "Rute", chapters: 4, emoji: "🌾", category: "Histórico", testament: "AT" },
  { id: "1SA", name: "1 Samuel", chapters: 31, emoji: "👑", category: "Histórico", testament: "AT" },
  { id: "2SA", name: "2 Samuel", chapters: 24, emoji: "🏰", category: "Histórico", testament: "AT" },
  { id: "1KI", name: "1 Reis", chapters: 22, emoji: "🦁", category: "Histórico", testament: "AT" },
  { id: "2KI", name: "2 Reis", chapters: 25, emoji: "🗡️", category: "Histórico", testament: "AT" },
  { id: "1CH", name: "1 Crônicas", chapters: 29, emoji: "📖", category: "Histórico", testament: "AT" },
  { id: "2CH", name: "2 Crônicas", chapters: 36, emoji: "🏗️", category: "Histórico", testament: "AT" },
  { id: "EZR", name: "Esdras", chapters: 10, emoji: "🔨", category: "Histórico", testament: "AT" },
  { id: "NEH", name: "Neemias", chapters: 13, emoji: "🧱", category: "Histórico", testament: "AT" },
  { id: "EST", name: "Ester", chapters: 10, emoji: "👸", category: "Histórico", testament: "AT" },
  // Poéticos
  { id: "JOB", name: "Jó", chapters: 42, emoji: "🌪️", category: "Poético", testament: "AT" },
  { id: "PSA", name: "Salmos", chapters: 150, emoji: "🎵", category: "Poético", testament: "AT" },
  { id: "PRO", name: "Provérbios", chapters: 31, emoji: "💎", category: "Poético", testament: "AT" },
  { id: "ECC", name: "Eclesiastes", chapters: 12, emoji: "🌅", category: "Poético", testament: "AT" },
  { id: "SNG", name: "Cantares", chapters: 8, emoji: "🌹", category: "Poético", testament: "AT" },
  // Profetas Maiores
  { id: "ISA", name: "Isaías", chapters: 66, emoji: "🕊️", category: "Profético", testament: "AT" },
  { id: "JER", name: "Jeremias", chapters: 52, emoji: "😢", category: "Profético", testament: "AT" },
  { id: "LAM", name: "Lamentações", chapters: 5, emoji: "💧", category: "Profético", testament: "AT" },
  { id: "EZK", name: "Ezequiel", chapters: 48, emoji: "👁️", category: "Profético", testament: "AT" },
  { id: "DAN", name: "Daniel", chapters: 12, emoji: "🔮", category: "Profético", testament: "AT" },
  // Profetas Menores
  { id: "HOS", name: "Oséias", chapters: 14, emoji: "💔", category: "Profético", testament: "AT" },
  { id: "JOL", name: "Joel", chapters: 3, emoji: "🦗", category: "Profético", testament: "AT" },
  { id: "AMO", name: "Amós", chapters: 9, emoji: "🐑", category: "Profético", testament: "AT" },
  { id: "OBA", name: "Obadias", chapters: 1, emoji: "⛰️", category: "Profético", testament: "AT" },
  { id: "JON", name: "Jonas", chapters: 4, emoji: "🐋", category: "Profético", testament: "AT" },
  { id: "MIC", name: "Miquéias", chapters: 7, emoji: "🌄", category: "Profético", testament: "AT" },
  { id: "NAM", name: "Naum", chapters: 3, emoji: "🌊", category: "Profético", testament: "AT" },
  { id: "HAB", name: "Habacuque", chapters: 3, emoji: "🗼", category: "Profético", testament: "AT" },
  { id: "ZEP", name: "Sofonias", chapters: 3, emoji: "🔔", category: "Profético", testament: "AT" },
  { id: "HAG", name: "Ageu", chapters: 2, emoji: "🏠", category: "Profético", testament: "AT" },
  { id: "ZEC", name: "Zacarias", chapters: 14, emoji: "🐴", category: "Profético", testament: "AT" },
  { id: "MAL", name: "Malaquias", chapters: 4, emoji: "✉️", category: "Profético", testament: "AT" },
  // Evangelhos
  { id: "MAT", name: "Mateus", chapters: 28, emoji: "✡️", category: "Evangelho", testament: "NT" },
  { id: "MRK", name: "Marcos", chapters: 16, emoji: "📣", category: "Evangelho", testament: "NT" },
  { id: "LUK", name: "Lucas", chapters: 24, emoji: "🩺", category: "Evangelho", testament: "NT" },
  { id: "JHN", name: "João", chapters: 21, emoji: "🦅", category: "Evangelho", testament: "NT" },
  // Histórico NT
  { id: "ACT", name: "Atos", chapters: 28, emoji: "🚀", category: "Histórico", testament: "NT" },
  // Epístolas Paulinas
  { id: "ROM", name: "Romanos", chapters: 16, emoji: "📝", category: "Epístola", testament: "NT" },
  { id: "1CO", name: "1 Coríntios", chapters: 16, emoji: "💌", category: "Epístola", testament: "NT" },
  { id: "2CO", name: "2 Coríntios", chapters: 13, emoji: "💪", category: "Epístola", testament: "NT" },
  { id: "GAL", name: "Gálatas", chapters: 6, emoji: "⛓️", category: "Epístola", testament: "NT" },
  { id: "EPH", name: "Efésios", chapters: 6, emoji: "🛡️", category: "Epístola", testament: "NT" },
  { id: "PHP", name: "Filipenses", chapters: 4, emoji: "😊", category: "Epístola", testament: "NT" },
  { id: "COL", name: "Colossenses", chapters: 4, emoji: "🌟", category: "Epístola", testament: "NT" },
  { id: "1TH", name: "1 Tessalonicenses", chapters: 5, emoji: "⏳", category: "Epístola", testament: "NT" },
  { id: "2TH", name: "2 Tessalonicenses", chapters: 3, emoji: "🔚", category: "Epístola", testament: "NT" },
  { id: "1TI", name: "1 Timóteo", chapters: 6, emoji: "📋", category: "Epístola", testament: "NT" },
  { id: "2TI", name: "2 Timóteo", chapters: 4, emoji: "🏃", category: "Epístola", testament: "NT" },
  { id: "TIT", name: "Tito", chapters: 3, emoji: "🤝", category: "Epístola", testament: "NT" },
  { id: "PHM", name: "Filemom", chapters: 1, emoji: "🔗", category: "Epístola", testament: "NT" },
  // Epístolas Gerais
  { id: "HEB", name: "Hebreus", chapters: 13, emoji: "✝️", category: "Epístola", testament: "NT" },
  { id: "JAS", name: "Tiago", chapters: 5, emoji: "🪞", category: "Epístola", testament: "NT" },
  { id: "1PE", name: "1 Pedro", chapters: 5, emoji: "🪨", category: "Epístola", testament: "NT" },
  { id: "2PE", name: "2 Pedro", chapters: 3, emoji: "⭐", category: "Epístola", testament: "NT" },
  { id: "1JN", name: "1 João", chapters: 5, emoji: "❤️", category: "Epístola", testament: "NT" },
  { id: "2JN", name: "2 João", chapters: 1, emoji: "💕", category: "Epístola", testament: "NT" },
  { id: "3JN", name: "3 João", chapters: 1, emoji: "🤗", category: "Epístola", testament: "NT" },
  { id: "JUD", name: "Judas", chapters: 1, emoji: "⚡", category: "Epístola", testament: "NT" },
  // Profético NT
  { id: "REV", name: "Apocalipse", chapters: 22, emoji: "🌈", category: "Profético", testament: "NT" },
];

// Helpers para o BibleReader e BibleSidebar
export const AT_BOOKS = bibleBooks.filter((b) => b.testament === "AT");
export const NT_BOOKS = bibleBooks.filter((b) => b.testament === "NT");

export function getBook(id: string) {
  return bibleBooks.find((b) => b.id === id);
}

export function getBookByName(name: string) {
  return bibleBooks.find((b) => b.name === name);
}

export function chapterId(bookId: string, chapter: number) {
  return `${bookId}.${chapter}`;
}

export function bookNameToId(name: string): string | undefined {
  return bibleBooks.find((b) => b.name === name)?.id;
}

// Parse a reading string like "Gênesis 1-7" or "Gênesis 50; Êxodo 1-6"
export function parseReading(reading: string): { book: string; chapters: number[] }[] {
  return reading
    .split(";")
    .map((part) => {
      part = part.trim();
      const match = part.match(/^(.+?)\s+(\d+)(?:-(\d+))?$/);
      if (!match) return null;
      const book = match[1];
      const start = parseInt(match[2]);
      const end = match[3] ? parseInt(match[3]) : start;
      const chapters: number[] = [];
      for (let i = start; i <= end; i++) chapters.push(i);
      return { book, chapters };
    })
    .filter(Boolean) as { book: string; chapters: number[] }[];
}

// Get all read chapters per book from completed days
export function getReadChaptersByBook(
  completedDays: Set<string>,
  allDays: string[],
  months: string[][],
): Map<string, Set<number>> {
  const bookChapters = new Map<string, Set<number>>();

  months.forEach((month, monthIndex) => {
    month.forEach((reading, dayIndex) => {
      const dayId = `${monthIndex}-${dayIndex}`;
      if (!completedDays.has(dayId)) return;

      const parsed = parseReading(reading);
      parsed.forEach(({ book, chapters }) => {
        if (!bookChapters.has(book)) bookChapters.set(book, new Set());
        chapters.forEach((ch) => bookChapters.get(book)!.add(ch));
      });
    });
  });

  return bookChapters;
}
