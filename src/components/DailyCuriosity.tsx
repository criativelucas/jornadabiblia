import { useState } from 'react';
import { Sparkles, RefreshCw, Loader2, ChevronDown } from 'lucide-react';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bible-chat`;

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
  const [aiCuriosity, setAiCuriosity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

  const fetchCuriosity = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setAiCuriosity('');
    const msgs = [...history, { role: 'user' as const, content: 'Me conte uma curiosidade bíblica fascinante!' }];
    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: msgs, type: 'curiosity' }),
      });
      if (!resp.ok || !resp.body) throw new Error('Erro ao buscar curiosidade');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', text = '', done = false;
      while (!done) {
        const { done: rDone, value } = await reader.read();
        if (rDone) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') { done = true; break; }
          try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) { text += c; setAiCuriosity(text); } } catch {}
        }
      }
      setHistory([...msgs, { role: 'assistant', content: text }]);
    } catch (e: any) { setAiCuriosity(`Erro: ${e.message}`); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Descubra algo novo!
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Fatos fascinantes sobre a Bíblia</p>
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

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Curiosidade por IA</p>
          <button onClick={fetchCuriosity} disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 disabled:opacity-40 transition-all text-xs font-medium">
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {aiCuriosity ? 'Nova' : 'Gerar'}
          </button>
        </div>
        {aiCuriosity && <div className="px-4 pb-4"><p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{aiCuriosity}</p></div>}
      </div>
    </div>
  );
};

export default DailyCuriosity;
