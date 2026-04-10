import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";
import { fetchTranslation, type BibleVersion } from "@/hooks/useBibleData";
import { warmLexiconChapter } from "@/components/StrongsLexicon";

const CURIOSIDADES = [
  "A Bíblia foi escrita ao longo de aproximadamente 1.500 anos por mais de 40 autores diferentes.",
  "O livro de Ester é um dos dois livros da Bíblia que não menciona o nome de Deus diretamente.",
  "O versículo mais curto da Bíblia é João 11:35 — 'Jesus chorou.'",
  "Salmos é o livro mais longo da Bíblia, com 150 capítulos.",
  "A palavra 'Amém' aparece mais de 70 vezes no Novo Testamento.",
  "Metusalém é o homem mais velho da Bíblia, tendo vivido 969 anos (Gênesis 5:27).",
  "O nome 'Deus' aparece mais de 4.000 vezes na Bíblia.",
  "A Bíblia foi o primeiro livro impresso por Gutenberg por volta de 1455.",
  "O Salmo 119 é o capítulo mais longo da Bíblia, com 176 versículos.",
  "Josué 10:13 descreve o sol parando no céu — um dos eventos mais estudados pelos cientistas.",
  "O livro de Apocalipse foi escrito pelo apóstolo João na ilha de Patmos por volta do ano 95 d.C.",
  "A Bíblia foi traduzida para mais de 3.000 idiomas e dialetos.",
  "O Salmo 117 é o capítulo mais curto e também o capítulo central de toda a Bíblia.",
  "Daniel é o único livro do Antigo Testamento escrito em dois idiomas: hebraico e aramaico.",
];

const LEXICON_PRIORITY_CHAPTERS = [
  [1, 1],
  [19, 1],
  [40, 1],
  [43, 1],
] as const;

const LEXICON_BACKGROUND_QUEUE = Array.from({ length: 66 }, (_, index) => [index + 1, 1] as const);

interface Props { onReady: () => void; }

export default function SplashScreen({ onReady }: Props) {
  const [curiosidadeIdx, setCuriosidadeIdx] = useState(() =>
    Math.floor(Math.random() * CURIOSIDADES.length)
  );
  const [fade, setFade] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Preparando seu app...");
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCuriosidadeIdx(i => (i + 1) % CURIOSIDADES.length);
        setFade(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const startTime = Date.now();
    const versions: BibleVersion[] = ["nvi", "naa", "ntlh"];
    const totalSteps = versions.length + 1; // +1 for Strong's preload
    let settledCount = 0;

    const advance = (msg: string) => {
      settledCount += 1;
      setProgress(Math.round((settledCount / totalSteps) * 100));
      setStatusMsg(msg);
    };

    setStatusMsg("Baixando traduções da Bíblia...");

    const biblePromises = versions.map((v) =>
      fetchTranslation(v)
        .then(() => advance(`${settledCount + 1}ª versão carregada ✓`))
        .catch(() => advance("Continuando..."))
    );

    // Preload Strong's data for both testaments and keep warming all books in background
    const strongsPreload = (async () => {
      try {
        await Promise.allSettled(
          LEXICON_PRIORITY_CHAPTERS.map(([bookNumber, chapter]) => warmLexiconChapter(bookNumber, chapter))
        );
        advance("Léxico AT + NT pré-carregado ✓");

        void (async () => {
          const batchSize = 4;
          for (let index = 0; index < LEXICON_BACKGROUND_QUEUE.length; index += batchSize) {
            const batch = LEXICON_BACKGROUND_QUEUE.slice(index, index + batchSize);
            await Promise.allSettled(
              batch.map(([bookNumber, chapter]) => warmLexiconChapter(bookNumber, chapter))
            );
          }
        })();
      } catch {
        advance("Continuando...");
      }
    })();

    Promise.allSettled([...biblePromises, strongsPreload]).then(() => {
      setStatusMsg("Tudo pronto ✓");
      setProgress(100);
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2000 - elapsed);
      setTimeout(() => {
        setExiting(true);
        setTimeout(onReady, 600);
      }, remaining);
    });
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(165deg, #1a2200 0%, #0d1500 40%, #080c00 100%)",
        opacity: exiting ? 0 : 1,
        transition: "opacity 0.6s ease",
        padding: "24px",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", marginBottom: "48px" }}>
        <BookOpen size={56} color="#c8f000" strokeWidth={1.5} />
        <div style={{ textAlign: "center", marginTop: "8px" }}>
          <p style={{
            fontSize: "16px",
            fontWeight: 400,
            color: "#b0b0a0",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            margin: 0,
          }}>
            JORNADA
          </p>
          <p style={{
            fontSize: "32px",
            fontWeight: 800,
            fontStyle: "italic",
            color: "#ffffff",
            letterSpacing: "0.02em",
            margin: "2px 0 0",
          }}>
            BÍBLICA
          </p>
          <div style={{
            width: "80px",
            height: "2px",
            background: "#c8f000",
            margin: "8px auto 0",
            borderRadius: "1px",
          }} />
        </div>
      </div>

      {/* Card de curiosidade */}
      <div
        style={{
          maxWidth: 380,
          width: "100%",
          background: "rgba(255,255,255,0.05)",
          borderRadius: 16,
          padding: "20px 24px",
          marginBottom: 48,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <p style={{ fontSize: "10px", fontWeight: 700, color: "#c8f000", letterSpacing: "1px", marginBottom: 10, textTransform: "uppercase" }}>
          💡 Curiosidade Bíblica
        </p>
        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.6,
            color: "#f0f0ea",
            margin: 0,
            minHeight: 66,
            opacity: fade ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        >
          {CURIOSIDADES[curiosidadeIdx]}
        </p>
      </div>

      {/* Barra de progresso */}
      <div style={{ maxWidth: 320, width: "100%", textAlign: "center" }}>
        <p style={{ fontSize: "11px", color: "#8a8f7a", marginBottom: 10, minHeight: 16 }}>
          {statusMsg}
        </p>
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "#c8f000",
              borderRadius: 2,
              transition: "width 0.5s ease",
            }}
          />
        </div>
        <p style={{ fontSize: "11px", color: "#8a8f7a", marginTop: 8, opacity: 0.7 }}>
          {progress}%
        </p>
      </div>
    </div>
  );
}
