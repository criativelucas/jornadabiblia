export interface BibleBook {
  abbrev: string;
  book: string;
  chapters: string[][];
}

export type BibleVersion = "nvi" | "naa" | "ntlh";

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

// ── URLs com fallback: se a primeira falhar, tenta a segunda ──────────────
// Resolve o bug da comparação: NAA/NTLH via raw.githubusercontent às vezes
// retorna 404 — jsDelivr CDN é mais estável como fallback.
const VERSION_URLS: Record<BibleVersion, string[]> = {
  nvi: [
    "https://raw.githubusercontent.com/thiagobodruk/biblia/master/json/nvi.json",
    "https://cdn.jsdelivr.net/gh/thiagobodruk/biblia@master/json/nvi.json",
  ],
  naa: [
    "https://cdn.jsdelivr.net/gh/damarals/biblias@master/data/json/NAA.json",
    "https://raw.githubusercontent.com/damarals/biblias/master/data/json/NAA.json",
  ],
  ntlh: [
    "https://cdn.jsdelivr.net/gh/damarals/biblias@master/data/json/NTLH.json",
    "https://raw.githubusercontent.com/damarals/biblias/master/data/json/NTLH.json",
  ],
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

// ── Cache duplo: memória + localStorage ───────────────────────────────────
const memoryCache: Record<string, BibleBook[]> = {};
const LS_PREFIX = "jb_bible_v3_";

function lsGet(version: BibleVersion): BibleBook[] | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + version);
    return raw ? (JSON.parse(raw) as BibleBook[]) : null;
  } catch {
    return null;
  }
}

function lsSet(version: BibleVersion, data: BibleBook[]): void {
  try {
    localStorage.setItem(LS_PREFIX + version, JSON.stringify(data));
  } catch {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("jb_bible_"))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(LS_PREFIX + version, JSON.stringify(data));
    } catch {}
  }
}

// ── Evita downloads paralelos duplicados ──────────────────────────────────
const inFlight: Record<string, Promise<BibleBook[]>> = {};

// ── Fetch com fallback automático de URL ──────────────────────────────────
async function fetchWithFallback(urls: string[]): Promise<unknown> {
  let lastError: unknown;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.warn("[useBibleData] URL falhou, tentando próxima:", url);
      lastError = err;
    }
  }
  throw lastError ?? new Error("Todas as URLs falharam");
}

export async function fetchTranslation(version: BibleVersion): Promise<BibleBook[]> {
  // 1. Memória — 0ms
  if (memoryCache[version]) return memoryCache[version];

  // 2. localStorage — ~10-20ms, persiste entre sessões
  const cached = lsGet(version);
  if (cached) {
    memoryCache[version] = cached;
    return cached;
  }

  // 3. Sem fetch duplicado simultâneo
  if (inFlight[version]) return inFlight[version];

  // 4. Rede com fallback automático de URL
  inFlight[version] = (async () => {
    try {
      const raw = await fetchWithFallback(VERSION_URLS[version]);
      const isDamarals = version === "naa" || version === "ntlh";
      const data: BibleBook[] = isDamarals ? normalizeDamarals(raw as DamaralsBook[]) : (raw as BibleBook[]);

      memoryCache[version] = data;
      lsSet(version, data);
      return data;
    } finally {
      delete inFlight[version];
    }
  })();

  return inFlight[version];
}

export function isVersionCached(version: BibleVersion): boolean {
  if (memoryCache[version]) return true;
  try {
    return localStorage.getItem(LS_PREFIX + version) !== null;
  } catch {
    return false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
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
  return NT_ABBREVS.has(abbrev.toLowerCase()) ? "NT" : "AT";
}

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
