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

const CHAPTER_STORAGE_PREFIX = "strongs_chapter_v2_";
const DEFINITION_STORAGE_PREFIX = "strongs_definition_";

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

function mergeNtVerseWords(greekWords: StrongsWord[], kjvWords: StrongsWord[]): StrongsWord[] {
  if (greekWords.length === 0) return [];
  if (kjvWords.length === 0) return greekWords;

  return greekWords.map((greekWord, order) => {
    const sequentialWord = kjvWords[order];
    const matchedWord = kjvWords.find((candidate, candidateIndex) =>
      candidateIndex >= order && candidate.strongNumber === greekWord.strongNumber
    );

    return {
      ...greekWord,
      word: sequentialWord?.word || matchedWord?.word || greekWord.word,
      order,
    };
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
      const stripHtml = (s: string) => (s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      const definition: StrongsDefinition = {
        strongNumber,
        lexeme: d.lexeme ?? '',
        transliteration: d.transliteration ?? d.xlit ?? '',
        pronunciation: d.pronunciation ?? d.pron ?? '',
        definition: stripHtml(d.definition ?? ''),
        shortDefinition: d.short_definition ?? '',
        morphology: d.morphology ?? d.part_of_speech ?? '',
      };

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
