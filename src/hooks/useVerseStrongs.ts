import { useState, useEffect } from "react";

export interface OriginalWord {
  word: string;
  strongs: string;
  translit: string;
}

export interface StrongsDefinition {
  strongs_num: string;
  lemma: string;
  xlit: string;
  pronunciation: string;
  definition: string;
  kjv_usage: string;
  language: "hebrew" | "greek";
}

const BOLLS_BOOK_ID: Record<string, number> = {
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

// Caches
const chapterCache: Record<string, { verse: number; words: OriginalWord[] }[]> = {};
const definitionCache: Record<string, StrongsDefinition> = {};

function parseStrongsFromText(text: string): OriginalWord[] {
  const words: OriginalWord[] = [];
  
  // bolls.life returns text with inline strong numbers in various formats
  // Try HTML parsing first
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  
  // Pattern: elements with data-strongs or class "strongs" or <S> tags
  const anchors = doc.querySelectorAll("[data-strongs], [data-s], .strongs, s, S");
  if (anchors.length > 0) {
    anchors.forEach(el => {
      const strongs = el.getAttribute("data-strongs") || el.getAttribute("data-s") || el.textContent?.trim() || "";
      const word = el.previousSibling?.textContent?.trim() || el.textContent?.trim() || "";
      if (strongs) {
        words.push({ word, strongs, translit: "" });
      }
    });
    if (words.length > 0) return words;
  }

  // Fallback: look for patterns like <num>word</num> or word{H123}
  // Try regex patterns for strong numbers embedded in text
  const strongPattern = /([^\s<>{}]+)\s*[{<]([HG]\d+)[}>]/g;
  let match;
  while ((match = strongPattern.exec(text)) !== null) {
    words.push({ word: match[1], strongs: match[2], translit: "" });
  }

  // Another pattern: just extract all H/G numbers from the text
  if (words.length === 0) {
    const numPattern = /([HG]\d+)/g;
    const plainText = doc.body?.textContent || text;
    const textWords = plainText.replace(/[HG]\d+/g, "").trim().split(/\s+/).filter(Boolean);
    let idx = 0;
    while ((match = numPattern.exec(text)) !== null) {
      words.push({
        word: textWords[idx] || "",
        strongs: match[1],
        translit: "",
      });
      idx++;
    }
  }

  return words;
}

export function useVerseStrongs(
  bookId: string,
  chapter: number,
  verseNumber: number,
  testament: "AT" | "NT"
) {
  const [words, setWords] = useState<OriginalWord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cacheKey = `${bookId}-${chapter}`;
    
    if (chapterCache[cacheKey]) {
      const verseData = chapterCache[cacheKey].find(v => v.verse === verseNumber);
      setWords(verseData?.words || []);
      return;
    }

    const bollsId = BOLLS_BOOK_ID[bookId];
    if (!bollsId) { setWords([]); return; }

    const translation = testament === "AT" ? "WLC" : "TRWST";

    setLoading(true);
    fetch(`https://bolls.life/get-text/${translation}/${bollsId}/${chapter}/`)
      .then(r => r.json())
      .then((verses: { verse: number; text: string }[]) => {
        const parsed = verses.map(v => ({
          verse: v.verse,
          words: parseStrongsFromText(v.text),
        }));
        chapterCache[cacheKey] = parsed;
        const verseData = parsed.find(v => v.verse === verseNumber);
        setWords(verseData?.words || []);
      })
      .catch(() => setWords([]))
      .finally(() => setLoading(false));
  }, [bookId, chapter, verseNumber, testament]);

  return { words, loading };
}

export async function fetchStrongsDefinition(strongsNum: string): Promise<StrongsDefinition | null> {
  const num = strongsNum.trim().toUpperCase();
  if (definitionCache[num]) return definitionCache[num];

  try {
    const res = await fetch(`https://bolls.life/dictionary-definition/BDBT/${num}`);
    const data = await res.json();

    if (!data || (Array.isArray(data) && data.length === 0)) return null;

    const entry = Array.isArray(data) ? data[0] : data;
    const def: StrongsDefinition = {
      strongs_num: num,
      lemma: entry.original_word || entry.lemma || entry.topic || "",
      xlit: entry.transliteration || entry.xlit || "",
      pronunciation: entry.pronunciation || entry.pron || "",
      definition: entry.definition || entry.strongs_def || entry.short_definition || "",
      kjv_usage: entry.usage || entry.kjv_def || "",
      language: num.startsWith("H") ? "hebrew" : "greek",
    };

    definitionCache[num] = def;
    return def;
  } catch {
    return null;
  }
}
