import { useState } from 'react';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bible-chat`;

const DailyCuriosity = () => {
  const [curiosity, setCuriosity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

  const fetchCuriosity = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setCuriosity('');

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
              setCuriosity(text);
            }
          } catch { /* partial */ }
        }
      }

      setHistory([
        ...msgs,
        { role: 'assistant', content: text },
      ]);
    } catch (e: any) {
      setCuriosity(`❌ ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            Curiosidade Bíblica
          </h3>
          <p className="text-xs text-slate-400 mt-1">Descubra fatos fascinantes sobre a Bíblia</p>
        </div>
        <button
          onClick={fetchCuriosity}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-300 hover:bg-yellow-500/20 disabled:opacity-40 transition-all text-sm font-medium"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {curiosity ? 'Nova curiosidade' : 'Gerar curiosidade'}
        </button>
      </div>

      <div className="p-6 min-h-[200px] flex items-center justify-center">
        {curiosity ? (
          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{curiosity}</p>
        ) : (
          <div className="text-center text-slate-500 space-y-3">
            <Sparkles className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm">Clique no botão para descobrir uma curiosidade!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyCuriosity;
