// ─── Strong's Dictionary Service ──────────────────────────────────────────
// Word mapping: STEP Bible API (stepbible.org) — free, no key
// Definitions: bundled npm `strongs` package — offline, instant
// Translations: Claude API — automático para português

// @ts-ignore — no types
import strongsGreek from "strongs/greek/strongs-greek-dictionary.js";
// @ts-ignore
import strongsHebrew from "strongs/hebrew/strongs-hebrew-dictionary.js";

// ─── Types ────────────────────────────────────────────────────────────────
export interface StrongsEntry {
  num: string; // "H430" or "G3056"
  word: string; // gloss from interlinear
  lemma: string; // original form (Hebrew/Greek)
  xlit: string; // transliteration
  pron: string; // pronunciation
  def: string; // definição completa em português
  kjv: string; // uso KJV em português
  grammar?: string; // info gramatical (ex: "Substantivo masculino plural")
  lang: "hebrew" | "greek";
}

// ─── Caches ───────────────────────────────────────────────────────────────
const verseCache: Record<string, StrongsEntry[]> = {};
const translationCache: Record<string, { def: string; kjv: string }> = {};

// ─── STEP Bible book abbreviation map ─────────────────────────────────────
const STEP_BOOK: Record<string, string> = {
  gn: "Gen",
  ex: "Exod",
  lv: "Lev",
  nm: "Num",
  dt: "Deut",
  js: "Josh",
  jz: "Judg",
  rt: "Ruth",
  "1sm": "1Sam",
  "2sm": "2Sam",
  "1rs": "1Kgs",
  "2rs": "2Kgs",
  "1cr": "1Chr",
  "2cr": "2Chr",
  ed: "Ezra",
  ne: "Neh",
  et: "Esth",
  jó: "Job",
  sl: "Ps",
  pv: "Prov",
  ec: "Eccl",
  ct: "Song",
  is: "Isa",
  jr: "Jer",
  lm: "Lam",
  ez: "Ezek",
  dn: "Dan",
  os: "Hos",
  jl: "Joel",
  am: "Amos",
  ob: "Obad",
  jn: "Jonah",
  mq: "Mic",
  na: "Nah",
  hc: "Hab",
  sf: "Zeph",
  ag: "Hag",
  zc: "Zech",
  ml: "Mal",
  mt: "Matt",
  mc: "Mark",
  lc: "Luke",
  jo: "John",
  at: "Acts",
  rm: "Rom",
  "1co": "1Cor",
  "2co": "2Cor",
  gl: "Gal",
  ef: "Eph",
  fp: "Phil",
  cl: "Col",
  "1ts": "1Thess",
  "2ts": "2Thess",
  "1tm": "1Tim",
  "2tm": "2Tim",
  tt: "Titus",
  fm: "Phlm",
  hb: "Heb",
  tg: "Jas",
  "1pe": "1Pet",
  "2pe": "2Pet",
  "1jo": "1John",
  "2jo": "2John",
  "3jo": "3John",
  jd: "Jude",
  ap: "Rev",
};

// ─── Tradução automática para português via Claude API ────────────────────
async function translateToPT(num: string, def: string, kjv: string): Promise<{ def: string; kjv: string }> {
  if (translationCache[num]) return translationCache[num];
  if (!def && !kjv) return { def: "", kjv: "" };

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        messages: [
          {
            role: "user",
            content: `Você é especialista em teologia bíblica, hebraico e grego.
Traduza os campos abaixo para português brasileiro de forma teológica e precisa.
Mantenha a estrutura de numeração (1) 1a) 1b) etc.) intacta.
Responda APENAS com JSON válido, sem markdown, sem texto extra.

def: "${def}"
kjv: "${kjv}"

Formato: {"def":"...","kjv":"..."}`,
          },
        ],
      }),
    });

    if (!response.ok) throw new Error(`Claude API HTTP ${response.status}`);
    const data = await response.json();
    const text: string = data?.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (parsed?.def !== undefined) {
      translationCache[num] = { def: parsed.def, kjv: parsed.kjv || kjv };
      return translationCache[num];
    }
    throw new Error("Resposta inválida");
  } catch (err) {
    console.warn("[StrongsService] Tradução falhou, usando inglês:", err);
    return { def, kjv };
  }
}

