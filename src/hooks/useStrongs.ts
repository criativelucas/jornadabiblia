export interface StrongsEntry {
  lemma: string;
  xlit: string;
  pron: string;
  derivation: string;
  strongs_def: string;
  kjv_def: string;
}

const cache: { hebrew?: Record<string, StrongsEntry>; greek?: Record<string, StrongsEntry> } = {};

export async function fetchStrongs(lang: 'hebrew' | 'greek'): Promise<Record<string, StrongsEntry>> {
  if (cache[lang]) return cache[lang]!;

  const url = lang === 'hebrew'
    ? 'https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js'
    : 'https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js';

  const res = await fetch(url);
  let text = await res.text();

  // The file starts with "var strongsDictionary = " — remove to parse as JSON
  text = text
    .replace(/^var\s+strongsDictionary\s*=\s*/, '')
    .replace(/;?\s*$/, '');

  const dict = JSON.parse(text);
  cache[lang] = dict;
  return dict;
}

export function lookupStrong(
  dict: Record<string, StrongsEntry>,
  query: string
): { key: string; entry: StrongsEntry } | null {
  const q = query.trim().toUpperCase();

  // Direct lookup by number (H1, G3056)
  if (dict[q]) return { key: q, entry: dict[q] };

  // Number without prefix
  if (/^\d+$/.test(q)) {
    if (dict[`H${q}`]) return { key: `H${q}`, entry: dict[`H${q}`] };
    if (dict[`G${q}`]) return { key: `G${q}`, entry: dict[`G${q}`] };
  }

  // Search by transliteration (partial, case-insensitive)
  const qLower = query.toLowerCase();
  const found = Object.entries(dict).find(([, e]) =>
    e.xlit?.toLowerCase().includes(qLower) ||
    e.lemma?.includes(query)
  );
  return found ? { key: found[0], entry: found[1] } : null;
}
