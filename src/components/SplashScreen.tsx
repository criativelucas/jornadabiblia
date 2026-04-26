import { useState, useEffect, useRef } from "react";
import { BookOpen } from "lucide-react";
import { fetchTranslation, type BibleVersion } from "@/hooks/useBibleData";
import {
  LEXICON_BACKGROUND_CHAPTERS,
  LEXICON_STARTUP_CHAPTERS,
  warmLexiconChapter,
} from "@/components/StrongsLexicon";

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

interface Props { onReady: () => void; }

export default function SplashScreen({ onReady }: Props) {
  const [curiosidadeIdx, setCuriosidadeIdx] = useState(() =>
    Math.floor(Math.random() * CURIOSIDADES.length)
  );
  const [fade, setFade] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Iniciando...");
  const [exiting, setExiting] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const skippedRef = useRef(false);

  // Rotate trivia card
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

  const finish = () => {
    if (skippedRef.current) return;
    skippedRef.current = true;
    setExiting(true);
    setTimeout(onReady, 500);
  };

  useEffect(() => {
    // Allow skip after a small minimum window (UX safety so it doesn't flash)
    const skipTimer = setTimeout(() => setCanSkip(true), 1200);

    // ── ESSENTIAL preload (blocks splash) ─────────────────────────────────
    // Only the default Bible version + tiny lexicon warm-up.
    // Everything else loads in the background after the app opens.
    let done = 0;
    const total = 3; // NVI + lexicon-essential + small-buffer
    const tick = (msg: string) => {
      done = Math.min(done + 1, total);
      setProgress(Math.round((done / total) * 95)); // cap at 95%, finish() sets 100%
      setStatusMsg(msg);
    };

    setStatusMsg("Carregando Bíblia...");

    const essentialBible = fetchTranslation("nvi" as BibleVersion)
      .then(() => tick("Bíblia pronta ✓"))
      .catch(() => tick("Continuando offline..."));

    // Only warm a tiny set up-front (Genesis 1, John 1, Psalm 1) so the lexicon
    // opens instantly on common entry points. Everything else streams later.
    const essentialLexicon = (async () => {
      const essential = LEXICON_STARTUP_CHAPTERS.slice(0, 6);
      await Promise.allSettled(
        essential.map(([book, chap]) => warmLexiconChapter(book, chap))
      );
      tick("Léxico essencial pronto ✓");
    })();

    Promise.allSettled([essentialBible, essentialLexicon]).then(() => {
      tick("Tudo pronto ✓");
      setProgress(100);
      // Auto-finish quickly once essentials are ready
      setTimeout(finish, 350);
    });

    // ── BACKGROUND warm-up (non-blocking) ─────────────────────────────────
    // Other Bible versions + remaining lexicon chapters load silently
    // after the user is already in the app.
    void (async () => {
      const otherVersions: BibleVersion[] = ["naa", "ntlh"];
      for (const v of otherVersions) {
        try { await fetchTranslation(v); } catch {}
      }
      const allRemaining = [
        ...LEXICON_STARTUP_CHAPTERS.slice(6),
        ...LEXICON_BACKGROUND_CHAPTERS,
      ];
      const batchSize = 4;
      for (let i = 0; i < allRemaining.length; i += batchSize) {
        const batch = allRemaining.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(([book, chap]) => warmLexiconChapter(book, chap))
        );
      }
    })();

    // Hard ceiling: never block the user more than 6 seconds.
    const ceiling = setTimeout(() => {
      setProgress(100);
      finish();
    }, 6000);

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(ceiling);
    };
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
        transition: "opacity 0.5s ease",
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
          marginBottom: 32,
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
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <p style={{ fontSize: "11px", color: "#8a8f7a", marginTop: 8, opacity: 0.7 }}>
          {progress}%
        </p>

        {/* Skip button — appears after short delay */}
        <button
          type="button"
          onClick={finish}
          disabled={!canSkip}
          style={{
            marginTop: 24,
            padding: "10px 22px",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: canSkip ? "#0d1500" : "#5a6048",
            background: canSkip ? "#c8f000" : "rgba(200,240,0,0.15)",
            border: "none",
            borderRadius: 999,
            cursor: canSkip ? "pointer" : "default",
            opacity: canSkip ? 1 : 0.5,
            transition: "opacity 0.3s ease, transform 0.15s ease",
          }}
          onMouseDown={(e) => canSkip && (e.currentTarget.style.transform = "scale(0.97)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          Entrar agora →
        </button>
      </div>
    </div>
  );
}