// ─── Lookup in bundled dictionary ─────────────────────────────────────────
function lookup(num: string): Omit<StrongsEntry, "word" | "grammar"> | null {
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
    kjv: (raw.kjv_def || "").split(",").slice(0, 8).join(", ").trim(),
    lang: isHebrew ? "hebrew" : "greek",
  };
}

// ─── Parse STEP Bible HTML → word + Strong number + grammar ──────────────
function parseStepHtml(html: string): { word: string; num: string; grammar?: string }[] {
  const results: { word: string; num: string; grammar?: string }[] = [];

  // Captura strong number, palavra e morph (gramática)
  const regex =
    /strong='([HG]\d+)\w*'(?:[^>]*morph='([^']*)')?[^>]*class='w\s+'[^>]*>[\s\S]*?class='text'>([^<]+)<\/span>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const num = m[1].toUpperCase();
    const morph = m[2] || "";
    const word = m[3].replace(/\u00a0/g, "").trim();
    if (word && num) results.push({ word, num, grammar: morph || undefined });
  }

  // Fallback sem morph
  if (results.length === 0) {
    const fallback = /strong='([HG]\d+)\w*'[^>]*class='w\s+'[^>]*>[\s\S]*?class='text'>([^<]+)<\/span>/gi;
    while ((m = fallback.exec(html)) !== null) {
      const word = m[2].replace(/\u00a0/g, "").trim();
      const num = m[1].toUpperCase();
      if (word && num) results.push({ word, num });
    }
  }

  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.num)) return false;
    seen.add(r.num);
    return true;
  });
}

// ─── Traduz código morfológico para português legível ─────────────────────
function parseMorph(morph: string, lang: "hebrew" | "greek"): string {
  if (!morph) return "";

  if (lang === "hebrew") {
    const map: Record<string, string> = {
      HNm: "Substantivo masculino",
      HNf: "Substantivo feminino",
      HVq: "Verbo - Qal",
      HVn: "Verbo - Niphal",
      HVp: "Verbo - Piel",
      HVh: "Verbo - Hiphil",
      HVt: "Verbo - Hitpael",
      HAa: "Adjetivo",
      HRp: "Preposição",
      HC: "Conjunção",
      HTd: "Artigo definido",
      HPp: "Pronome pessoal",
      HPr: "Pronome relativo",
      HNp: "Nome próprio",
    };
    for (const [k, v] of Object.entries(map)) {
      if (morph.includes(k)) return v;
    }
    return morph
      .replace(/^H/, "")
      .replace(/([A-Z])/g, " $1")
      .trim();
  }

  // Grego
  const map: Record<string, string> = {
    "N-": "Substantivo",
    "V-": "Verbo",
    "A-": "Adjetivo",
    "P-": "Preposição",
    "C-": "Conjunção",
    "D-": "Advérbio",
    "R-": "Pronome relativo",
    "T-": "Artigo",
    "I-": "Interjeição",
    "X-": "Partícula",
  };
  for (const [k, v] of Object.entries(map)) {
    if (morph.startsWith(k)) return v;
  }
  return morph;
}

// ─── Main: get all Strong's entries for a verse ───────────────────────────
export async function getVerseStrongs(
  abbrev: string,
  chapter: number,
  verseNum: number,
  testament: "AT" | "NT",
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
    const res = await fetch(`https://www.stepbible.org/rest/search/masterSearch/reference=${ref}/${version}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const html: string = data?.value || "";

    const pairs = parseStepHtml(html);

    const entries: StrongsEntry[] = (
      await Promise.all(
        pairs.map(async (p) => {
          const info = lookup(p.num);
          if (!info) return null;

          const translated = await translateToPT(p.num, info.def, info.kjv);
          const grammar = p.grammar ? parseMorph(p.grammar, info.lang) : undefined;

          return {
            ...info,
            word: p.word,
            def: translated.def || info.def,
            kjv: translated.kjv || info.kjv,
            grammar,
          } as StrongsEntry;
        }),
      )
    ).filter((e): e is StrongsEntry => e !== null);

    verseCache[key] = entries;
    return entries;
  } catch (err) {
    console.error("[StrongsService]", err);
    verseCache[key] = [];
    return [];
  }
}

// ─── Manual lookup síncrono (mantido para compatibilidade) ────────────────
export function lookupStrongs(num: string): Omit<StrongsEntry, "word"> | null {
  return lookup(num) as Omit<StrongsEntry, "word"> | null;
}
