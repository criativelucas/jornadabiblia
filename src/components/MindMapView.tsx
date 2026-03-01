import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, Trash2, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

interface MindMapNode {
  id: string;
  label: string;
  tipo: 'tema' | 'personagem' | 'evento' | 'lugar';
  filhos: { id: string; label: string }[];
}

interface MindMapData {
  centro: string;
  nos: MindMapNode[];
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bible-chat`;

const typeColors: Record<string, { bg: string; border: string }> = {
  tema:       { bg: 'rgba(26,86,255,0.12)',  border: '#1A56FF' },
  personagem: { bg: 'rgba(204,255,0,0.1)',    border: '#CCFF00' },
  evento:     { bg: 'rgba(249,115,22,0.12)',  border: '#F97316' },
  lugar:      { bg: 'rgba(16,185,129,0.12)',  border: '#10B981' },
};

interface Props {
  bookName: string;
  userId: string;
}

const MindMapView = ({ bookName, userId }: Props) => {
  const [data, setData] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const storageKey = `user:${userId}:mindmap:${bookName}`;

  useEffect(() => {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try { setData(JSON.parse(cached)); } catch { generateMap(); }
    } else {
      generateMap();
    }
  }, [bookName]);

  const generateMap = async () => {
    setLoading(true);
    setError('');
    try {
      const prompt = `Gere um mapa mental em JSON para o livro bíblico '${bookName}'. Responda APENAS com JSON válido, sem texto extra, neste formato exato: { "centro": "string", "nos": [ { "id": "string", "label": "string (máx 4 palavras)", "tipo": "tema|personagem|evento|lugar", "filhos": [ { "id": "string", "label": "string (máx 5 palavras)" } ] } ] }. Máximo 6 nós principais, 3 filhos por nó.`;

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], type: 'mindmap' }),
      });

      if (!resp.ok || !resp.body) throw new Error('Erro ao gerar mapa');

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
          try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) text += c; } catch {}
        }
      }

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta inválida da IA');
      const mapData = JSON.parse(jsonMatch[0]) as MindMapData;
      setData(mapData);
      localStorage.setItem(storageKey, JSON.stringify(mapData));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveMap = () => {
    if (data) {
      localStorage.setItem(storageKey, JSON.stringify(data));
      toast.success('Mapa mental salvo!');
    }
  };

  const startEdit = (nodeId: string, currentLabel: string) => {
    setEditingNode(nodeId);
    setEditText(currentLabel);
  };

  const confirmEdit = () => {
    if (!data || !editingNode || !editText.trim()) return;
    const updated = { ...data, nos: data.nos.map(n => {
      if (n.id === editingNode) return { ...n, label: editText.trim() };
      return { ...n, filhos: n.filhos.map(f => f.id === editingNode ? { ...f, label: editText.trim() } : f) };
    })};
    setData(updated);
    setEditingNode(null);
  };

  const deleteNode = (nodeId: string) => {
    if (!data) return;
    const updated = { ...data, nos: data.nos.filter(n => n.id !== nodeId).map(n => ({
      ...n, filhos: n.filhos.filter(f => f.id !== nodeId),
    }))};
    setData(updated);
  };

  const addChild = (parentId: string) => {
    if (!data) return;
    const newId = `child_${Date.now()}`;
    const updated = { ...data, nos: data.nos.map(n =>
      n.id === parentId ? { ...n, filhos: [...n.filhos, { id: newId, label: 'Novo tópico' }] } : n
    )};
    setData(updated);
    startEdit(newId, 'Novo tópico');
  };

  const handleRegenerate = () => {
    if (confirm('Isso substituirá suas edições. Continuar?')) {
      localStorage.removeItem(storageKey);
      generateMap();
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Gerando mapa mental...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-2xl">
        <p className="text-sm text-muted-foreground mb-3">Não foi possível gerar o mapa.</p>
        <button onClick={generateMap} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <RefreshCw className="w-4 h-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground">Mapa Mental — {bookName}</h3>
        <div className="flex gap-2">
          <button onClick={handleRegenerate} className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-all" title="Regenerar">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={saveMap} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
            Salvar
          </button>
        </div>
      </div>

      {/* Tree layout */}
      <div className="bg-card border border-border rounded-2xl p-4 overflow-x-auto">
        {/* Center node */}
        <div className="flex justify-center mb-6">
          <div className="px-5 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-sm">
            {data.centro}
          </div>
        </div>

        {/* Main nodes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.nos.map(node => {
            const colors = typeColors[node.tipo] || typeColors.tema;
            return (
              <div key={node.id} className="rounded-xl border p-3 space-y-2" style={{ backgroundColor: colors.bg, borderColor: colors.border + '40' }}>
                <div className="flex items-center justify-between gap-1">
                  {editingNode === node.id ? (
                    <div className="flex items-center gap-1 flex-grow">
                      <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmEdit()}
                        className="flex-grow px-2 py-1 text-sm rounded bg-background border border-border text-foreground" autoFocus />
                      <button onClick={confirmEdit} className="p-1 text-primary"><Check className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(node.id, node.label)} className="text-sm font-semibold text-foreground text-left flex-grow">
                      {node.label}
                    </button>
                  )}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => addChild(node.id)} className="p-1 text-muted-foreground hover:text-primary"><Plus className="w-3 h-3" /></button>
                    <button onClick={() => deleteNode(node.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ backgroundColor: colors.border + '20', color: colors.border }}>
                  {node.tipo}
                </span>
                {node.filhos.length > 0 && (
                  <div className="space-y-1 pl-2 border-l-2" style={{ borderColor: colors.border + '30' }}>
                    {node.filhos.map(filho => (
                      <div key={filho.id} className="flex items-center justify-between gap-1">
                        {editingNode === filho.id ? (
                          <div className="flex items-center gap-1 flex-grow">
                            <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmEdit()}
                              className="flex-grow px-2 py-0.5 text-xs rounded bg-background border border-border text-foreground" autoFocus />
                            <button onClick={confirmEdit} className="p-0.5 text-primary"><Check className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(filho.id, filho.label)} className="text-xs text-muted-foreground text-left flex-grow hover:text-foreground transition-colors">
                            {filho.label}
                          </button>
                        )}
                        <button onClick={() => deleteNode(filho.id)} className="p-0.5 text-muted-foreground/50 hover:text-destructive flex-shrink-0"><Trash2 className="w-2.5 h-2.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MindMapView;
