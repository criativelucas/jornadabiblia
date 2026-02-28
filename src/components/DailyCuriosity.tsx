import { useState } from 'react';
import { Sparkles, RefreshCw, Loader2, ChevronDown } from 'lucide-react';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bible-chat`;

const presetCuriosities = [
  { titulo: "📖 O livro mais longo", texto: "Salmos tem 150 capítulos e 2.461 versículos — o maior livro da Bíblia em número de capítulos." },
  { titulo: "📏 Versículo mais curto", texto: "'Jesus chorou' (João 11:35) é o versículo mais curto da Bíblia em português." },
  { titulo: "✍️ 40 autores, 1 mensagem", texto: "A Bíblia foi escrita por cerca de 40 autores diferentes ao longo de aproximadamente 1.500 anos, em 3 continentes." },
  { titulo: "🔤 Palavra mais repetida", texto: "'Senhor' aparece mais de 7.000 vezes na Bíblia — a palavra mais frequente em toda a Escritura." },
  { titulo: "📍 Capítulo central", texto: "Salmo 117 é o capítulo mais curto da Bíblia e também o capítulo central entre os 1.189 existentes." },
  { titulo: "🌍 O livro mais vendido", texto: "Com mais de 5 bilhões de cópias distribuídas, a Bíblia é o livro mais vendido e traduzido de toda a história." },
  { titulo: "🔢 A Bíblia em números", texto: "66 livros, 1.189 capítulos, 31.102 versículos e aproximadamente 783.137 palavras no total." },
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

    const msgs = [
      ...history,
      { role: 'user' as const, content: 'Me conte uma curiosidade bíblica fascinante!' },
    ];

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: msgs, type: 'curiosity' }),
      });

      if (!resp.ok || !resp.body) throw new Error('Erro ao buscar curiosidade');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let text = '';
      let done = false;

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
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              text += content;
              setAiCuriosity(text);
            }
          } catch { /* partial */ }
        }
      }

      setHistory([...msgs, { role: 'assistant', content: text }]);
    } catch (e: any) {
      setAiCuriosity(`❌ ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preset curiosities as accordion cards */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            Curiosidades Bíblicas
          </h3>
          <p className="text-xs text-slate-400 mt-1">Descubra fatos fascinantes sobre a Bíblia</p>
        </div>

        <div className="divide-y divide-white/5">
          {presetCuriosities.map((c, i) => (
            <div key={i}>
              <button
                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-all"
              >
                <span className="text-sm font-medium text-slate-200">{c.titulo}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-2 ${expandedIndex === i ? 'rotate-180' : ''}`} />
              </button>
              {expandedIndex === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-slate-300 leading-relaxed">{c.texto}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI curiosity */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-300">🤖 Curiosidade gerada por IA</p>
          <button
            onClick={fetchCuriosity}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-300 hover:bg-yellow-500/20 disabled:opacity-40 transition-all text-xs font-medium"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {aiCuriosity ? 'Nova' : 'Gerar'}
          </button>
        </div>

        {aiCuriosity && (
          <div className="px-4 pb-4">
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{aiCuriosity}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyCuriosity;
