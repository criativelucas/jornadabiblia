import { useState } from "react";
import { Sparkles, ChevronDown, X, Loader2 } from "lucide-react";

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

const TEMAS = [
  "um fato histórico surpreendente sobre o contexto cultural do Oriente Médio antigo que ilumina um trecho bíblico",
  "uma curiosidade sobre arqueologia bíblica e como descobertas recentes confirmaram ou contextualizaram eventos da Bíblia",
  "um detalhe fascinante sobre a vida cotidiana no tempo de Jesus — alimentação, moradias, costumes sociais",
  "algo surpreendente sobre como a Bíblia foi transmitida, copiada e preservada ao longo dos séculos",
  "uma curiosidade sobre os números e a matemática encontrados na Bíblia — padrões, simbolismos e significados",
  "um fato pouco conhecido sobre um personagem bíblico secundário que teve papel surpreendente na história sagrada",
  "algo fascinante sobre os animais mencionados na Bíblia e seu papel simbólico ou literal nas narrativas",
  "uma curiosidade sobre os idiomas e expressões originais da Bíblia — palavras hebraicas ou gregas sem tradução exata",
  "um detalhe geográfico surpreendente sobre um lugar bíblico e o que arqueólogos descobriram nele",
  "um fato inusitado sobre as festas e calendários religiosos do povo de Israel e seu significado profundo",
  "algo pouco conhecido sobre como diferentes livros da Bíblia se conectam e dialogam entre si de forma surpreendente",
  "uma curiosidade sobre milagres bíblicos e como estudiosos e cientistas os analisaram ao longo dos séculos",
  "um fato fascinante sobre a música, os instrumentos e os Salmos na adoração do Israel antigo",
  "algo surpreendente sobre as profecias bíblicas — como foram escritas, interpretadas e cumpridas",
  "uma curiosidade sobre mulheres da Bíblia cujas histórias são pouco conhecidas mas extremamente relevantes",
];

const RATE_KEY = "curiosity_rate";
const RATE_LIMIT = 10;

function getRateInfo(): { count: number; date: string } {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { count: 0, date: "" };
}

function incrementRate() {
  const today = new Date().toISOString().slice(0, 10);
  const info = getRateInfo();
  const count = info.date === today ? info.count + 1 : 1;
  localStorage.setItem(RATE_KEY, JSON.stringify({ count, date: today }));
}

function isRateLimited(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const info = getRateInfo();
  return info.date === today && info.count >= RATE_LIMIT;
}

interface AiCuriosity {
  titulo: string;
  paragrafos: string[];
}

const DailyCuriosity = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [aiCuriosity, setAiCuriosity] = useState<AiCuriosity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usedTemas, setUsedTemas] = useState<Set<number>>(new Set());
  const [rateLimited, setRateLimited] = useState(isRateLimited());

  const discoverNew = async () => {
    if (isRateLimited()) {
      setRateLimited(true);
      return;
    }

    setLoading(true);
    setError("");
    setAiCuriosity(null);

    const available = TEMAS.map((_, i) => i).filter((i) => !usedTemas.has(i));
    const pool = available.length > 0 ? available : TEMAS.map((_, i) => i);
    if (available.length === 0) setUsedTemas(new Set());
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setUsedTemas((prev) => new Set(prev).add(pick));
    const tema = TEMAS[pick];

    try {
      const prompt = `Gere uma curiosidade bíblica fascinante e pouco conhecida sobre: ${tema}. 
Responda APENAS com um objeto JSON válido, sem nenhum texto antes ou depois, sem markdown, sem blocos de código.
Formato exato: {"titulo": "string curto e instigante (máx 8 palavras)", "paragrafos": ["parágrafo 1", "parágrafo 2", "parágrafo 3 opcional"]}
Regras: 2-3 parágrafos, 3-5 frases cada, linguagem acessível, inclua detalhes históricos concretos.`;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], type: "curiosity" }),
      });

      if (!resp.ok || !resp.body) throw new Error("Erro ao gerar curiosidade");

      // Stream the response
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", text = "", done = false;
      while (!done) {
        const { done: rDone, value } = await reader.read();
        if (rDone) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) text += c;
          } catch {}
        }
      }

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Resposta inválida");
      const parsed: AiCuriosity = JSON.parse(jsonMatch[0]);

      if (!parsed.titulo || !Array.isArray(parsed.paragrafos) || parsed.paragrafos.length < 2) {
        throw new Error("Resposta inválida");
      }

      setAiCuriosity(parsed);
      incrementRate();
      setRateLimited(isRateLimited());
    } catch {
      setError("Não foi possível gerar a curiosidade. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {rateLimited ? (
        <div className="p-5 rounded-[14px] bg-primary/5 border border-primary/10 text-center">
          <Sparkles className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-sm text-foreground font-medium mb-1">Limite diário atingido</p>
          <p className="text-xs text-muted-foreground">Você já descobriu 10 curiosidades hoje. Volte amanhã para mais! ✨</p>
        </div>
      ) : (
        <button
          onClick={discoverNew}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-[10px] bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Gerando curiosidade...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Descubra algo novo!</>
          )}
        </button>
      )}

      {error && (
        <div className="p-4 rounded-[14px] bg-destructive/10 border border-destructive/20 text-sm text-destructive text-center">
          {error}
        </div>
      )}

      {aiCuriosity && !loading && (
        <div className="relative bg-primary/[0.08] border border-primary/20 rounded-[14px] p-[18px] section-enter">
          <button onClick={() => setAiCuriosity(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
          <h4 className="text-sm font-bold text-primary mb-3 pr-6">{aiCuriosity.titulo}</h4>
          <div className="space-y-3">
            {aiCuriosity.paragrafos.map((p, i) => (
              <p key={i} className="text-sm text-foreground/80 leading-relaxed">{p}</p>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Sabia que...</p>
        </div>
        <div className="divide-y divide-border">
          {presetCuriosities.map((c, i) => (
            <div key={i}>
              <button onClick={() => setExpandedIndex(expandedIndex === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-all">
                <span className="text-sm font-medium text-foreground">{c.titulo}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-2 ${expandedIndex === i ? "rotate-180" : ""}`} />
              </button>
              {expandedIndex === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.texto}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyCuriosity;
