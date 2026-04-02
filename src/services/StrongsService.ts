/**
 * StrongsService — uses bolls.life KJV (OT with Strong's) and TISCH (Greek NT with Strong's)
 * Definitions from bolls.life/dictionary-definition/BDBT/
 */

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
}

// Caches
const chapterCache = new Map<string, StrongsWord[][]>();
const definitionCache = new Map<string, StrongsDefinition | null>();
const inFlightChapter = new Map<string, Promise<StrongsWord[][]>>();
const inFlightDef = new Map<string, Promise<StrongsDefinition | null>>();

/**
 * Parse KJV/TISCH verse HTML: word<S>number</S>
 */
function parseVerse(html: string, isNT: boolean): StrongsWord[] {
  const words: StrongsWord[] = [];
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
      originalWord: '',
      strongNumber,
      transliteration: '',
      order: order++,
    });
  }

  return words;
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
 * Fetch Strong's definition.
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
