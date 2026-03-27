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

// ─── Cache em memória (instantâneo) ───────────────────────────────────────
const memoryCache: Record<string, BibleBook[]> = {};

// ─── Cache em localStorage (persiste entre sessões) ───────────────────────
// Diferença crítica vs sessionStorage: não apaga ao fechar a aba.
// Na segunda visita ao app, a Bíblia já está salva localmente → carrega em <50ms.
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
    // Se localStorage estiver cheio, remove entradas antigas e tenta novamente
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("jb_bible_"))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(LS_PREFIX + version, JSON.stringify(data));
    } catch {}
  }
}

// ─── Promessas em voo — evita fetch duplicado se chamado duas vezes seguidas ──
const inFlight: Record<string, Promise<BibleBook[]>> = {};

export async function fetchTranslation(version: BibleVersion): Promise<BibleBook[]> {
  // 1. Memória — 0ms
  if (memoryCache[version]) return memoryCache[version];

  // 2. localStorage — ~5-20ms (persiste entre sessões)
  const cached = lsGet(version);
  if (cached) {
    memoryCache[version] = cached;
    return cached;
  }

  // 3. Evita downloads paralelos da mesma versão
  if (inFlight[version]) return inFlight[version];

  // 4. Rede
  inFlight[version] = (async () => {
    const res = await fetch(VERSION_URLS[version]);
    if (!res.ok) throw new Error(`Erro ao carregar ${version}: HTTP ${res.status}`);
    const raw = await res.json();

    const isDamarals = version === "naa" || version === "ntlh";
    const data: BibleBook[] = isDamarals ? normalizeDamarals(raw) : raw;

    memoryCache[version] = data;
    lsSet(version, data); // salva para próximas visitas
    delete inFlight[version];
    return data;
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

// ─── Helpers ──────────────────────────────────────────────────────────────
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
