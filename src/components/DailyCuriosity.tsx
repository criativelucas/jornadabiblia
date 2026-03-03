import { useState } from "react";
import { Sparkles, ChevronDown, X, Loader2 } from "lucide-react";

const presetCuriosities = [
  { titulo: "O livro mais longo", texto: "Salmos tem 150 capítulos e 2.461 versículos — o maior livro da Bíblia." },
  { titulo: "O versículo mais curto", texto: "'Jesus chorou' (João 11:35) — o versículo mais curto em português." },
  {
    titulo: "40 autores, 1 mensagem",
    texto: "A Bíblia foi escrita por cerca de 40 autores ao longo de 1.500 anos, em 3 continentes.",
  },
  {
    titulo: "A palavra mais repetida",
    texto: "'Senhor' aparece mais de 7.000 vezes — a palavra mais frequente em toda a Escritura.",
  },
  {
    titulo: "O capítulo central",
    texto: "Salmo 117 é o capítulo mais curto e também o central dos 1.189 capítulos da Bíblia.",
  },
  {
    titulo: "O livro mais vendido",
    texto: "Com mais de 5 bilhões de cópias, a Bíblia é o livro mais vendido e traduzido da história.",
  },
  {
    titulo: "A Bíblia em números",
    texto: "66 livros, 1.189 capítulos, 31.102 versículos e cerca de 783.137 palavras.",
  },
  {
    titulo: "Línguas originais",
    texto: "AT escrito em hebraico e aramaico; NT em grego koiné, o grego popular da época.",
  },
];

// Temas variados para garantir curiosidades diferentes a cada clique
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

  const discoverNew = async () => {
    setLoading(true);
    setError("");
    setAiCuriosity(null);

    // Sorteia tema não repetido
    const available = TEMAS.map((_, i) => i).filter((i) => !usedTemas.has(i));
    const pool = available.length > 0 ? available : TEMAS.map((_, i) => i);
    if (available.length === 0) setUsedTemas(new Set());
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setUsedTemas((prev) => new Set(prev).add(pick));
    const tema = TEMAS[pick];

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Você é um especialista em história bíblica, arqueologia e cultura do Oriente Médio antigo. 
Responda APENAS com um objeto JSON válido, sem nenhum texto antes ou depois, sem markdown, sem blocos de código.
Formato exato: {"titulo": "string curto e instigante", "paragrafos": ["parágrafo 1", "parágrafo 2", "parágrafo 3 opcional"]}
Regras:
- O título deve ser curto, direto e instigante (máx 8 palavras)
- Escreva entre 2 e 3 parágrafos
- Cada parágrafo deve ter entre 3 e 5 frases
- Use linguagem acessível, envolvente e precisa
- Inclua detalhes históricos, culturais ou arqueológicos concretos
- NÃO use listas, marcadores ou subtítulos dentro dos parágrafos
- Responda em português do Brasil`,
          messages: [
            {
              role: "user",
              content: `Gere uma curiosidade bíblica fascinante e pouco conhecida sobre: ${tema}. A curiosidade deve ser inédita, educativa e surpreendente.`,
            },
          ],
        }),
      });

      const data = await response.json();
      const raw = data?.content?.[0]?.text || "";

      // Parse seguro do JSON
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed: AiCuriosity = JSON.parse(clean);

      if (!parsed.titulo || !Array.isArray(parsed.paragrafos) || parsed.paragrafos.length < 2) {
        throw new Error("Resposta inválida");
      }

      setAiCuriosity(parsed);
    } catch {
      setError("Não foi possível gerar a curiosidade. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Discover button */}
      <button
        onClick={discoverNew}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-[10px] bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Gerando curiosidade...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" /> Descubra algo novo!
          </>
        )}
      </button>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-[14px] bg-destructive/10 border border-destructive/20 text-sm text-destructive text-center">
          {error}
        </div>
      )}

      {/* AI generated curiosity card */}
      {aiCuriosity && !loading && (
        <div className="relative bg-primary/[0.08] border border-primary/20 rounded-[14px] p-[18px]">
          <button
            onClick={() => setAiCuriosity(null)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <h4 className="text-sm font-bold text-primary mb-3 pr-6">{aiCuriosity.titulo}</h4>
          <div className="space-y-3">
            {aiCuriosity.paragrafos.map((p, i) => (
              <p key={i} className="text-sm text-foreground/80 leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Fixed preset list */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Sabia que...</p>
        </div>
        <div className="divide-y divide-border">
          {presetCuriosities.map((c, i) => (
            <div key={i}>
              <button
                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-all"
              >
                <span className="text-sm font-medium text-foreground">{c.titulo}</span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-2 ${expandedIndex === i ? "rotate-180" : ""}`}
                />
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
