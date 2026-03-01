import { useState } from 'react';
import { Sparkles, ChevronDown, X } from 'lucide-react';

const presetCuriosities = [
  { titulo: "O livro mais longo", texto: "Salmos tem 150 capítulos e 2.461 versículos — o maior livro da Bíblia." },
  { titulo: "O versículo mais curto", texto: "'Jesus chorou' (João 11:35) — o versículo mais curto em português." },
  { titulo: "40 autores, 1 mensagem", texto: "A Bíblia foi escrita por cerca de 40 autores ao longo de 1.500 anos, em 3 continentes." },
  { titulo: "A palavra mais repetida", texto: "'Senhor' aparece mais de 7.000 vezes — a palavra mais frequente em toda a Escritura." },
  { titulo: "O capítulo central", texto: "Salmo 117 é o capítulo mais curto e também o central dos 1.189 capítulos da Bíblia." },
  { titulo: "O livro mais vendido", texto: "Com mais de 5 bilhões de cópias, a Bíblia é o livro mais vendido e traduzido da história." },
  { titulo: "A Bíblia em números", texto: "66 livros, 1.189 capítulos, 31.102 versículos e cerca de 783.137 palavras." },
  { titulo: "Línguas originais", texto: "AT escrito em hebraico e aramaico; NT em grego koiné, o grego popular da época." },
];

const DailyCuriosity = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [highlighted, setHighlighted] = useState<typeof presetCuriosities[0] | null>(null);
  const [shownIndices, setShownIndices] = useState<Set<number>>(new Set());

  const discoverNew = () => {
    const available = presetCuriosities.map((_, i) => i).filter(i => !shownIndices.has(i));
    const pool = available.length > 0 ? available : presetCuriosities.map((_, i) => i);
    if (available.length === 0) setShownIndices(new Set());
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setShownIndices(prev => new Set(prev).add(pick));
    setHighlighted(presetCuriosities[pick]);
  };

  return (
    <div className="space-y-4">
      {/* Discover button */}
      <button
        onClick={discoverNew}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-[10px] bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all"
      >
        <Sparkles className="w-4 h-4" />
        Descubra algo novo!
      </button>

      {/* Highlighted curiosity card */}
      {highlighted && (
        <div className="relative bg-primary/[0.08] border border-primary/20 rounded-[14px] p-[18px] animate-fade-in-down">
          <button
            onClick={() => setHighlighted(null)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <h4 className="text-sm font-bold text-primary mb-1.5 pr-6">{highlighted.titulo}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{highlighted.texto}</p>
        </div>
      )}

      {/* Fixed list */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Sabia que...</p>
        </div>
        <div className="divide-y divide-border">
          {presetCuriosities.map((c, i) => (
            <div key={i}>
              <button onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-all">
                <span className="text-sm font-medium text-foreground">{c.titulo}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-2 ${expandedIndex === i ? 'rotate-180' : ''}`} />
              </button>
              {expandedIndex === i && (
                <div className="px-4 pb-4"><p className="text-sm text-muted-foreground leading-relaxed">{c.texto}</p></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyCuriosity;
