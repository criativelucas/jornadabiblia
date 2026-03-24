// ─── Strong's Dictionary Service ───────────────────────────────────────────
// Uses bolls.life API for definitions and verse data
// Caches aggressively to minimize network requests

const defCache: Record<string, StrongsEntry | null> = {};
const verseCache: Record<string, OrigWord[]> = {};

export interface StrongsEntry {
  strongs_num: string;
  lemma: string;
  xlit: string;
  pronunciation: string;
  definition: string;
  kjv_usage: string;
  language: "hebrew" | "greek";
}

export interface OrigWord {
  word: string;
  strongs: string;
}

// ─── Fetch definition by Strong's number ────────────────────────────────────
export async function getStrongsDefinition(num: string): Promise<StrongsEntry | null> {
  const key = num.toUpperCase().trim();
  if (key in defCache) return defCache[key];

  try {
    const res = await fetch(`https://bolls.life/dictionary-definition/BDBT/${key}`);
    if (!res.ok) throw new Error("not found");
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
  } catch {
    defCache[key] = null;
    return null;
  }
}

// ─── Extract words with Strong's from bolls.life HTML ───────────────────────
export function extractWordsFromHTML(html: string): OrigWord[] {
  const words: OrigWord[] = [];

  // Pattern 1: <W H430>word</W> or <W G3056>word</W>
  const wTagPattern = /<W\s+([HG]\d+)>([^<]+)<\/W>/gi;
  let match;
  while ((match = wTagPattern.exec(html)) !== null) {
    const strongs = match[1].toUpperCase();
    const word = match[2].trim();
    if (word && strongs) words.push({ word, strongs });
  }
  if (words.length > 0) return words;

  // Pattern 2: <a data-strongs="H430">word</a>
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const withAttr = temp.querySelectorAll("[data-strongs], [data-s]");
  if (withAttr.length > 0) {
    withAttr.forEach((el) => {
      const strongs = el.getAttribute("data-strongs") || el.getAttribute("data-s") || "";
      const word = el.textContent?.trim() || "";
      if (word && strongs) words.push({ word, strongs: strongs.toUpperCase() });
    });
    return words;
  }

  // Pattern 3: <S>H430</S> after word
  const sPattern = /([^\s<>]+)\s*<S>([HG]?\d+)<\/S>/gi;
  while ((match = sPattern.exec(html)) !== null) {
    const word = match[1].replace(/<[^>]+>/g, "").trim();
    let strongs = match[2].toUpperCase();
    if (/^\d+$/.test(strongs)) strongs = "H" + strongs; // default to Hebrew if no prefix
    if (word && strongs) words.push({ word, strongs });
  }
  if (words.length > 0) return words;

  // Pattern 4: inline patterns like word{H430} or word<sub>H430</sub>
  const inlinePattern = /([^\s<>{}]+)\s*[{<](?:sub>)?([HG]\d+)[}>](?:<\/sub>)?/gi;
  while ((match = inlinePattern.exec(html)) !== null) {
    words.push({ word: match[1].trim(), strongs: match[2].toUpperCase() });
  }
  if (words.length > 0) return words;

  // Pattern 5: just extract all H/G numbers with surrounding text
  const plainText = temp.textContent || html.replace(/<[^>]+>/g, "");
  const numPattern = /([HG]\d+)/gi;
  const textParts = plainText.replace(/[HG]\d+/gi, "|SPLIT|").split("|SPLIT|").map(s => s.trim()).filter(Boolean);
  let idx = 0;
  while ((match = numPattern.exec(html)) !== null) {
    const word = textParts[idx] || "";
    // Split word by spaces and take last word
    const lastWord = word.split(/\s+/).pop() || "";
    words.push({ word: lastWord, strongs: match[1].toUpperCase() });
    idx++;
  }

  return words;
}

// ─── Book ID mapping (uppercase abbreviations → bolls.life 1-66) ────────────
export const BOOK_ID: Record<string, number> = {
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

// ─── Fetch verse words from bolls.life ──────────────────────────────────────
export async function fetchVerseWords(
  bookId: string,
  chapter: number,
  verseNum: number,
  testament: "AT" | "NT"
): Promise<OrigWord[]> {
  const cacheKey = `${bookId}-${chapter}-${verseNum}`;
  if (verseCache[cacheKey]) return verseCache[cacheKey];

  const bollsId = BOOK_ID[bookId.toUpperCase()];
  if (!bollsId) return [];

  // Try multiple translations that include Strong's
  const translations = testament === "NT"
    ? ["TRWST", "TR"]  // Textus Receptus With Strong's, fallback to TR
    : ["WLCH", "WLC"]; // Westminster Leningrad Codex with Hebrew Strong's

  for (const translation of translations) {
    try {
      const res = await fetch(
        `https://bolls.life/get-text/${translation}/${bollsId}/${chapter}/`
      );
      if (!res.ok) continue;
      const verses: { verse: number; text: string }[] = await res.json();
      const verse = verses.find((v) => v.verse === verseNum);
      if (!verse) continue;

      const words = extractWordsFromHTML(verse.text);
      if (words.length > 0) {
        verseCache[cacheKey] = words;
        return words;
      }
    } catch {
      continue;
    }
  }

  verseCache[cacheKey] = [];
  return [];
}
