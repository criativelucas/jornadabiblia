export interface BibleBook {
  name: string;
  chapters: number;
  emoji: string;
  category: string;
  testament: 'AT' | 'NT';
}

export const bibleBooks: BibleBook[] = [
  // Pentateuco
  { name: "Gênesis", chapters: 50, emoji: "🌍", category: "Pentateuco", testament: "AT" },
  { name: "Êxodo", chapters: 40, emoji: "🔥", category: "Pentateuco", testament: "AT" },
  { name: "Levítico", chapters: 27, emoji: "⚖️", category: "Pentateuco", testament: "AT" },
  { name: "Números", chapters: 36, emoji: "🏕️", category: "Pentateuco", testament: "AT" },
  { name: "Deuteronômio", chapters: 34, emoji: "📜", category: "Pentateuco", testament: "AT" },
  // Históricos
  { name: "Josué", chapters: 24, emoji: "⚔️", category: "Histórico", testament: "AT" },
  { name: "Juízes", chapters: 21, emoji: "🏛️", category: "Histórico", testament: "AT" },
  { name: "Rute", chapters: 4, emoji: "🌾", category: "Histórico", testament: "AT" },
  { name: "1 Samuel", chapters: 31, emoji: "👑", category: "Histórico", testament: "AT" },
  { name: "2 Samuel", chapters: 24, emoji: "🏰", category: "Histórico", testament: "AT" },
  { name: "1 Reis", chapters: 22, emoji: "🦁", category: "Histórico", testament: "AT" },
  { name: "2 Reis", chapters: 25, emoji: "🗡️", category: "Histórico", testament: "AT" },
  { name: "1 Crônicas", chapters: 29, emoji: "📖", category: "Histórico", testament: "AT" },
  { name: "2 Crônicas", chapters: 36, emoji: "🏗️", category: "Histórico", testament: "AT" },
  { name: "Esdras", chapters: 10, emoji: "🔨", category: "Histórico", testament: "AT" },
  { name: "Neemias", chapters: 13, emoji: "🧱", category: "Histórico", testament: "AT" },
  { name: "Ester", chapters: 10, emoji: "👸", category: "Histórico", testament: "AT" },
  // Poéticos
  { name: "Jó", chapters: 42, emoji: "🌪️", category: "Poético", testament: "AT" },
  { name: "Salmos", chapters: 150, emoji: "🎵", category: "Poético", testament: "AT" },
  { name: "Provérbios", chapters: 31, emoji: "💎", category: "Poético", testament: "AT" },
  { name: "Eclesiastes", chapters: 12, emoji: "🌅", category: "Poético", testament: "AT" },
  { name: "Cantares", chapters: 8, emoji: "🌹", category: "Poético", testament: "AT" },
  // Profetas Maiores
  { name: "Isaías", chapters: 66, emoji: "🕊️", category: "Profético", testament: "AT" },
  { name: "Jeremias", chapters: 52, emoji: "😢", category: "Profético", testament: "AT" },
  { name: "Lamentações", chapters: 5, emoji: "💧", category: "Profético", testament: "AT" },
  { name: "Ezequiel", chapters: 48, emoji: "👁️", category: "Profético", testament: "AT" },
  { name: "Daniel", chapters: 12, emoji: "🔮", category: "Profético", testament: "AT" },
  // Profetas Menores
  { name: "Oséias", chapters: 14, emoji: "💔", category: "Profético", testament: "AT" },
  { name: "Joel", chapters: 3, emoji: "🦗", category: "Profético", testament: "AT" },
  { name: "Amós", chapters: 9, emoji: "🐑", category: "Profético", testament: "AT" },
  { name: "Obadias", chapters: 1, emoji: "⛰️", category: "Profético", testament: "AT" },
  { name: "Jonas", chapters: 4, emoji: "🐋", category: "Profético", testament: "AT" },
  { name: "Miquéias", chapters: 7, emoji: "🌄", category: "Profético", testament: "AT" },
  { name: "Naum", chapters: 3, emoji: "🌊", category: "Profético", testament: "AT" },
  { name: "Habacuque", chapters: 3, emoji: "🗼", category: "Profético", testament: "AT" },
  { name: "Sofonias", chapters: 3, emoji: "🔔", category: "Profético", testament: "AT" },
  { name: "Ageu", chapters: 2, emoji: "🏠", category: "Profético", testament: "AT" },
  { name: "Zacarias", chapters: 14, emoji: "🐴", category: "Profético", testament: "AT" },
  { name: "Malaquias", chapters: 4, emoji: "✉️", category: "Profético", testament: "AT" },
  // Evangelhos
  { name: "Mateus", chapters: 28, emoji: "✡️", category: "Evangelho", testament: "NT" },
  { name: "Marcos", chapters: 16, emoji: "📣", category: "Evangelho", testament: "NT" },
  { name: "Lucas", chapters: 24, emoji: "🩺", category: "Evangelho", testament: "NT" },
  { name: "João", chapters: 21, emoji: "🦅", category: "Evangelho", testament: "NT" },
  // Histórico NT
  { name: "Atos", chapters: 28, emoji: "🚀", category: "Histórico", testament: "NT" },
  // Epístolas Paulinas
  { name: "Romanos", chapters: 16, emoji: "📝", category: "Epístola", testament: "NT" },
  { name: "1 Coríntios", chapters: 16, emoji: "💌", category: "Epístola", testament: "NT" },
  { name: "2 Coríntios", chapters: 13, emoji: "💪", category: "Epístola", testament: "NT" },
  { name: "Gálatas", chapters: 6, emoji: "⛓️", category: "Epístola", testament: "NT" },
  { name: "Efésios", chapters: 6, emoji: "🛡️", category: "Epístola", testament: "NT" },
  { name: "Filipenses", chapters: 4, emoji: "😊", category: "Epístola", testament: "NT" },
  { name: "Colossenses", chapters: 4, emoji: "🌟", category: "Epístola", testament: "NT" },
  { name: "1 Tessalonicenses", chapters: 5, emoji: "⏳", category: "Epístola", testament: "NT" },
  { name: "2 Tessalonicenses", chapters: 3, emoji: "🔚", category: "Epístola", testament: "NT" },
  { name: "1 Timóteo", chapters: 6, emoji: "📋", category: "Epístola", testament: "NT" },
  { name: "2 Timóteo", chapters: 4, emoji: "🏃", category: "Epístola", testament: "NT" },
  { name: "Tito", chapters: 3, emoji: "🤝", category: "Epístola", testament: "NT" },
  { name: "Filemom", chapters: 1, emoji: "🔗", category: "Epístola", testament: "NT" },
  // Epístolas Gerais
  { name: "Hebreus", chapters: 13, emoji: "✝️", category: "Epístola", testament: "NT" },
  { name: "Tiago", chapters: 5, emoji: "🪞", category: "Epístola", testament: "NT" },
  { name: "1 Pedro", chapters: 5, emoji: "🪨", category: "Epístola", testament: "NT" },
  { name: "2 Pedro", chapters: 3, emoji: "⭐", category: "Epístola", testament: "NT" },
  { name: "1 João", chapters: 5, emoji: "❤️", category: "Epístola", testament: "NT" },
  { name: "2 João", chapters: 1, emoji: "💕", category: "Epístola", testament: "NT" },
  { name: "3 João", chapters: 1, emoji: "🤗", category: "Epístola", testament: "NT" },
  { name: "Judas", chapters: 1, emoji: "⚡", category: "Epístola", testament: "NT" },
  // Profético NT
  { name: "Apocalipse", chapters: 22, emoji: "🌈", category: "Profético", testament: "NT" },
];

