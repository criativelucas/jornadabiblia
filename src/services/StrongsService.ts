/**
 * StrongsService — uses bolls.life KJV (OT with Strong's) and TISCH (Greek NT with Strong's)
 * Definitions from bolls.life/dictionary-definition/BDBT/
 */

import {
  offlineGetChapter,
  offlineSetChapter,
  offlineGetDefinition,
  offlineSetDefinition,
} from "@/services/lexiconOfflineStore";

export interface StrongsWord {
  word: string;           // displayed word (English for OT via KJV, Greek for NT via TISCH)
  originalWord: string;   // original Hebrew/Greek from definition (filled async via enrichment)
  strongNumber: string;   // e.g. "H7225" or "G3056"
  transliteration: string;
  order: number;
}

export interface StrongsDefinition {
  strongNumber: string;
  lexeme: string;
  transliteration: string;
  pronunciation: string;
  definition: string;
  shortDefinition: string;
  morphology: string;
}

// Caches
const chapterCache = new Map<string, StrongsWord[][]>();
const definitionCache = new Map<string, StrongsDefinition | null>();
const inFlightChapter = new Map<string, Promise<StrongsWord[][]>>();
const inFlightDef = new Map<string, Promise<StrongsDefinition | null>>();

const CHAPTER_STORAGE_PREFIX = "strongs_chapter_v3_";
const DEFINITION_STORAGE_PREFIX = "strongs_definition_v3_";

/**
 * Strip HTML tags and collapse whitespace.
 */
