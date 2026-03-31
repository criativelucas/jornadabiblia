// ─── Strong's Dictionary Service — Per-Word Interlinear ──────────────────
// Source: bolls.life interlinear API (TRWST for NT, WLCH for AT)
// Definitions: bundled npm `strongs` package — offline, instant
// Translations: Edge function bible-chat → cached in Supabase strongs_translations

// @ts-ignore
import strongsGreek from "strongs/greek/strongs-greek-dictionary.js";
// @ts-ignore
import strongsHebrew from "strongs/hebrew/strongs-hebrew-dictionary.js";

import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────
export interface OrigWord {
  num: string;      // "H430" or "G3056"
  word: string;     // original character in the verse
  lemma: string;    // dictionary form
  xlit: string;     // transliteration
  pron: string;     // pronunciation
  def: string;      // definition (English — translate later)
  lang: "hebrew" | "greek";
}

// ─── Cache por capítulo: "jo-1" → { 1: OrigWord[], 2: OrigWord[], ... }
const chapterStrongsCache: Record<string, Record<number, OrigWord[]>> = {};

// ─── Mapeamento abbrev → bolls.life bookId ────────────────────────────────
export const BOOK_ID: Record<string, number> = {
  gn: 1, ex: 2, lv: 3, nm: 4, dt: 5, js: 6, jz: 7, rt: 8,
  "1sm": 9, "2sm": 10, "1rs": 11, "2rs": 12, "1cr": 13, "2cr": 14,
  ed: 15, ne: 16, et: 17, "jó": 18, sl: 19, pv: 20, ec: 21, ct: 22,
  is: 23, jr: 24, lm: 25, ez: 26, dn: 27, os: 28, jl: 29, am: 30,
  ob: 31, jn: 32, mq: 33, na: 34, hc: 35, sf: 36, ag: 37, zc: 38, ml: 39,
  mt: 40, mc: 41, lc: 42, jo: 43, at: 44, rm: 45,
  "1co": 46, "2co": 47, gl: 48, ef: 49, fp: 50, cl: 51,
  "1ts": 52, "2ts": 53, "1tm": 54, "2tm": 55, tt: 56, fm: 57,
  hb: 58, tg: 59, "1pe": 60, "2pe": 61, "1jo": 62, "2jo": 63, "3jo": 64,
  jd: 65, ap: 66,
};

// ─── Greek parser: G3056λόγος — number BEFORE word ────────────────────────
function parseGreekVerse(html: string): { num: string; word: string }[] {
  const results: { num: string; word: string }[] = [];
  const re = /(G\d+)<\/W>([^\s<,;:.!?()"']{1,25})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const clean = m[2].trim().replace(/[^\u0370-\u03FF\u1F00-\u1FFF\u0300-\u036f]/g, "").trim();
    if (clean) results.push({ num: m[1], word: m[2].trim() });
  }
  return results;
}

// ─── Hebrew parser: wordH430 — number AFTER word ──────────────────────────
function parseHebrewVerse(html: string): { num: string; word: string }[] {
  const results: { num: string; word: string }[] = [];
  const clean = html.replace(/<(?!\/?W)[^>]+>/g, " ");
  const re = /([^\s<>]{1,25}?)(H\d+)<\/W>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const word = m[1].trim();
    if (word) results.push({ word, num: m[2] });
  }
  return results;
}

// ─── Transliteração grego via NFD ────────────────────────────────────────
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
  const stripped = text.normalize("NFD").replace(/[\u0300-\u0345\u0483-\u0489]/g, "");
  let result = "";
  for (const char of stripped) {
    result += map[char] ?? (char.match(/[\u0370-\u03FF\u1F00-\u1FFF]/) ? "" : char);
  }
  return result;
}

// ─── Lookup no dicionário bundled ─────────────────────────────────────────
function lookupEntry(num: string, word: string): OrigWord | null {
  const key = num.toUpperCase().replace(/[^HG0-9]/g, "");
  const lang = key.startsWith("H") ? "hebrew" : "greek";
  const dict = lang === "hebrew" ? strongsHebrew : strongsGreek;
  const raw = (dict as Record<string, any>)[key];
  if (!raw) return null;

  const xlitVal = lang === "hebrew"
    ? (raw.xlit ?? "")
    : transliterateGreek(raw.lemma ?? "");

  return {
    num: key,
    word,
    lemma: raw.lemma ?? "",
    xlit: xlitVal,
    pron: raw.pron ?? "",
    def: (raw.strongs_def ?? "").trim().replace(/^[,\s]+/, ""),
    lang,
  };
}

