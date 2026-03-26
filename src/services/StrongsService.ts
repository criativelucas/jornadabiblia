// ─── Strong's Dictionary Service ──────────────────────────────────────────
// Word mapping: STEP Bible API (stepbible.org) — free, no key
// Definitions: bundled npm `strongs` package — offline, instant

// @ts-ignore — no types
import strongsGreek from "strongs/greek/strongs-greek-dictionary.js";
// @ts-ignore
import strongsHebrew from "strongs/hebrew/strongs-hebrew-dictionary.js";

// ─── Types ────────────────────────────────────────────────────────────────
export interface StrongsEntry {
  num: string;       // "H430" or "G3056"
  word: string;      // English gloss from interlinear
  lemma: string;     // original form (Hebrew/Greek)
  xlit: string;      // transliteration
  pron: string;      // pronunciation
  def: string;       // definition
  kjv: string;       // KJV usage (first 5)
  lang: "hebrew" | "greek";
}

// ─── Caches ───────────────────────────────────────────────────────────────
const verseCache: Record<string, StrongsEntry[]> = {};

// ─── STEP Bible book abbreviation map ─────────────────────────────────────
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

// ─── Lookup in bundled dictionary ─────────────────────────────────────────
function lookup(num: string): Omit<StrongsEntry, "word"> | null {
  const key = num.toUpperCase().replace(/[^HG0-9]/g, "");
  const isHebrew = key.startsWith("H");
  const dict = isHebrew ? strongsHebrew : strongsGreek;
  const raw = (dict as Record<string, any>)[key];
  if (!raw) return null;
  return {
    num: key,
    lemma: raw.lemma || "",
    xlit: raw.xlit || "",
    pron: raw.pron || "",
    def: (raw.strongs_def || "").trim().replace(/^[,\s]+/, ""),
    kjv: (raw.kjv_def || "").split(",").slice(0, 5).join(", ").trim(),
    lang: isHebrew ? "hebrew" : "greek",
  };
}

// ─── Parse STEP Bible HTML → word-Strong pairs ───────────────────────────
function parseStepHtml(html: string): { word: string; num: string }[] {
  const results: { word: string; num: string }[] = [];
  // Pattern: strong='H7225G' or strong='G3056' ... class='w ' ... class='text'>word</span>
  const regex = /strong='([HG]\d+)\w*'[^>]*class='w\s+'[^>]*>[\s\S]*?class='text'>([^<]+)<\/span>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const word = m[2].replace(/\u00a0/g, "").trim();
    const num = m[1].toUpperCase();
    if (word && num) results.push({ word, num });
  }
  // Deduplicate by Strong's number
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.num)) return false;
    seen.add(r.num);
    return true;
  });
}

// ─── Main: get all Strong's entries for a verse ───────────────────────────
export async function getVerseStrongs(
  abbrev: string,
  chapter: number,
  verseNum: number,
  testament: "AT" | "NT"
): Promise<StrongsEntry[]> {
  const key = `${abbrev}-${chapter}-${verseNum}`;
  if (verseCache[key]) return verseCache[key];

  const stepBook = STEP_BOOK[abbrev.toLowerCase()];
  if (!stepBook) {
    verseCache[key] = [];
    return [];
  }

  const version = testament === "AT" ? "THOT" : "SBLG";
  const ref = `${stepBook}.${chapter}.${verseNum}`;

  try {
    const res = await fetch(
      `https://www.stepbible.org/rest/search/masterSearch/reference=${ref}/${version}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const html: string = data?.value || "";

    const pairs = parseStepHtml(html);
    const entries: StrongsEntry[] = pairs
      .map((p) => {
        const info = lookup(p.num);
        if (!info) return null;
        return { ...info, word: p.word };
      })
      .filter((e): e is StrongsEntry => e !== null);

    verseCache[key] = entries;
    return entries;
  } catch (err) {
    console.error("[StrongsService]", err);
    verseCache[key] = [];
    return [];
  }
}

// ─── Manual lookup by Strong's number (for search) ────────────────────────
export function lookupStrongs(num: string): Omit<StrongsEntry, "word"> | null {
  return lookup(num);
}
