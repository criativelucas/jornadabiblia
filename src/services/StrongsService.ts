// ─── Strong's Dictionary Service ───────────────────────────────────────────
// Uses bolls.life API for verse data and definitions
// Correct parsers for TRWST (Greek) and WLCH (Hebrew) HTML formats

// ─── Types ─────────────────────────────────────────────────────────────────
export interface OrigWord {
  word: string;      // palavra em hebraico ou grego
  strongs: string;   // ex: "H430" ou "G3056"
}

export interface StrongsEntry {
  strongs_num: string;
  lemma: string;
  xlit: string;
  pronunciation: string;
  definition: string;
  kjv_usage: string;
  language: "hebrew" | "greek";
}

// ─── Caches ────────────────────────────────────────────────────────────────
const verseCache: Record<string, OrigWord[]> = {};
const defCache: Record<string, StrongsEntry | null> = {};

// ─── Book ID mapping (PT abbreviations → bolls.life 1–66) ─────────────────
export const BOLLS_BOOK_ID: Record<string, number> = {
  gn: 1, ex: 2, lv: 3, nm: 4, dt: 5, js: 6, jz: 7, rt: 8,
  "1sm": 9, "2sm": 10, "1rs": 11, "2rs": 12, "1cr": 13, "2cr": 14,
  ed: 15, ne: 16, et: 17, "jó": 18, sl: 19, pv: 20, ec: 21, ct: 22,
  is: 23, jr: 24, lm: 25, ez: 26, dn: 27, os: 28, jl: 29, am: 30,
  ob: 31, jn: 32, mq: 33, na: 34, hc: 35, sf: 36, ag: 37, zc: 38, ml: 39,
  mt: 40, mc: 41, lc: 42, jo: 43, at: 44, rm: 45,
  "1co": 46, "2co": 47, gl: 48, ef: 49, fp: 50, cl: 51,
  "1ts": 52, "2ts": 53, "1tm": 54, "2tm": 55, tt: 56, fm: 57,
  hb: 58, tg: 59, "1pe": 60, "2pe": 61, "1jo": 62, "2jo": 63, "3jo": 64,
  jd: 65, ap: 66,
};

// Also support uppercase English abbreviations as fallback
const BOOK_ID_EN: Record<string, number> = {
  GEN: 1, EXO: 2, LEV: 3, NUM: 4, DEU: 5, JOS: 6, JDG: 7, RUT: 8,
  "1SA": 9, "2SA": 10, "1KI": 11, "2KI": 12, "1CH": 13, "2CH": 14,
  EZR: 15, NEH: 16, EST: 17, JOB: 18, PSA: 19, PRO: 20, ECC: 21, SNG: 22,
  ISA: 23, JER: 24, LAM: 25, EZK: 26, DAN: 27, HOS: 28, JOL: 29, AMO: 30,
  OBA: 31, JON: 32, MIC: 33, NAM: 34, HAB: 35, ZEP: 36, HAG: 37, ZEC: 38, MAL: 39,
  MAT: 40, MRK: 41, LUK: 42, JHN: 43, ACT: 44, ROM: 45, "1CO": 46, "2CO": 47,
  GAL: 48, EPH: 49, PHP: 50, COL: 51, "1TH": 52, "2TH": 53, "1TI": 54,
  "2TI": 55, TIT: 56, PHM: 57, HEB: 58, JAS: 59, "1PE": 60, "2PE": 61,
  "1JN": 62, "2JN": 63, "3JN": 64, JUD: 65, REV: 66,
};

function resolveBookId(bookId: string): number | undefined {
  const lower = bookId.toLowerCase();
  if (BOLLS_BOOK_ID[lower]) return BOLLS_BOOK_ID[lower];
  const upper = bookId.toUpperCase();
  if (BOOK_ID_EN[upper]) return BOOK_ID_EN[upper];
  return undefined;
}

// ─── Parser Greek NT (TRWST) ───────────────────────────────────────────────
// Format: <W>G3056</W>λόγος  — number BEFORE the word
function parseGreek(html: string): OrigWord[] {
  const results: OrigWord[] = [];
  const regex = /<W>(G\d+)<\/W>([^\s<]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const word = m[2].replace(/[.,;:!?()\[\]'"·]/g, "").trim();
    if (word) results.push({ word, strongs: m[1].toUpperCase() });
  }
  return results;
}

// ─── Parser Hebrew AT (WLCH) ──────────────────────────────────────────────
// Format: בְּרֵאשִׁ֖ית<W>H7225</W>  — number AFTER the word
function parseHebrew(html: string): OrigWord[] {
  const results: OrigWord[] = [];
  // Remove non-W HTML tags but keep text and <W> tags
  const clean = html.replace(/<(?!\/?W)[^>]+>/g, " ");
  const regex = /([^\s<>]+?)\s*<W>(H\d+)<\/W>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(clean)) !== null) {
    const word = m[1].trim();
    if (word) results.push({ word, strongs: m[2].toUpperCase() });
  }
  return results;
}

