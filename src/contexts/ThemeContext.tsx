import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { Sun, Moon } from "lucide-react";

const DARK = {
  accent: "#a3e635",
  accentDim: "rgba(163,230,53,0.13)",
  accentGlow: "rgba(163,230,53,0.15)",
  page: "#0d0d0d",
  card: "#141414",
  card2: "#1c1c1c",
  border: "rgba(255,255,255,0.07)",
  borderAc: "rgba(163,230,53,0.28)",
  textPrimary: "#f4fce3",
  textMuted: "#6b7a50",
  textDim: "#3a4020",
  shadow: "rgba(0,0,0,0.5)",
};

const LIGHT = {
  accent: "#65a30d",
  accentDim: "rgba(101,163,13,0.10)",
  accentGlow: "rgba(101,163,13,0.10)",
  page: "#f0f0ea",
  card: "#ffffff",
  card2: "#f5f5ef",
  border: "rgba(0,0,0,0.07)",
  borderAc: "rgba(101,163,13,0.30)",
  textPrimary: "#1a1a0d",
  textMuted: "#7a8060",
  textDim: "#b8c090",
  shadow: "rgba(0,0,0,0.08)",
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

// Alias for shorter import
export { useThemeContext as useTheme };

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("jb-theme");
    return stored ? stored === "dark" : true;
  });

  const T = isDark ? DARK : LIGHT;

  useEffect(() => {
    localStorage.setItem("jb-theme", isDark ? "dark" : "light");
    document.body.style.background = T.page;
    document.body.style.minHeight = "100vh";
    document.documentElement.style.background = T.page;
    // Also set class for any Tailwind dark: usage
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark, T.page]);

  const toggleTheme = () => setIsDark((d) => !d);

  return (
    <ThemeContext.Provider value={{ T, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeToggle() {
  const { T, isDark, toggleTheme } = useThemeContext();
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300"
      style={{
        background: T.card2,
        border: `1px solid ${T.border}`,
        color: T.textMuted,
      }}
    >
      {isDark ? (
        <>
          <Sun size={13} />
          <span className="text-xs font-bold">Dia</span>
        </>
      ) : (
        <>
          <Moon size={13} />
          <span className="text-xs font-bold">Noite</span>
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
