import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Msg = { role: 'user' | 'assistant'; content: string };
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bible-chat`;
const MAX_INPUT_LENGTH = 500;

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Faça login para usar o chat');
  return session.access_token;
}

async function streamChat({ messages, onDelta, onDone }: { messages: Msg[]; onDelta: (t: string) => void; onDone: () => void }) {
  const token = await getAuthToken();
  const resp = await fetch(CHAT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ messages, type: 'chat' }) });
  if (!resp.ok || !resp.body) { const d = await resp.json().catch(() => ({})); throw new Error(d.error || 'Falha na conexão'); }
  const reader = resp.body.getReader(); const decoder = new TextDecoder(); let buffer = '', done = false;
  while (!done) {
    const { done: rDone, value } = await reader.read(); if (rDone) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, idx); buffer = buffer.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { done = true; break; }
      try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) onDelta(c); } catch {}
    }
  }
  onDone();
}

const BibleChat = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (text.length > MAX_INPUT_LENGTH) return;
    if (text.length < 3) return;
    setInput('');
    const userMsg: Msg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]); setIsLoading(true);
    let soFar = '';
    const upsert = (chunk: string) => { soFar += chunk; setMessages(prev => { const last = prev[prev.length - 1]; if (last?.role === 'assistant') return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: soFar } : m); return [...prev, { role: 'assistant', content: soFar }]; }); };
    try { await streamChat({ messages: [...messages, userMsg], onDelta: upsert, onDone: () => setIsLoading(false) }); }
    catch (e: unknown) { const msg = e instanceof Error ? e.message : 'Erro desconhecido'; setMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${msg}` }]); setIsLoading(false); }
  };

  return (
    <div className="flex flex-col h-[500px] bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
          <Bot className="w-5 h-5 text-primary" />
          Pergunte sobre a Bíblia
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Tire suas dúvidas teológicas com IA</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-12 space-y-2">
            <Bot className="w-12 h-12 mx-auto opacity-30" />
            <p className="text-sm">Faça uma pergunta sobre a Bíblia...</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {['Quem escreveu Gênesis?', 'O que significa Apocalipse?', 'Quem foi Melquisedeque?'].map(q => (
                <button key={q} onClick={() => setInput(q)} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all">{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="w-4 h-4 text-primary" /></div>}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>{m.content}</div>
            {m.role === 'user' && <div className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary flex items-center justify-center"><User className="w-4 h-4 text-secondary-foreground" /></div>}
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center"><Loader2 className="w-4 h-4 text-primary animate-spin" /></div>
            <div className="bg-muted rounded-2xl px-4 py-3"><div className="flex gap-1"><div className="w-2 h-2 bg-primary rounded-full animate-bounce" /><div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" /></div></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder="Pergunte algo sobre a Bíblia..."
            maxLength={MAX_INPUT_LENGTH}
            className="flex-1 bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
          <button onClick={send} disabled={isLoading || !input.trim()} className="p-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 transition-all">
            <Send className="w-4 h-4" />
          </button>
        </div>
        {input.length > MAX_INPUT_LENGTH - 50 && (
          <p className="text-[10px] text-muted-foreground mt-1 text-right">{input.length}/{MAX_INPUT_LENGTH}</p>
        )}
      </div>
    </div>
  );
};

export default BibleChat;
