export interface BibleBook {
  abbrev: string;
  book: string;
  chapters: string[][];
}

export type BibleVersion = "nvi" | "naa" | "ntlh";

// ─── Formato do repositório damarals/biblias (NAA e NTLH) ─────────────────
interface DamaralsVerse {
  verse: number;
  text: string;
}
interface DamaralsChapter {
  chapter: number;
  verses: DamaralsVerse[];
}
interface DamaralsBook {
  book: string;
  abbrev: string;
  chapters: DamaralsChapter[];
}

function normalizeDamarals(raw: DamaralsBook[]): BibleBook[] {
  return raw.map((book) => ({
    abbrev: book.abbrev,
    book: book.book,
    chapters: book.chapters.map((ch) => ch.verses.map((v) => v.text)),
  }));
}

const VERSION_URLS: Record<BibleVersion, string> = {
  nvi: "https://raw.githubusercontent.com/thiagobodruk/biblia/master/json/nvi.json",
  naa: "https://cdn.jsdelivr.net/gh/damarals/biblias@master/data/json/NAA.json",
  ntlh: "https://cdn.jsdelivr.net/gh/damarals/biblias@master/data/json/NTLH.json",
};

export const VERSION_LABELS: Record<BibleVersion, string> = {
  nvi: "NVI",
  naa: "NAA",
  ntlh: "NTLH",
};

export const VERSION_DESCRIPTIONS: Record<BibleVersion, string> = {
  nvi: "Internacional",
  naa: "Atualizada",
  ntlh: "Ling. Hoje",
};

// ─── Cache duplo: memória + sessionStorage ────────────────────────────────
const CACHE_KEY_PREFIX = "bible_cache_v2_";
const memoryCache: Record<string, BibleBook[]> = {};

export async function fetchTranslation(version: BibleVersion): Promise<BibleBook[]> {
  // 1. Memória — instantâneo
  if (memoryCache[version]) return memoryCache[version];

  // 2. sessionStorage — persiste durante a sessão
  try {
    const stored = sessionStorage.getItem(CACHE_KEY_PREFIX + version);
    if (stored) {
      const parsed = JSON.parse(stored) as BibleBook[];
      memoryCache[version] = parsed;
      return parsed;
    }
  } catch {}

  // 3. Rede
  const res = await fetch(VERSION_URLS[version]);
  if (!res.ok) throw new Error(`Erro ao carregar ${version}: HTTP ${res.status}`);
  const raw = await res.json();

  // NAA e NTLH têm formato diferente — normaliza
  const isDamarals = version === "naa" || version === "ntlh";
  const data: BibleBook[] = isDamarals ? normalizeDamarals(raw) : raw;

  memoryCache[version] = data;
  try {
    sessionStorage.setItem(CACHE_KEY_PREFIX + version, JSON.stringify(data));
  } catch {}

  return data;
}

/** Verifica se uma versão já está em cache sem fazer fetch */
export function isVersionCached(version: BibleVersion): boolean {
  if (memoryCache[version]) return true;
  try {
    return sessionStorage.getItem(CACHE_KEY_PREFIX + version) !== null;
  } catch {
    return false;
  }
}

// ─── Helpers de testamento ────────────────────────────────────────────────
const NT_ABBREVS = new Set([
  "mt",
  "mc",
  "lc",
  "jo",
  "at",
  "rm",
  "1co",
  "2co",
  "gl",
  "ef",
  "fp",
  "cl",
  "1ts",
  "2ts",
  "1tm",
  "2tm",
  "tt",
  "fm",
  "hb",
  "tg",
  "1pe",
  "2pe",
  "1jo",
  "2jo",
  "3jo",
  "jd",
  "ap",
]);

export function getTestament(abbrev: string): "AT" | "NT" {
  if (NT_ABBREVS.has(abbrev)) return "NT";
  return "AT";
}

// ─── Mapeamento abbrev → nome PT ──────────────────────────────────────────
import { bibleBooks } from "@/data/bibleBooks";

const ABBREV_ORDER = [
  "gn",
  "ex",
  "lv",
  "nm",
  "dt",
  "js",
  "jz",
  "rt",
  "1sm",
  "2sm",
  "1rs",
  "2rs",
  "1cr",
  "2cr",
  "ed",
  "ne",
  "et",
  "jó",
  "sl",
  "pv",
  "ec",
  "ct",
  "is",
  "jr",
  "lm",
  "ez",
  "dn",
  "os",
  "jl",
  "am",
  "ob",
  "jn",
  "mq",
  "na",
  "hc",
  "sf",
  "ag",
  "zc",
  "ml",
  "mt",
  "mc",
  "lc",
  "jo",
  "at",
  "rm",
  "1co",
  "2co",
  "gl",
  "ef",
  "fp",
  "cl",
  "1ts",
  "2ts",
  "1tm",
  "2tm",
  "tt",
  "fm",
  "hb",
  "tg",
  "1pe",
  "2pe",
  "1jo",
  "2jo",
  "3jo",
  "jd",
  "ap",
];

const ABBREV_TO_NAME: Record<string, string> = {};
ABBREV_ORDER.forEach((abbrev, i) => {
  if (bibleBooks[i]) ABBREV_TO_NAME[abbrev] = bibleBooks[i].name;
});

export function getBookName(abbrev: string): string {
  return ABBREV_TO_NAME[abbrev] || abbrev;
}
export function getBookEmoji(_abbrev: string): string {
  return "";
}
export function getBookCategory(abbrev: string): string {
  const idx = ABBREV_ORDER.indexOf(abbrev);
  return idx >= 0 && bibleBooks[idx] ? bibleBooks[idx].category : "";
}
