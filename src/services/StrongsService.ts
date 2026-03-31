// ─── Strong's Dictionary Service ──────────────────────────────────────────
// Word mapping: STEP Bible API (stepbible.org) — free, no key
// Definitions: bundled npm `strongs` package — offline, instant
// Translations: Edge function bible-chat with type strongs_translation

// @ts-ignore — no types
import strongsGreek from "strongs/greek/strongs-greek-dictionary.js";
// @ts-ignore
import strongsHebrew from "strongs/hebrew/strongs-hebrew-dictionary.js";

import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────
export interface StrongsEntry {
  num: string;
  word: string;
  lemma: string;
  xlit: string;
  pron: string;
  def: string;
  kjv: string;
  grammar?: string;
  lang: "hebrew" | "greek";
  order: number;
}

// ─── Caches ───────────────────────────────────────────────────────────────
const verseCache: Record<string, StrongsEntry[]> = {};
const translationCache: Record<string, { word: string; def: string; kjv: string }> = {};

// Load persisted translation cache from sessionStorage
try {
  const stored = sessionStorage.getItem("strongs_pt_cache_v2");
  if (stored) Object.assign(translationCache, JSON.parse(stored));
} catch {}

function persistTranslationCache() {
  try {
    sessionStorage.setItem("strongs_pt_cache_v2", JSON.stringify(translationCache));
  } catch {}
}

// ─── STEP Bible book abbreviation map ─────────────────────────────────────
const STEP_BOOK: Record<string, string> = {
  gn: "Gen", ex: "Exod", lv: "Lev", nm: "Num", dt: "Deut",
  js: "Josh", jz: "Judg", rt: "Ruth",
  "1sm": "1Sam", "2sm": "2Sam", "1rs": "1Kgs", "2rs": "2Kgs",
  "1cr": "1Chr", "2cr": "2Chr",
  ed: "Ezra", ne: "Neh", et: "Esth", jó: "Job",
  sl: "Ps", pv: "Prov", ec: "Eccl", ct: "Song",
  is: "Isa", jr: "Jer", lm: "Lam", ez: "Ezek", dn: "Dan",
  os: "Hos", jl: "Joel", am: "Amos", ob: "Obad",
  jn: "Jonah", mq: "Mic", na: "Nah", hc: "Hab",
  sf: "Zeph", ag: "Hag", zc: "Zech", ml: "Mal",
  mt: "Matt", mc: "Mark", lc: "Luke", jo: "John",
  at: "Acts", rm: "Rom",
  "1co": "1Cor", "2co": "2Cor",
  gl: "Gal", ef: "Eph", fp: "Phil", cl: "Col",
  "1ts": "1Thess", "2ts": "2Thess",
  "1tm": "1Tim", "2tm": "2Tim",
  tt: "Titus", fm: "Phlm", hb: "Heb", tg: "Jas",
  "1pe": "1Pet", "2pe": "2Pet",
  "1jo": "1John", "2jo": "2John", "3jo": "3John",
  jd: "Jude", ap: "Rev",
};

// ─── Transliteração SBL simplificada do grego ─────────────────────────────
export function transliterateGreek(text: string): string {
  if (!text) return "";

  const map: Record<string, string> = {
    "α": "a", "β": "b", "γ": "g", "δ": "d", "ε": "e", "ζ": "z", "η": "ē", "θ": "th",
    "ι": "i", "κ": "k", "λ": "l", "μ": "m", "ν": "n", "ξ": "x", "ο": "o", "π": "p",
    "ρ": "r", "σ": "s", "ς": "s", "τ": "t", "υ": "u", "φ": "ph", "χ": "ch", "ψ": "ps", "ω": "ō",
    "Α": "A", "Β": "B", "Γ": "G", "Δ": "D", "Ε": "E", "Ζ": "Z", "Η": "Ē", "Θ": "Th",
    "Ι": "I", "Κ": "K", "Λ": "L", "Μ": "M", "Ν": "N", "Ξ": "X", "Ο": "O", "Π": "P",
    "Ρ": "R", "Σ": "S", "Τ": "T", "Υ": "U", "Φ": "Ph", "Χ": "Ch", "Ψ": "Ps", "Ω": "Ō",
  };

  const stripped = text
    .normalize("NFD")
    .replace(/[\u0300-\u0345\u0483-\u0489]/g, "");

  let result = "";
  for (const char of stripped) {
    result += map[char] ?? (char.match(/[\u0370-\u03FF\u1F00-\u1FFF]/) ? "" : char);
  }
  return result;
}

