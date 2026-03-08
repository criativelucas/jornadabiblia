import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { Sun, Moon } from "lucide-react";

// DARK: valores extraídos do design LN4 original
const DARK = {
  accent:      "#d2ff00",
  accentDark:  "#a3c900",
  accentDim:   "rgba(210,255,0,0.10)",
  accentGlow:  "rgba(210,255,0,0.13)",
  page:        "#101400",
  card:        "#181c00",
  card2:       "#1e2300",
  border:      "rgba(210,255,0,0.08)",
  borderAc:    "rgba(210,255,0,0.25)",
  textPrimary: "#f0f0ea",
  textMuted:   "#8a8f7a",
  textDim:     "#4a5030",
  shadow:      "rgba(0,0,0,0.6)",
};

// LIGHT: genuinamente claro — creme + verde escuro legível
const LIGHT = {
  accent:      "#4a7c00",
  accentDark:  "#365a00",
  accentDim:   "rgba(74,124,0,0.09)",
  accentGlow:  "rgba(74,124,0,0.08)",
  page:        "#f5f5ee",
  card:        "#ffffff",
  card2:       "#efefea",
  border:      "rgba(0,0,0,0.08)",
  borderAc:    "rgba(74,124,0,0.25)",
  textPrimary: "#1a1c0d",
  textMuted:   "#6a7060",
  textDim:     "#b0b8a0",
  shadow:      "rgba(0,0,0,0.07)",
};

export type Theme = typeof DARK;

interface ThemeContextValue {
  T: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  T: DARK,
  isDark: true,
  toggleTheme: () => {},
});

export function useThemeContext() {
  return useContext(ThemeContext);
}

export { useThemeContext as useTheme };

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("jb-theme") !== "light"; }
    catch { return true; }
  });

  const T = isDark ? DARK : LIGHT;

  useEffect(() => {
    document.body.style.background = T.page;
    document.body.style.minHeight = "100vh";
    document.documentElement.style.background = T.page;
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try { localStorage.setItem("jb-theme", isDark ? "dark" : "light"); }
    catch {}
  }, [isDark, T.page]);

  const toggleTheme = () => setIsDark((d) => !d);

  return (
    <ThemeContext.Provider value={{ T, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { T, isDark, toggleTheme } = useThemeContext();
  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 px-3 py-1.5 transition-all duration-300 ${className ?? ""}`}
      style={{
        background: T.card2,
        border: `1px solid ${T.border}`,
        color: T.textMuted,
        clipPath: "polygon(0 0, 100% 0, 100% 75%, 90% 100%, 0 100%)",
      }}
    >
      {isDark ? (
        <>
          <Sun size={13} />
          <span className="text-xs font-black uppercase tracking-tight">Dia</span>
        </>
      ) : (
        <>
          <Moon size={13} />
          <span className="text-xs font-black uppercase tracking-tight">Noite</span>
        </>
      )}
    </button>
  );
}

export function Eyebrow({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  const { T } = useThemeContext();
  return (
    <p
      className="text-[10px] font-bold uppercase tracking-widest"
      style={{ color: accent ? T.accent : T.textMuted }}
    >
      {children}
    </p>
  );
}
