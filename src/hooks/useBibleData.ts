export interface BibleBook {
  abbrev: string;
  book: string;
  chapters: string[][];
}

export type BibleVersion = "nvi" | "naa" | "ntlh";

// NAA/NTLH usam { name, abbrev, chapters: string[][] } — normalizar para BibleBook
interface RawBibleBook {
  abbrev: string;
  book?: string;
  name?: string;
  chapters: string[][];
}

function normalizeRaw(raw: RawBibleBook[]): BibleBook[] {
  return raw.map((b) => ({
    abbrev: (b.abbrev || "").toLowerCase(),
    book: b.book || b.name || "",
    chapters: b.chapters,
  }));
}

// ── URLs com fallback ─────────────────────────────────────────────────────
const VERSION_URLS: Record<BibleVersion, string[]> = {
  nvi: [
    "https://raw.githubusercontent.com/thiagobodruk/biblia/master/json/nvi.json",
    "https://cdn.jsdelivr.net/gh/thiagobodruk/biblia@master/json/nvi.json",
  ],
  naa: [
    "https://raw.githubusercontent.com/damarals/biblias/master/inst/json/NAA.json",
    "https://cdn.jsdelivr.net/gh/damarals/biblias@master/inst/json/NAA.json",
  ],
  ntlh: [
    "https://raw.githubusercontent.com/damarals/biblias/master/inst/json/NTLH.json",
    "https://cdn.jsdelivr.net/gh/damarals/biblias@master/inst/json/NTLH.json",
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

// ── Cache duplo: memória + IndexedDB ──────────────────────────────────────
import { bibleIdbGet, bibleIdbPut, bibleIdbHas } from "@/services/bibleOfflineStore";

const memoryCache: Record<string, BibleBook[]> = {};
const IDB_KEY_PREFIX = "bible_v4_";
const LEGACY_LS_PREFIX = "jb_bible_v3_";

// Migrate / cleanup legacy localStorage entries (offload to IndexedDB silently)
try {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("jb_bible_"))
    .forEach((k) => localStorage.removeItem(k));
} catch {}

async function idbGetVersion(version: BibleVersion): Promise<BibleBook[] | null> {
  return bibleIdbGet<BibleBook[]>(IDB_KEY_PREFIX + version);
}

async function idbSetVersion(version: BibleVersion, data: BibleBook[]): Promise<void> {
  return bibleIdbPut(IDB_KEY_PREFIX + version, data);
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
      const data: BibleBook[] = normalizeRaw(raw as RawBibleBook[]);

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
