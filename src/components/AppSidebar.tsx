import { Home, Calendar, Award, Zap, Map, FileText, Sparkles, Image, LogOut, Sun, Moon, Menu, X, Bot } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

export type SectionId = 'home' | 'plans' | 'trophies' | 'achieve' | 'panorama' | 'chat' | 'facts' | 'gallery';

interface Props {
  activeSection: SectionId;
  onNavigate: (section: SectionId) => void;
  displayName: string;
  onLogout: () => void;
  isLoggedIn: boolean;
  streak: number;
}

const navItems: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'plans', label: 'Planos', icon: Calendar },
  { id: 'trophies', label: 'Troféus', icon: Award },
  { id: 'achieve', label: 'Conquistas', icon: Zap },
  { id: 'panorama', label: 'Panorama', icon: Map },
  { id: 'chat', label: 'Perguntas', icon: Bot },
  { id: 'facts', label: 'Descobertas', icon: Sparkles },
  { id: 'gallery', label: 'Galeria', icon: Image },
];

const AppSidebar = ({ activeSection, onNavigate, displayName, onLogout, isLoggedIn, streak }: Props) => {
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleNav = (id: SectionId) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Calendar className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-foreground">Bíblia Cronológica</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map(item => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
            <span className="whitespace-nowrap">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
        )}
        {isLoggedIn && (
          <>
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {displayName?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="text-xs text-foreground truncate">{displayName || 'Usuário'}</span>
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

      {/* Mobile topbar with streak */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-14">
        <span className="text-sm font-semibold text-foreground">
          {navItems.find(n => n.id === activeSection)?.label || 'Início'}
        </span>
        {streak > 0 && (
          <button
            onClick={() => handleNav('achieve')}
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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            style={{ zIndex: 49 }}
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-card border-r border-border shadow-xl flex flex-col"
            style={{
              width: '240px',
              zIndex: 50,
              transform: 'translateX(0)',
              opacity: 1,
              visibility: 'visible',
            }}
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
          {/* Logo area */}
          <div className="p-4 flex items-center gap-3 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground hidden xl:block">Bíblia Cronológica</span>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
            {navItems.map(item => {
              const isActive = activeSection === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
                <span className="hidden xl:block whitespace-nowrap">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
              </button>
            )}
            {isLoggedIn && (
              <>
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {displayName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span className="text-xs text-foreground truncate hidden xl:block">{displayName || 'Usuário'}</span>
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