// Parse a reading string like "Gênesis 1-7" or "Gênesis 50; Êxodo 1-6"
export function parseReading(reading: string): { book: string; chapters: number[] }[] {
  return reading.split(';').map(part => {
    part = part.trim();
    const match = part.match(/^(.+?)\s+(\d+)(?:-(\d+))?$/);
    if (!match) return null;
    const book = match[1];
    const start = parseInt(match[2]);
    const end = match[3] ? parseInt(match[3]) : start;
    const chapters: number[] = [];
    for (let i = start; i <= end; i++) chapters.push(i);
    return { book, chapters };
  }).filter(Boolean) as { book: string; chapters: number[] }[];
}

// Get all read chapters per book from completed days
export function getReadChaptersByBook(
  completedDays: Set<string>,
  allDays: string[],
  months: string[][]
): Map<string, Set<number>> {
  const bookChapters = new Map<string, Set<number>>();
  
  months.forEach((month, monthIndex) => {
    month.forEach((reading, dayIndex) => {
      const dayId = `${monthIndex}-${dayIndex}`;
      if (!completedDays.has(dayId)) return;
      
      const parsed = parseReading(reading);
      parsed.forEach(({ book, chapters }) => {
        if (!bookChapters.has(book)) bookChapters.set(book, new Set());
        chapters.forEach(ch => bookChapters.get(book)!.add(ch));
      });
    });
  });
  
  return bookChapters;
}