// ─── Mesclar pares consecutivos com mesmo Strong# ────────────────────────
function mergeDups(pairs: { num: string; word: string }[]) {
  const out: { num: string; word: string }[] = [];
  for (let i = 0; i < pairs.length; i++) {
    if (i + 1 < pairs.length && pairs[i].num === pairs[i + 1].num) {
      out.push({ num: pairs[i].num, word: `${pairs[i].word} ${pairs[i + 1].word}` });
      i++;
    } else {
      out.push(pairs[i]);
    }
  }
  return out;
}

// In-flight tracking to avoid duplicate fetches
const inFlightChapter: Record<string, Promise<Record<number, OrigWord[]>>> = {};

// ─── Carregar capítulo inteiro (UMA fetch, cache de todos os versículos) ──
export async function preloadChapterStrongs(
  abbrev: string,
  chapter: number,
  testament: "AT" | "NT"
): Promise<Record<number, OrigWord[]>> {
  const cacheKey = `${abbrev}-${chapter}`;
  if (chapterStrongsCache[cacheKey]) return chapterStrongsCache[cacheKey];
  if (inFlightChapter[cacheKey]) return inFlightChapter[cacheKey];

  const bookId = BOOK_ID[abbrev.toLowerCase()];
  if (!bookId) return {};

  const translation = testament === "NT" ? "TRWST" : "WLCH";

  inFlightChapter[cacheKey] = (async () => {
    try {
      const res = await fetch(
        `https://bolls.life/get-text/${translation}/${bookId}/${chapter}/`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const verses: { verse: number; text: string }[] = await res.json();
      const result: Record<number, OrigWord[]> = {};

      verses.forEach((v) => {
        const pairs = testament === "NT"
          ? parseGreekVerse(v.text)
          : parseHebrewVerse(v.text);

        const merged = mergeDups(pairs);

        result[v.verse] = merged
          .map((p) => lookupEntry(p.num, p.word))
          .filter((e): e is OrigWord => e !== null);
      });

      chapterStrongsCache[cacheKey] = result;
      return result;
    } catch (err) {
      console.error("[StrongsService] preloadChapter error:", err);
      return {};
    } finally {
      delete inFlightChapter[cacheKey];
    }
  })();

  return inFlightChapter[cacheKey];
}

// ─── Obter palavras de um versículo específico (do cache) ─────────────────
export function getVerseWords(
  abbrev: string,
  chapter: number,
  verseNum: number
): OrigWord[] {
  const cacheKey = `${abbrev}-${chapter}`;
  return chapterStrongsCache[cacheKey]?.[verseNum] ?? [];
}

// ─── Tradução PT com cache Supabase ──────────────────────────────────────
const ptMemCache: Record<string, string> = {};

export async function translateDefinition(
  num: string,
  defEN: string
): Promise<string> {
  if (ptMemCache[num]) return ptMemCache[num];
  if (!defEN) return "";

  // Check Supabase cache
  try {
    const { data } = await supabase
      .from("strongs_translations")
      .select("def_pt")
      .eq("strongs_num", num)
      .maybeSingle();

    if (data?.def_pt) {
      ptMemCache[num] = data.def_pt;
      return data.def_pt;
    }
  } catch {}

  // Translate via edge function
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return defEN;

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
          content: `Traduza a definição do Dicionário Strong's para português brasileiro. Seja direto e conciso (1-2 frases). Retorne APENAS a tradução, sem introduções.\n\nDicionário: ${num.startsWith("H") ? "Hebraico" : "Grego"}\nPalavra: ${num}\nDefinição: ${defEN}`,
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

    const defPT = fullText.trim().replace(/```json|```/g, "").replace(/^["']|["']$/g, "").trim();

    if (defPT) {
      ptMemCache[num] = defPT;
      // Save to Supabase cache (fire and forget)
      supabase
        .from("strongs_translations")
        .upsert({ strongs_num: num, def_pt: defPT })
        .then(() => {});
      return defPT;
    }
    return defEN;
  } catch (err) {
    console.warn("[StrongsService] Translation failed for", num, err);
    return defEN;
  }
}

// ─── Manual lookup síncrono (mantido para compatibilidade) ────────────────
export function lookupStrongs(num: string): Omit<OrigWord, "word"> | null {
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
    lang,
  };
}
