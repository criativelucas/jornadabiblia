// ─── Strong's Dictionary Service ───────────────────────────────────────────
// Uses STEP Bible API for interlinear word data (Strong's numbers)
// Uses bolls.life for dictionary definitions

// ─── Types ─────────────────────────────────────────────────────────────────
export interface OrigWord {
  word: string;       // English gloss from STEP Bible
  strongs: string;    // e.g. "H430" or "G3056"
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

// ─── Book abbreviation → STEP Bible book name ─────────────────────────────
const STEP_BOOK: Record<string, string> = {
  gn: "Gen", ex: "Exod", lv: "Lev", nm: "Num", dt: "Deut",
  js: "Josh", jz: "Judg", rt: "Ruth",
  "1sm": "1Sam", "2sm": "2Sam", "1rs": "1Kgs", "2rs": "2Kgs",
  "1cr": "1Chr", "2cr": "2Chr",
  ed: "Ezra", ne: "Neh", et: "Esth", "jó": "Job",
  sl: "Ps", pv: "Prov", ec: "Eccl", ct: "Song",
  is: "Isa", jr: "Jer", lm: "Lam", ez: "Ezek", dn: "Dan",
  os: "Hos", jl: "Joel", am: "Amos", ob: "Obad",
  jn: "Jonah", mq: "Mic", na: "Nah", hc: "Hab",
  sf: "Zeph", ag: "Hag", zc: "Zech", ml: "Mal",
  mt: "Matt", mc: "Mark", lc: "Luke", jo: "John",
  at: "Acts", rm: "Rom",
  "1co": "1Cor", "2co": "2Cor", gl: "Gal", ef: "Eph",
  fp: "Phil", cl: "Col",
  "1ts": "1Thess", "2ts": "2Thess", "1tm": "1Tim", "2tm": "2Tim",
  tt: "Titus", fm: "Phlm",
  hb: "Heb", tg: "Jas", "1pe": "1Pet", "2pe": "2Pet",
  "1jo": "1John", "2jo": "2John", "3jo": "3John",
  jd: "Jude", ap: "Rev",
};

// ─── Parse STEP Bible HTML to extract word-Strong's pairs ──────────────────
function parseStepHtml(html: string, prefix: "H" | "G"): OrigWord[] {
  const results: OrigWord[] = [];

  // Match: strong='H1234X' class='w '><span ... class='text'>word</span>
  const regex = /strong='([HG]\d+)\w*'\s+class='w\s+'>([\s\S]*?)(?=<span[^>]*strong=|<\/div>|$)/gi;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(html)) !== null) {
    const strongRaw = m[1];
    const inner = m[2];

    // Extract English text
    const textMatch = inner.match(/class='text'>([^<]+)/);
    const word = textMatch ? textMatch[1].replace(/\u00a0/g, "").trim() : "";

    // Normalize strong number (remove leading zeros for display but keep for lookup)
    const strongs = strongRaw.toUpperCase();

    if (word && strongs) {
      results.push({ word, strongs });
    }
  }

  return results;
}

// ─── Fetch verse words with Strong's via STEP Bible API ────────────────────
export async function fetchVerseWords(
  bookId: string,
  chapter: number,
  verseNum: number,
  testament: "AT" | "NT"
): Promise<OrigWord[]> {
  const cacheKey = `${bookId}-${chapter}-${verseNum}`;
  if (cacheKey in verseCache) return verseCache[cacheKey];

  const stepBook = STEP_BOOK[bookId.toLowerCase()];
  if (!stepBook) {
    console.warn("StrongsService: unknown bookId", bookId);
    verseCache[cacheKey] = [];
    return [];
  }

  // THOT = Hebrew OT interlinear, SBLG = Greek NT interlinear
  const version = testament === "AT" ? "THOT" : "SBLG";
  const prefix = testament === "AT" ? "H" : "G";
  const ref = `${stepBook}.${chapter}.${verseNum}`;

  try {
    const res = await fetch(
      `https://www.stepbible.org/rest/search/masterSearch/reference=${ref}/${version}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const html = data?.value || "";

    const words = parseStepHtml(html, prefix);

    verseCache[cacheKey] = words;
    return words;
  } catch (err) {
    console.warn(`StrongsService: STEP Bible failed for ${ref}`, err);
    verseCache[cacheKey] = [];
    return [];
  }
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

    // Extract lemma from HTML if needed
    let lemma = d.lexeme ?? d.original_word ?? d.lemma ?? d.topic ?? "";
    // Clean HTML from definition
    const definition = d.definition ?? d.strongs_def ?? d.short_definition ?? "";

    // Try to extract transliteration and pronunciation from definition HTML
    let xlit = "";
    let pronunciation = "";
    const xlitMatch = definition.match(/Transliteration:\s*<b>([^<]+)<\/b>/);
    if (xlitMatch) xlit = xlitMatch[1].trim();
    const pronMatch = definition.match(/Phonetic:\s*<b>([^<]+)<\/b>/);
    if (pronMatch) pronunciation = pronMatch[1].trim();

    const entry: StrongsEntry = {
      strongs_num: key,
      lemma,
      xlit,
      pronunciation,
      definition,
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