function stripHtml(s: string): string {
  return (s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Decode common HTML entities.
 */
function decodeEntities(s: string): string {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Extract the original-language word from the definition HTML.
 * Greek lexemes live inside <el>...</el>, Hebrew inside <he>...</he>.
 * Strips Unicode combining marks that come through as garbled chars
 * when the field is naively concatenated (e.g. "ὁἠτό" instead of "ὁ").
 */
function extractLexemeFromHtml(html: string, isGreek: boolean): string {
  if (!html) return '';
  const tag = isGreek ? 'el' : 'he';
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i').exec(html);
  if (!match) return '';
  return decodeEntities(match[1]).replace(/<[^>]*>/g, '').trim();
}

/**
 * Extract the *clean* definition text (without "Original / Transliteration /
 * Phonetic / Definition:" preamble that bolls.life embeds in the HTML).
 *
 * Greek (Thayer-style):  text after "Definition:" up to "Origin:" / "Strongs:"
 * Hebrew (BDB-style):    text inside the BDB Definition <ol>...</ol>
 */
function extractCleanDefinition(html: string, isGreek: boolean): string {
  if (!html) return '';

  if (isGreek) {
    // Take everything after "Definition:" and stop before metadata blocks.
    const afterDef = html.split(/Definition:\s*<\/p>|Definition:\s*<\/b>|Definition:/i)[1] ?? html;
    const beforeMeta = afterDef.split(/(?:- )?(?:Origin|TDNT entry|Part\(s\) of speech|Strongs):/i)[0] ?? afterDef;
    return stripHtml(beforeMeta);
  }

  // Hebrew: BDB Definition is wrapped in <ol>
  const olMatch = /<ol[\s\S]*?<\/ol>/i.exec(html);
  if (olMatch) {
    // Convert <li> into numbered bullets for readability
    const olHtml = olMatch[0]
      .replace(/<\/li>\s*<li>/gi, '; ')
      .replace(/<li>/gi, '')
      .replace(/<\/li>/gi, '');
    return stripHtml(olHtml);
  }

  const afterDef = html.split(/BDB Definition[^:]*:\s*<\/?[^>]*>?/i)[1] ?? html;
  const beforeMeta = afterDef.split(/(?:Origin|TWOT entry|Part\(s\) of speech):/i)[0] ?? afterDef;
  return stripHtml(beforeMeta);
}

/**
 * Strip Unicode combining marks that often come through corrupted from
 * the API and make the original word look garbled.
 */
function cleanLexeme(s: string): string {
  if (!s) return '';
  // Some Greek entries (e.g. G3588 article ὁ/ἡ/τό) come concatenated as
  // "ὁἡτό". If the lexeme has 3+ chars but no spaces and starts with a
  // standalone form, prefer the API's `lexeme` field which is usually
  // already a single canonical form. Otherwise return as-is.
  return s.normalize('NFC').trim();
}

function parseStrongsEntry(strongNumber: string, d: any): StrongsDefinition {
  const isGreek = strongNumber.startsWith('G');
  const rawHtml: string = d?.definition ?? '';

  // For Greek, the API's `lexeme` field is usually the cleanest canonical
  // form (e.g. "ὁ" for the article). The HTML <el> tag often contains
  // multiple inflected forms concatenated together ("ὁἡτό"). Prefer API field.
  // For Hebrew, prefer the API field which already contains vowel pointing.
  const apiLexeme = (d?.lexeme ?? '').trim();
  const htmlLexeme = extractLexemeFromHtml(rawHtml, isGreek);
  const lexeme = cleanLexeme(apiLexeme || htmlLexeme);

  const cleanDef = extractCleanDefinition(rawHtml, isGreek);

  return {
    strongNumber,
    lexeme,
    transliteration: (d?.transliteration ?? d?.xlit ?? '').trim(),
    pronunciation: (d?.pronunciation ?? d?.pron ?? '').trim(),
    definition: cleanDef,
    shortDefinition: (d?.short_definition ?? '').trim(),
    morphology: (d?.morphology ?? d?.part_of_speech ?? '').trim(),
  };
}

function readSessionCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeSessionCache(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors to avoid breaking the lexicon flow.
  }
}

/**
 * Parse KJV/TISCH verse HTML: word<S>number</S>
 */
function parseVerse(html: string, isNT: boolean, strongPrefix?: "H" | "G"): StrongsWord[] {
  const words: StrongsWord[] = [];
  const regex = /([^<]*?)<S>(\d+)<\/S>/g;
  let match: RegExpExecArray | null;
  let order = 0;

  while ((match = regex.exec(html)) !== null) {
    const rawWord = match[1].replace(/[.,;:!?"'(){}]/g, '').trim();
    const num = match[2];
    if (!rawWord && !num) continue;

    const prefix = strongPrefix ?? (isNT ? 'G' : 'H');
    const strongNumber = `${prefix}${num}`;

    words.push({
      word: rawWord || '•',
      originalWord: '',
      strongNumber,
      transliteration: '',
      order: order++,
    });
  }

  return words;
}

/**
 * Align KJV English words to Greek words by Strong's number (NOT position).
 * Greek and English have different word orders, so positional mapping
 * produces wrong results (e.g. "and" mapped to λόγος).
 *
 * Strategy: for each Greek word, find the closest unused KJV word with
 * the SAME strong number. If none exists, leave the Greek word as the
 * display word (do NOT invent a mapping).
 */
function mergeNtVerseWords(greekWords: StrongsWord[], kjvWords: StrongsWord[]): StrongsWord[] {
  if (greekWords.length === 0) return [];
  if (kjvWords.length === 0) {
    return greekWords.map((w, order) => ({ ...w, order }));
  }

  const used = new Set<number>();

  return greekWords.map((greekWord, order) => {
    // Find the closest unused KJV word with same Strong number
    let bestIdx = -1;
    let bestDistance = Infinity;
    kjvWords.forEach((candidate, idx) => {
      if (used.has(idx)) return;
      if (candidate.strongNumber !== greekWord.strongNumber) return;
      const distance = Math.abs(idx - order);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIdx = idx;
      }
    });

    if (bestIdx >= 0) {
      used.add(bestIdx);
      return {
        ...greekWord,
        word: kjvWords[bestIdx].word || greekWord.word,
        order,
      };
    }

    // No KJV match — keep Greek word as display
    return { ...greekWord, order };
  });
}

/**
 * Fetch all Strong's words for a chapter.
 */
export async function fetchChapterStrongs(
  bookNumber: number,
  chapter: number
): Promise<StrongsWord[][]> {
  const isNT = bookNumber > 39;
  const translation = isNT ? 'TISCH' : 'KJV';
  const cacheKey = `${translation}-${bookNumber}-${chapter}`;

  if (chapterCache.has(cacheKey)) return chapterCache.get(cacheKey)!;
  if (inFlightChapter.has(cacheKey)) return inFlightChapter.get(cacheKey)!;

  const persistedChapter = readSessionCache<StrongsWord[][]>(`${CHAPTER_STORAGE_PREFIX}${cacheKey}`);
  if (persistedChapter) {
    chapterCache.set(cacheKey, persistedChapter);
    return persistedChapter;
  }

  // Try IndexedDB (persistent offline storage across sessions)
  const offlineChapter = await offlineGetChapter<StrongsWord[][]>(cacheKey);
  if (offlineChapter && offlineChapter.length > 0) {
    chapterCache.set(cacheKey, offlineChapter);
    writeSessionCache(`${CHAPTER_STORAGE_PREFIX}${cacheKey}`, offlineChapter);
    return offlineChapter;
  }

  const promise = (async () => {
    try {
      const result = isNT
        ? await (async () => {
            const [greekRes, kjvRes] = await Promise.all([
              fetch(`https://bolls.life/get-chapter/TISCH/${bookNumber}/${chapter}/`),
              fetch(`https://bolls.life/get-chapter/KJV/${bookNumber}/${chapter}/`),
            ]);

            if (!greekRes.ok) throw new Error(`HTTP ${greekRes.status}`);
            if (!kjvRes.ok) throw new Error(`HTTP ${kjvRes.status}`);

            const greekVerses: { verse: number; text: string }[] = await greekRes.json();
            const kjvVerses: { verse: number; text: string }[] = await kjvRes.json();
            if (!greekVerses || greekVerses.length === 0) return [];

            greekVerses.sort((a, b) => a.verse - b.verse);
            kjvVerses.sort((a, b) => a.verse - b.verse);

            return greekVerses.map((verse) => {
              const greekWords = parseVerse(verse.text, true, 'G');
              const kjvVerse = kjvVerses.find((item) => item.verse === verse.verse);
              const kjvWords = kjvVerse ? parseVerse(kjvVerse.text, false, 'G') : [];
              return mergeNtVerseWords(greekWords, kjvWords);
            });
          })()
        : await (async () => {
            const res = await fetch(`https://bolls.life/get-chapter/${translation}/${bookNumber}/${chapter}/`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const verses: { verse: number; text: string }[] = await res.json();
            if (!verses || verses.length === 0) return [];

            verses.sort((a, b) => a.verse - b.verse);
            return verses.map(v => parseVerse(v.text, false));
          })();

      chapterCache.set(cacheKey, result);
      writeSessionCache(`${CHAPTER_STORAGE_PREFIX}${cacheKey}`, result);
      if (result.length > 0) {
        void offlineSetChapter(cacheKey, result);
      }
      return result;
    } catch (err) {
      console.error('[StrongsService] chapter fetch error:', err);
      return [];
    } finally {
      inFlightChapter.delete(cacheKey);
    }
  })();

  inFlightChapter.set(cacheKey, promise);
  return promise;
}

/**
 * Fetch Strong's definition.
 */
export async function fetchStrongsDefinition(
  strongNumber: string
): Promise<StrongsDefinition | null> {
  if (definitionCache.has(strongNumber)) return definitionCache.get(strongNumber)!;
  if (inFlightDef.has(strongNumber)) return inFlightDef.get(strongNumber)!;

  const persistedDefinition = readSessionCache<StrongsDefinition | null>(`${DEFINITION_STORAGE_PREFIX}${strongNumber}`);
  if (persistedDefinition) {
    definitionCache.set(strongNumber, persistedDefinition);
    return persistedDefinition;
  }

  // Try IndexedDB (persistent offline storage)
  const offlineDef = await offlineGetDefinition<StrongsDefinition>(strongNumber);
  if (offlineDef) {
    definitionCache.set(strongNumber, offlineDef);
    writeSessionCache(`${DEFINITION_STORAGE_PREFIX}${strongNumber}`, offlineDef);
    return offlineDef;
  }

  const promise = (async () => {
    try {
      const url = `https://bolls.life/dictionary-definition/BDBT/${strongNumber}/`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: any[] = await res.json();
      if (!data || data.length === 0) {
        definitionCache.set(strongNumber, null);
        return null;
      }

      const d = data[0];
      const definition = parseStrongsEntry(strongNumber, d);

      definitionCache.set(strongNumber, definition);
      writeSessionCache(`${DEFINITION_STORAGE_PREFIX}${strongNumber}`, definition);
      void offlineSetDefinition(strongNumber, definition);
      return definition;
    } catch (err) {
      console.error('[StrongsService] definition fetch error:', err);
      definitionCache.set(strongNumber, null);
      return null;
    } finally {
      inFlightDef.delete(strongNumber);
    }
  })();

  inFlightDef.set(strongNumber, promise);
  return promise;
}

/**
 * Batch-enrich chapter words with lexeme/transliteration from definitions.
 * After this, each word's `originalWord` and `transliteration` fields are populated.
 */
export async function enrichChapterWords(words: StrongsWord[][]): Promise<StrongsWord[][]> {
  // Collect unique strong numbers
  const uniqueNums = new Set<string>();
  for (const verse of words) {
    for (const w of verse) {
      uniqueNums.add(w.strongNumber);
    }
  }

  // Fetch definitions with throttling to avoid 429s
  const nums = Array.from(uniqueNums);
  const batchSize = 5;
  for (let i = 0; i < nums.length; i += batchSize) {
    const batch = nums.slice(i, i + batchSize);
    await Promise.all(batch.map(n => fetchStrongsDefinition(n)));
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < nums.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // Enrich words with definition data
  return words.map(verse =>
    verse.map(w => {
      const def = definitionCache.get(w.strongNumber);
      if (def) {
        return {
          ...w,
          originalWord: def.lexeme || w.word,
          transliteration: def.transliteration || w.transliteration,
        };
      }
      return w;
    })
  );
}
