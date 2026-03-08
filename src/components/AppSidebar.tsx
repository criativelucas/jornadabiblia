import { useNavigate } from "react-router-dom";
import { Home, Calendar, BookOpen, Trophy, User } from "lucide-react";
import { useThemeContext } from "@/contexts/ThemeContext";

export type SectionId = "home" | "bible" | "plans" | "achieve" | "profile";

interface NavItem {
  id: SectionId;
  label: string;
  Icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Início", Icon: Home },
  { id: "bible", label: "Bíblia", Icon: BookOpen },
  { id: "plans", label: "Planos", Icon: Calendar },
  { id: "achieve", label: "Conquistas", Icon: Trophy },
  { id: "profile", label: "Perfil", Icon: User },
];

interface Props {
  activeSection: SectionId;
  onNavigate: (section: SectionId) => void;
  streak: number;
  avatarUrl?: string | null;
  displayName?: string;
}

export default function AppSidebar({ activeSection, onNavigate, streak, avatarUrl, displayName }: Props) {
  const navigate = useNavigate();
  const { T, isDark, toggleTheme } = useThemeContext();

  const handleNav = (id: SectionId) => {
    if (id === "profile") {
      navigate("/profile");
    } else {
      onNavigate(id);
    }
  };

  return (
    <>
      {/* ── Mobile bottom navbar ──────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
        style={{
          height: "4rem",
          background: T.card,
          borderTop: `1px solid ${T.border}`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id || (item.id === "profile" && false);
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className="flex flex-col items-center gap-0.5 transition-colors duration-200"
              style={{
                padding: "0.5rem",
                color: isActive ? T.accent : T.textMuted,
                background: "transparent",
                border: "none",
              }}
            >
              <item.Icon size={22} />
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Desktop sidebar ───────────────────────────────────────── */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 flex-col items-center"
        style={{
          width: "64px",
          background: T.card,
          borderRight: `1px solid ${T.border}`,
          paddingTop: "1.5rem",
          paddingBottom: "1.5rem",
          gap: "0.25rem",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: T.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.5rem",
          }}
        >
          <BookOpen size={18} color={T.page} />
        </div>

        {/* Nav items */}
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              title={item.label}
              className="transition-all duration-200"
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isActive ? T.accentDim : "transparent",
                border: isActive ? `1px solid ${T.borderAc}` : "1px solid transparent",
                color: isActive ? T.accent : T.textMuted,
                cursor: "pointer",
              }}
            >
              <item.Icon size={20} />
            </button>
          );
        })}

        {/* Bottom: theme toggle + avatar */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          {/* Theme toggle — icon only */}
          <button
            onClick={toggleTheme}
            title={isDark ? "Modo dia" : "Modo noite"}
            className="transition-all duration-200"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "9999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              color: T.textMuted,
              border: "none",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          {/* Avatar */}
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "9999px",
              overflow: "hidden",
              border: `2px solid ${T.border}`,
              cursor: "pointer",
            }}
            onClick={() => navigate("/profile")}
          >
            {avatarUrl ? (
              <img src={avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: T.accentDim,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.accent,
                  fontWeight: 700,
                  fontSize: "12px",
                }}
              >
                {displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
