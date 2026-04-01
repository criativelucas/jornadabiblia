/**
 * StrongsService — uses bolls.life KJV (OT with Strong's) and TISCH (Greek NT with Strong's)
 * Definitions from bolls.life/dictionary-definition/BDBT/
 */

export interface StrongsWord {
  word: string;           // displayed word (English for OT via KJV, Greek for NT via TISCH)
  originalWord: string;   // original Hebrew/Greek from definition (filled async)
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
}

// Caches
const chapterCache = new Map<string, StrongsWord[][]>();
const definitionCache = new Map<string, StrongsDefinition | null>();
const inFlightChapter = new Map<string, Promise<StrongsWord[][]>>();
const inFlightDef = new Map<string, Promise<StrongsDefinition | null>>();

/**
 * Parse KJV/TISCH verse HTML: word<S>number</S>
 * OT (KJV): English words, numbers are Hebrew (prefix H)
 * NT (TISCH): Greek words, numbers are Greek (prefix G)
 */
function parseVerse(html: string, isNT: boolean): StrongsWord[] {
  const words: StrongsWord[] = [];
  // Match: text before <S> tag, then number inside <S>
  const regex = /([^<]*?)<S>(\d+)<\/S>/g;
  let match: RegExpExecArray | null;
  let order = 0;

  while ((match = regex.exec(html)) !== null) {
    const rawWord = match[1].replace(/[.,;:!?"'()\[\]{}]/g, '').trim();
    const num = match[2];
    if (!rawWord && !num) continue;

    const prefix = isNT ? 'G' : 'H';
    const strongNumber = `${prefix}${num}`;

    words.push({
      word: rawWord || '•',
      originalWord: '', // will be filled from definition
      strongNumber,
      transliteration: '',
      order: order++,
    });
  }

  return words;
}

/**
 * Fetch all Strong's words for a chapter.
 * OT (bookNumber 1-39): uses KJV (English + Strong's H numbers)
 * NT (bookNumber 40-66): uses TISCH (Greek + Strong's G numbers)
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

  const promise = (async () => {
    try {
      const url = `https://bolls.life/get-chapter/${translation}/${bookNumber}/${chapter}/`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const verses: { verse: number; text: string }[] = await res.json();
      if (!verses || verses.length === 0) return [];

      verses.sort((a, b) => a.verse - b.verse);
      const result = verses.map(v => parseVerse(v.text, isNT));
      chapterCache.set(cacheKey, result);
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
 * Fetch Strong's definition. Returns lexeme (original word), transliteration, etc.
 */
export async function fetchStrongsDefinition(
  strongNumber: string
): Promise<StrongsDefinition | null> {
  if (definitionCache.has(strongNumber)) return definitionCache.get(strongNumber)!;
  if (inFlightDef.has(strongNumber)) return inFlightDef.get(strongNumber)!;

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
      // Strip HTML from definition
      const stripHtml = (s: string) => (s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      const definition: StrongsDefinition = {
        strongNumber,
        lexeme: d.lexeme ?? '',
        transliteration: d.transliteration ?? d.xlit ?? '',
        pronunciation: d.pronunciation ?? d.pron ?? '',
        definition: stripHtml(d.definition ?? ''),
        shortDefinition: d.short_definition ?? '',
      };

      definitionCache.set(strongNumber, definition);
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
