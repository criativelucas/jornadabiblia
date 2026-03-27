export interface BibleBook {
  abbrev: string;
  book: string;
  chapters: string[][];
}

export type BibleVersion = 'nvi' | 'acf' | 'aa';

const VERSION_URLS: Record<BibleVersion, string> = {
  nvi: 'https://raw.githubusercontent.com/thiagobodruk/biblia/master/json/nvi.json',
  acf: 'https://raw.githubusercontent.com/thiagobodruk/biblia/master/json/acf.json',
  aa: 'https://raw.githubusercontent.com/thiagobodruk/biblia/master/json/aa.json',
};

export const VERSION_LABELS: Record<BibleVersion, string> = {
  nvi: 'NVI',
  acf: 'ACF',
  aa: 'AA',
};

export const VERSION_DESCRIPTIONS: Record<BibleVersion, string> = {
  nvi: 'Nova',
  acf: 'Fiel',
  aa: 'Almeida',
};

const CACHE_KEY_PREFIX = 'bible_cache_v1_';
const memoryCache: Record<string, BibleBook[]> = {};

export async function fetchTranslation(version: BibleVersion): Promise<BibleBook[]> {
  // 1. Memory cache (fastest)
  if (memoryCache[version]) return memoryCache[version];

  // 2. sessionStorage (persists during session)
  try {
    const stored = sessionStorage.getItem(CACHE_KEY_PREFIX + version);
    if (stored) {
      const parsed = JSON.parse(stored);
      memoryCache[version] = parsed;
      return parsed;
    }
  } catch {}

  // 3. Network fetch
  const res = await fetch(VERSION_URLS[version]);
  const data: BibleBook[] = await res.json();

  // Save to both caches
  memoryCache[version] = data;
  try {
    sessionStorage.setItem(CACHE_KEY_PREFIX + version, JSON.stringify(data));
  } catch {} // ignore if sessionStorage is full

  return data;
}

/** Check if a version is already cached (memory or session) without fetching */
export function isVersionCached(version: BibleVersion): boolean {
  if (memoryCache[version]) return true;
  try {
    return sessionStorage.getItem(CACHE_KEY_PREFIX + version) !== null;
  } catch {
    return false;
  }
}

// Map abbrev → index in bibleBooks array for testament classification
const AT_ABBREVS = new Set([
  'gn','ex','lv','nm','dt','js','jz','rt','1sm','2sm','1rs','2rs','1cr','2cr',
  'ed','ne','et','jó','sl','pv','ec','ct','is','jr','lm','ez','dn','os','jl',
  'am','ob','jn','mq','na','hc','sf','ag','zc','ml'
]);

const NT_ABBREVS = new Set([
  'mt','mc','lc','jo','at','rm','1co','2co','gl','ef','fp','cl','1ts','2ts',
  '1tm','2tm','tt','fm','hb','tg','1pe','2pe','1jo','2jo','3jo','jd','ap'
]);

export function getTestament(abbrev: string): 'AT' | 'NT' {
  if (NT_ABBREVS.has(abbrev)) return 'NT';
  return 'AT';
}

// Map abbrev → Portuguese name from bibleBooks data
import { bibleBooks } from '@/data/bibleBooks';

const ABBREV_TO_NAME: Record<string, string> = {};
const ABBREV_ORDER = [
  'gn','ex','lv','nm','dt','js','jz','rt','1sm','2sm','1rs','2rs','1cr','2cr',
  'ed','ne','et','jó','sl','pv','ec','ct','is','jr','lm','ez','dn','os','jl',
  'am','ob','jn','mq','na','hc','sf','ag','zc','ml',
  'mt','mc','lc','jo','at','rm','1co','2co','gl','ef','fp','cl','1ts','2ts',
  '1tm','2tm','tt','fm','hb','tg','1pe','2pe','1jo','2jo','3jo','jd','ap'
];

// Build mapping: abbrev index maps 1:1 to bibleBooks index
ABBREV_ORDER.forEach((abbrev, i) => {
  if (bibleBooks[i]) {
    ABBREV_TO_NAME[abbrev] = bibleBooks[i].name;
  }
});

export function getBookName(abbrev: string): string {
  return ABBREV_TO_NAME[abbrev] || abbrev;
}

export function getBookEmoji(_abbrev: string): string {
  return '';
}

export function getBookCategory(abbrev: string): string {
  const idx = ABBREV_ORDER.indexOf(abbrev);
  return idx >= 0 && bibleBooks[idx] ? bibleBooks[idx].category : '';
}
