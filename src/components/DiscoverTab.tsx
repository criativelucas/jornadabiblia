import { useState } from "react";
import { Sparkles, MessageCircle } from "lucide-react";
import { useThemeContext, Eyebrow } from "@/contexts/ThemeContext";
import BibleChat from "@/components/BibleChat";
import DailyCuriosity from "@/components/DailyCuriosity";

type InternalTab = "curiosidades" | "chat";

export default function DiscoverTab() {
  const { T } = useThemeContext();
  const [tab, setTab] = useState<InternalTab>("curiosidades");

  const tabs: { id: InternalTab; label: string; Icon: React.ElementType }[] = [
    { id: "curiosidades", label: "Curiosidades", Icon: Sparkles },
    { id: "chat", label: "Pergunte à IA", Icon: MessageCircle },
  ];

  return (
    <div className="space-y-5">
      <Eyebrow accent>Explorar</Eyebrow>
      <h2 className="text-3xl font-black" style={{ color: T.textPrimary, letterSpacing: "-0.04em" }}>
        Descobertas
      </h2>

      {/* Internal tab pills */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all"
            style={
              tab === t.id
                ? { background: T.accent, color: T.page }
                : { background: T.card2, color: T.textMuted, border: `1px solid ${T.border}` }
            }
          >
            <t.Icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "curiosidades" && <DailyCuriosity />}
      {tab === "chat" && (
        <div style={{ borderRadius: "0.875rem", overflow: "hidden", border: `1px solid ${T.border}`, background: T.card }}>
          <BibleChat />
        </div>
      )}
    </div>
  );
}
