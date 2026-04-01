/**
 * StrongsService — busca palavras originais via bolls.life interlinear
 * e definições via bolls.life/dictionary-definition/BDBT/
 *
 * Texto PT vem do thiagobodruk (já existente no app).
 * Palavras originais: bolls.life TRWST (NT grego) / WLCH (AT hebraico).
 * Definições: bolls.life BDBT dictionary.
 */

// ─── Types ────────────────────────────────────────────────────────────────
export interface StrongsWord {
  word: string;           // palavra em hebraico ou grego
  strongNumber: string;   // ex: "H7225" ou "G3056"
  transliteration: string;
  order: number;
}

export interface StrongsDefinition {
  strongNumber: string;
  word: string;
  transliteration: string;
  pronunciation: string;
  definition: string;
  shortDefinition: string;
  origin: string;
  kjvUsage: string;
  language: "hebrew" | "greek";
}

// ─── Caches ───────────────────────────────────────────────────────────────
const chapterCache = new Map<string, StrongsWord[][]>();
const definitionCache = new Map<string, StrongsDefinition | null>();
const inFlightChapter = new Map<string, Promise<StrongsWord[][]>>();
const inFlightDef = new Map<string, Promise<StrongsDefinition | null>>();

// ─── Helpers ──────────────────────────────────────────────────────────────
function getTranslation(bookNumber: number): "TRWST" | "WLCH" {
  return bookNumber <= 39 ? "WLCH" : "TRWST";
}

function transliterateGreek(greek: string): string {
  const map: Record<string, string> = {
    "α":"a","β":"b","γ":"g","δ":"d","ε":"e","ζ":"z","η":"ē","θ":"th",
    "ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"x","ο":"o","π":"p",
    "ρ":"r","σ":"s","ς":"s","τ":"t","υ":"y","φ":"ph","χ":"ch","ψ":"ps","ω":"ō",
    "Α":"A","Β":"B","Γ":"G","Δ":"D","Ε":"E","Ζ":"Z","Η":"Ē","Θ":"Th",
    "Ι":"I","Κ":"K","Λ":"L","Μ":"M","Ν":"N","Ξ":"X","Ο":"O","Π":"P",
    "Ρ":"R","Σ":"S","Τ":"T","Υ":"Y","Φ":"Ph","Χ":"Ch","Ψ":"Ps","Ω":"Ō",
  };
  return greek
    .normalize("NFD")
    .split("")
    .map(ch => map[ch] ?? (ch.match(/[\u0300-\u036f]/) ? "" : ch))
    .join("");
}

// ─── Parsers ──────────────────────────────────────────────────────────────
function parseVerseHTML(html: string, bookNumber: number): StrongsWord[] {
  const words: StrongsWord[] = [];

  if (bookNumber > 39) {
    // GREGO: <W>G3056</W>λόγος
    const regex = /<W>(G\d+)<\/W>([^\s<"]+)/g;
    let match: RegExpExecArray | null;
    let order = 0;
    while ((match = regex.exec(html)) !== null) {
      const word = match[2].replace(/[.,;:!?"'()[\]{}]/g, "").trim();
      if (!word) continue;
      words.push({
        word,
        strongNumber: match[1],
        transliteration: transliterateGreek(word),
        order: order++,
      });
    }
  } else {
    // HEBRAICO: בְּרֵאשִׁ֖ית<W>H7225</W>
    const clean = html.replace(/<(?!\/?W)[^>]+>/g, " ");
    const regex = /([^\s<>"&]+)<W>(H\d+)<\/W>/g;
    let match: RegExpExecArray | null;
    let order = 0;
    while ((match = regex.exec(clean)) !== null) {
      const word = match[1].replace(/[.,;:!?"'()[\]{}]/g, "").trim();
      if (!word) continue;
      words.push({
        word,
        strongNumber: match[2],
        transliteration: "", // will come from definition lookup
        order: order++,
      });
    }
  }

  return words;
}

// Merge consecutive duplicates with same Strong number
function mergeDups(words: StrongsWord[]): StrongsWord[] {
  const out: StrongsWord[] = [];
  for (let i = 0; i < words.length; i++) {
    if (i + 1 < words.length && words[i].strongNumber === words[i + 1].strongNumber) {
      out.push({ ...words[i], word: `${words[i].word} ${words[i + 1].word}` });
      i++;
    } else {
      out.push(words[i]);
    }
  }
  return out;
}

// ─── Fetch chapter interlinear ────────────────────────────────────────────
export async function fetchChapterStrongs(
  bookNumber: number,
  chapter: number
): Promise<StrongsWord[][]> {
  const translation = getTranslation(bookNumber);
  const cacheKey = `${translation}-${bookNumber}-${chapter}`;

  if (chapterCache.has(cacheKey)) return chapterCache.get(cacheKey)!;
  if (inFlightChapter.has(cacheKey)) return inFlightChapter.get(cacheKey)!;

  const promise = (async () => {
    try {
      const url = `https://bolls.life/get-text/${translation}/${bookNumber}/${chapter}/`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const verses: { verse: number; text: string }[] = await res.json();
      verses.sort((a, b) => a.verse - b.verse);

      const result = verses.map(v => mergeDups(parseVerseHTML(v.text, bookNumber)));
      chapterCache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.error("[StrongsService] chapter fetch error:", err);
      return [];
    } finally {
      inFlightChapter.delete(cacheKey);
    }
  })();

  inFlightChapter.set(cacheKey, promise);
  return promise;
}

// ─── Fetch definition ─────────────────────────────────────────────────────
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
      const isHebrew = strongNumber.startsWith("H");

      const definition: StrongsDefinition = {
        strongNumber,
        word: d.word ?? "",
        transliteration: d.xlit ?? d.translit ?? "",
        pronunciation: d.pron ?? d.pronunc ?? "",
        definition: d.strongs_def ?? d.definition ?? "",
        shortDefinition: d.short_definition ?? d.brief_def ?? "",
        origin: d.origin ?? "",
        kjvUsage: d.kjv_def ?? "",
        language: isHebrew ? "hebrew" : "greek",
      };

      definitionCache.set(strongNumber, definition);
      return definition;
    } catch (err) {
      console.error("[StrongsService] definition fetch error:", err);
      definitionCache.set(strongNumber, null);
      return null;
    } finally {
      inFlightDef.delete(strongNumber);
    }
  })();

  inFlightDef.set(strongNumber, promise);
  return promise;
}