// ─── Tradução individual via bible-chat edge function ─────────────────────
async function translateToPT(
  num: string,
  word: string,
  def: string,
  kjv: string
): Promise<{ word: string; def: string; kjv: string }> {
  if (translationCache[num]) return translationCache[num];
  if (!def && !kjv) return { word, def: "", kjv: "" };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { word, def, kjv };

    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bible-chat`;

    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        type: "strongs_translation",
        messages: [{
          role: "user",
          content: `Número Strong: ${num}\nword: "${word}"\ndef: "${def}"\nkjv: "${kjv}"\n\nTraduza word, def e kjv para português brasileiro teológico.\nResponda APENAS com JSON: {"word":"...","def":"...","kjv":"..."}`
        }],
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") break;
        try {
          const parsed = JSON.parse(json);
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) fullText += chunk;
        } catch {}
      }
    }

    const clean = fullText.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    if (result?.def !== undefined) {
      translationCache[num] = {
        word: result.word || word,
        def: result.def,
        kjv: result.kjv || kjv,
      };
      persistTranslationCache();
      return translationCache[num];
    }
    throw new Error("Invalid response");
  } catch (err) {
    console.warn("[StrongsService] Translation failed for", num, err);
    return { word, def, kjv }; // fallback English
  }
}

// ─── Lookup in bundled dictionary ─────────────────────────────────────────
function lookup(
  num: string,
  word: string,
  lang: "greek" | "hebrew",
  order: number
): StrongsEntry | null {
  const key = num.toUpperCase().replace(/[^HG0-9]/g, "");
  const dict = lang === "hebrew" ? strongsHebrew : strongsGreek;
  const raw = (dict as Record<string, any>)[key];
  if (!raw) return null;

  // Para grego: gerar xlit a partir do lemma
  const xlit = lang === "hebrew"
    ? (raw.xlit ?? "")
    : transliterateGreek(raw.lemma ?? "");

  return {
    num: key,
    word,
    lemma: raw.lemma || "",
    xlit,
    pron: raw.pron ?? "",
    def: (raw.strongs_def || "").trim().replace(/^[,\s]+/, ""),
    kjv: (raw.kjv_def || "").split(",").slice(0, 8).join(", ").trim(),
    lang,
    order,
  };
}

// ─── Merge consecutive duplicate Strong numbers ──────────────────────────
function mergeDuplicates(
  pairs: { word: string; num: string; grammar?: string; order: number }[]
): { word: string; num: string; grammar?: string; order: number }[] {
  const merged: typeof pairs = [];
  for (let i = 0; i < pairs.length; i++) {
    const current = pairs[i];
    const next = pairs[i + 1];
    if (next && next.num === current.num && next.order === current.order + 1) {
      merged.push({
        word: `${current.word} ${next.word}`,
        num: current.num,
        grammar: current.grammar || next.grammar,
        order: current.order,
      });
      i++; // skip next
    } else {
      merged.push(current);
    }
  }
  return merged;
}

// ─── Parse STEP Bible HTML → word + Strong number + grammar ──────────────
function parseStepHtml(
  html: string,
  lang: "greek" | "hebrew"
): { word: string; num: string; grammar?: string; order: number }[] {
  const results: { word: string; num: string; grammar?: string; order: number }[] = [];

  const regex =
    /strong='([HG]\d+)\w*'(?:[^>]*morph='([^']*)')?[^>]*class='w\s+'[^>]*>[\s\S]*?class='text'>([^<]+)<\/span>/gi;
  let m: RegExpExecArray | null;
  let order = 0;
  while ((m = regex.exec(html)) !== null) {
    const num = m[1].toUpperCase();
    const morph = m[2] || "";
    const word = m[3].replace(/\u00a0/g, "").trim();
    if (word && num) {
      results.push({ word, num, grammar: morph || undefined, order: order++ });
    }
  }

  if (results.length === 0) {
    const fallback = /strong='([HG]\d+)\w*'[^>]*class='w\s+'[^>]*>[\s\S]*?class='text'>([^<]+)<\/span>/gi;
    while ((m = fallback.exec(html)) !== null) {
      const word = m[2].replace(/\u00a0/g, "").trim();
      const num = m[1].toUpperCase();
      if (word && num) results.push({ word, num, order: order++ });
    }
  }

  // Deduplicate only consecutive identical Strong's + word
  return results.filter((r, i, arr) =>
    i === 0 || !(arr[i - 1].num === r.num && arr[i - 1].word === r.word)
  );
}

// ─── Traduz código morfológico para português legível ─────────────────────
function parseMorph(morph: string, lang: "hebrew" | "greek"): string {
  if (!morph) return "";

  if (lang === "hebrew") {
    const map: Record<string, string> = {
      HNm: "Substantivo masculino", HNf: "Substantivo feminino",
      HVq: "Verbo - Qal", HVn: "Verbo - Niphal",
      HVp: "Verbo - Piel", HVh: "Verbo - Hiphil",
      HVt: "Verbo - Hitpael", HAa: "Adjetivo",
      HRp: "Preposição", HC: "Conjunção",
      HTd: "Artigo definido", HPp: "Pronome pessoal",
      HPr: "Pronome relativo", HNp: "Nome próprio",
    };
    for (const [k, v] of Object.entries(map)) {
      if (morph.includes(k)) return v;
    }
    return morph.replace(/^H/, "").replace(/([A-Z])/g, " $1").trim();
  }

  const map: Record<string, string> = {
    "N-": "Substantivo", "V-": "Verbo", "A-": "Adjetivo",
    "P-": "Preposição", "C-": "Conjunção", "D-": "Advérbio",
    "R-": "Pronome relativo", "T-": "Artigo",
    "I-": "Interjeição", "X-": "Partícula",
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
  const lang: "greek" | "hebrew" = testament === "NT" ? "greek" : "hebrew";

  try {
    const res = await fetch(`https://www.stepbible.org/rest/search/masterSearch/reference=${ref}/${version}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const html: string = data?.value || "";

    const pairs = parseStepHtml(html, lang);

    // Merge consecutive duplicates (e.g. H6944 H6944 → "קֹדֶשׁ קָדָשִׁים")
    const mergedPairs = mergeDuplicates(pairs);

    // Build entries with order preserved
    const rawEntries: (StrongsEntry | null)[] = mergedPairs.map((p) => {
      const entry = lookup(p.num, p.word, lang, p.order);
      if (!entry) return null;
      const grammar = p.grammar ? parseMorph(p.grammar, lang) : undefined;
      return { ...entry, grammar } as StrongsEntry;
    });

    const validEntries = rawEntries
      .filter((e): e is StrongsEntry => e !== null)
      .sort((a, b) => a.order - b.order);

    // Translate all entries to PT-BR individually via bible-chat
    if (validEntries.length > 0) {
      const translationResults = await Promise.all(
        validEntries.map((e) => translateToPT(e.num, e.word, e.def, e.kjv))
      );

      for (let i = 0; i < validEntries.length; i++) {
        const t = translationResults[i];
        validEntries[i].word = t.word || validEntries[i].word;
        validEntries[i].def = t.def || validEntries[i].def;
        validEntries[i].kjv = t.kjv || validEntries[i].kjv;
      }
    }

    verseCache[key] = validEntries;
    return validEntries;
  } catch (err) {
    console.error("[StrongsService]", err);
    verseCache[key] = [];
    return [];
  }
}

// ─── Manual lookup síncrono (mantido para compatibilidade) ────────────────
export function lookupStrongs(num: string): Omit<StrongsEntry, "word" | "order"> | null {
  const key = num.toUpperCase().replace(/[^HG0-9]/g, "");
  const isHebrew = key.startsWith("H");
  const dict = isHebrew ? strongsHebrew : strongsGreek;
  const raw = (dict as Record<string, any>)[key];
  if (!raw) return null;
  const lang: "greek" | "hebrew" = isHebrew ? "hebrew" : "greek";
  const xlit = isHebrew ? (raw.xlit ?? "") : transliterateGreek(raw.lemma ?? "");
  return {
    num: key,
    lemma: raw.lemma || "",
    xlit,
    pron: raw.pron || "",
    def: (raw.strongs_def || "").trim().replace(/^[,\s]+/, ""),
    kjv: (raw.kjv_def || "").split(",").slice(0, 8).join(", ").trim(),
    lang,
  };
}
