import {
  Home,
  Calendar,
  Award,
  Zap,
  Map,
  FileText,
  Sparkles,
  Image,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Bot,
  Camera,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SectionId = "home" | "plans" | "trophies" | "achieve" | "panorama" | "chat" | "facts" | "gallery";

interface Props {
  activeSection: SectionId;
  onNavigate: (section: SectionId) => void;
  displayName: string;
  onLogout: () => void;
  isLoggedIn: boolean;
  streak: number;
  userId?: string; // ← novo: passar user?.id do Index.tsx
  avatarUrl?: string; // ← novo: passar avatarUrl do Index.tsx (opcional, busca internamente)
  onAvatarChange?: (url: string) => void; // ← novo: callback quando avatar é atualizado
}

const navItems: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Início", icon: Home },
  { id: "plans", label: "Planos", icon: Calendar },
  { id: "trophies", label: "Troféus", icon: Award },
  { id: "achieve", label: "Conquistas", icon: Zap },
  { id: "panorama", label: "Panorama", icon: Map },
  { id: "chat", label: "Perguntas", icon: Bot },
  { id: "facts", label: "Descobertas", icon: Sparkles },
  { id: "gallery", label: "Galeria", icon: Image },
];

// ─── Avatar component ──────────────────────────────────────────────────────────
const UserAvatar = ({
  displayName,
  userId,
  avatarUrl: externalUrl,
  onAvatarChange,
  size = "sm",
}: {
  displayName: string;
  userId?: string;
  avatarUrl?: string;
  onAvatarChange?: (url: string) => void;
  size?: "sm" | "md";
}) => {
  const [localUrl, setLocalUrl] = useState<string | null>(externalUrl || null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch avatar from profile on mount
  useEffect(() => {
    if (!userId || externalUrl) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data && (data as any).avatar_url) setLocalUrl((data as any).avatar_url);
      });
  }, [userId, externalUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("Imagem muito grande. Máximo 3 MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${userId}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Add cache-buster so the browser reloads the image
      const finalUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase
        .from("profiles")
        .update({ avatar_url: finalUrl } as any)
        .eq("user_id", userId);

      setLocalUrl(finalUrl);
      onAvatarChange?.(finalUrl);
    } catch (err) {
      console.error("Erro ao fazer upload:", err);
      alert("Erro ao salvar a imagem. Verifique se o bucket 'avatars' existe no Supabase.");
    } finally {
      setUploading(false);
    }
  };

  const dim = size === "md" ? "w-9 h-9" : "w-7 h-7";
  const textSize = size === "md" ? "text-sm" : "text-xs";
  const initials = displayName?.charAt(0)?.toUpperCase() || "?";

  return (
    <div
      className={`relative flex-shrink-0 group ${userId ? "cursor-pointer" : ""}`}
      onClick={() => userId && fileRef.current?.click()}
    >
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      <div
        className={`${dim} rounded-full overflow-hidden flex items-center justify-center bg-primary/20 border border-primary/30`}
      >
        {uploading ? (
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : localUrl ? (
          <img src={localUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <span className={`${textSize} font-bold text-primary`}>{initials}</span>
        )}
      </div>

      {/* Camera overlay on hover */}
      {userId && !uploading && (
        <div
          className={`absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}
        >
          <Camera className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
};
// ──────────────────────────────────────────────────────────────────────────────

const AppSidebar = ({
  activeSection,
  onNavigate,
  displayName,
  onLogout,
  isLoggedIn,
  streak,
  userId,
  avatarUrl,
  onAvatarChange,
}: Props) => {
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNav = (id: SectionId) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Calendar className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-foreground">Jornada Bíblica</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-2">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            {theme === "dark" ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
            <span className="whitespace-nowrap">{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
          </button>
        )}
        {isLoggedIn && (
          <>
            <div className="flex items-center gap-3 px-3 py-2">
              <UserAvatar
                displayName={displayName}
                userId={userId}
                avatarUrl={avatarUrl}
                onAvatarChange={onAvatarChange}
              />
              <span className="text-xs text-foreground truncate">{displayName || "Usuário"}</span>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap">Sair</span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-[51] p-2 rounded-lg bg-card border border-border text-foreground shadow-sm"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile topbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-14">
        <span className="text-sm font-semibold text-foreground">
          {navItems.find((n) => n.id === activeSection)?.label || "Início"}
        </span>
        {streak > 0 && (
          <button
            onClick={() => handleNav("achieve")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold"
          >
            <Zap className="w-3.5 h-3.5" fill="currentColor" />
            {streak}
          </button>
        )}
      </div>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" style={{ zIndex: 49 }} onClick={() => setMobileOpen(false)} />
          <div
            className="absolute left-0 top-0 bottom-0 bg-card border-r border-border shadow-xl flex flex-col"
            style={{ width: "240px", zIndex: 50 }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-16 xl:w-56 bg-card border-r border-border z-40 flex-col">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 flex items-center gap-3 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground hidden xl:block">Jornada Bíblica</span>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="hidden xl:block whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-border space-y-2">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <Moon className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="hidden xl:block whitespace-nowrap">
                  {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                </span>
              </button>
            )}
            {isLoggedIn && (
              <>
                <div className="flex items-center gap-3 px-3 py-2">
                  <UserAvatar
                    displayName={displayName}
                    userId={userId}
                    avatarUrl={avatarUrl}
                    onAvatarChange={onAvatarChange}
                  />
                  <span className="text-xs text-foreground truncate hidden xl:block">{displayName || "Usuário"}</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Sair"
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  <span className="hidden xl:block whitespace-nowrap">Sair</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AppSidebar;