// ─── Generic fallback parser ───────────────────────────────────────────────
// Tries multiple patterns if the specific parsers return empty
function parseFallback(html: string): OrigWord[] {
  const results: OrigWord[] = [];

  // Pattern: <W H430>word</W> or <W G3056>word</W>
  const attrPattern = /<W\s+([HG]\d+)>([^<]+)<\/W>/gi;
  let m: RegExpExecArray | null;
  while ((m = attrPattern.exec(html)) !== null) {
    const word = m[2].trim();
    if (word) results.push({ word, strongs: m[1].toUpperCase() });
  }
  if (results.length > 0) return results;

  // Pattern: data-strongs attribute
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const withAttr = temp.querySelectorAll("[data-strongs], [data-s]");
  if (withAttr.length > 0) {
    withAttr.forEach((el) => {
      const strongs = el.getAttribute("data-strongs") || el.getAttribute("data-s") || "";
      const word = el.textContent?.trim() || "";
      if (word && strongs) results.push({ word, strongs: strongs.toUpperCase() });
    });
    return results;
  }

  return results;
}

// ─── Fetch verse words with Strong's ───────────────────────────────────────
export async function fetchVerseWords(
  bookId: string,
  chapter: number,
  verseNum: number,
  testament: "AT" | "NT"
): Promise<OrigWord[]> {
  const cacheKey = `${bookId}-${chapter}-${verseNum}`;
  if (cacheKey in verseCache) return verseCache[cacheKey];

  const bollsId = resolveBookId(bookId);
  if (!bollsId) {
    console.warn("StrongsService: unknown bookId", bookId);
    verseCache[cacheKey] = [];
    return [];
  }

  // Try translations that include Strong's markup
  const translations = testament === "NT"
    ? ["TRWST", "TR"]
    : ["WLCH", "WLC"];

  for (const translation of translations) {
    try {
      const res = await fetch(
        `https://bolls.life/get-text/${translation}/${bollsId}/${chapter}/`
      );
      if (!res.ok) continue;

      const verses: { verse: number; text: string }[] = await res.json();
      const verse = verses.find((v) => v.verse === verseNum);
      if (!verse) continue;

      // Use the correct parser based on testament
      let words: OrigWord[];
      if (testament === "NT") {
        words = parseGreek(verse.text);
      } else {
        words = parseHebrew(verse.text);
      }

      // If specific parser found nothing, try fallback
      if (words.length === 0) {
        words = parseFallback(verse.text);
      }

      if (words.length > 0) {
        verseCache[cacheKey] = words;
        return words;
      }
    } catch (err) {
      console.warn(`StrongsService: ${translation} failed for ${bookId} ${chapter}:${verseNum}`, err);
      continue;
    }
  }

  verseCache[cacheKey] = [];
  return [];
}

// ─── Fetch definition by Strong's number ───────────────────────────────────
// bolls.life/dictionary-definition/BDBT/{H430}
export async function getStrongsDefinition(num: string): Promise<StrongsEntry | null> {
  const key = num.toUpperCase().trim();
  if (key in defCache) return defCache[key];

  try {
    const res = await fetch(`https://bolls.life/dictionary-definition/BDBT/${key}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data || (Array.isArray(data) && data.length === 0)) {
      defCache[key] = null;
      return null;
    }

    const d = Array.isArray(data) ? data[0] : data;
    const entry: StrongsEntry = {
      strongs_num: key,
      lemma: d.original_word ?? d.lemma ?? d.topic ?? "",
      xlit: d.transliteration ?? d.xlit ?? "",
      pronunciation: d.pronunciation ?? d.pron ?? "",
      definition: d.definition ?? d.strongs_def ?? d.short_definition ?? "",
      kjv_usage: d.usage ?? d.kjv_def ?? "",
      language: key.startsWith("H") ? "hebrew" : "greek",
    };

    defCache[key] = entry;
    return entry;
  } catch (err) {
    console.error("StrongsService getDefinition error:", err, "key:", key);
    defCache[key] = null;
    return null;
  }
}
