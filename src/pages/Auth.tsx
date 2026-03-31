import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useThemeContext } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { lovable } from '@/integrations/lovable/index';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { T, isDark } = useThemeContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    if (isSignUp) {
      if (!displayName.trim()) { toast.error('Por favor, informe seu nome.'); setLoading(false); return; }
      const { error } = await signUp(email, password, displayName.trim());
      if (error) toast.error(error.message); else toast.success('Conta criada! Verifique seu e-mail.');
    } else {
      const { error } = await signIn(email, password);
      if (error) toast.error('E-mail ou senha incorretos.'); else navigate('/');
    }
    setLoading(false);
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (error) toast.error(`Erro ao entrar com ${provider === 'google' ? 'Google' : 'Apple'}`);
    } catch {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setSocialLoading(null);
    }
  };

  const inputBorderDefault = isDark ? T.textDim : T.border;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: T.page }}>
      {/* Left: Impact Visual */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 lg:py-0">
        <div className="max-w-lg">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ color: T.textMuted }}>
              Jornada Bíblica
            </p>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.9]" style={{ color: T.textPrimary }}>
            Leia.<br />
            <span className="text-impact italic" style={{ color: T.accent }}>Acompanhe.</span><br />
            Conquiste.
          </h1>
          <p className="mt-6 text-sm lg:text-base" style={{ color: T.textMuted }}>
            O tracker de leitura bíblica com gamificação.
          </p>
          <div className="mt-8 flex gap-4">
            <div className="h-[2px] w-12" style={{ background: T.accent }} />
            <div className="h-[2px] w-8" style={{ background: T.accentDim }} />
            <div className="h-[2px] w-4" style={{ background: T.accentGlow }} />
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-16" style={{ background: T.card }}>
        <div className="w-full max-w-sm space-y-6">
          {/* Social Login Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={!!socialLoading}
              className="w-full py-3.5 flex items-center justify-center gap-3 text-sm font-bold transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{
                borderRadius: '0.75rem',
                background: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                border: `1.5px solid ${T.border}`,
                color: T.textPrimary,
              }}
            >
              {socialLoading === 'google' ? (
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: T.textMuted, borderTopColor: 'transparent' }} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Continuar com Google
            </button>

            <button
              onClick={() => handleSocialLogin('apple')}
              disabled={!!socialLoading}
              className="w-full py-3.5 flex items-center justify-center gap-3 text-sm font-bold transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{
                borderRadius: '0.75rem',
                background: isDark ? '#fff' : '#000',
                color: isDark ? '#000' : '#fff',
              }}
            >
              {socialLoading === 'apple' ? (
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: isDark ? '#666' : '#999', borderTopColor: 'transparent' }} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isDark ? '#000' : '#fff'}>
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              )}
              Continuar com Apple
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: T.border }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textDim }}>ou</span>
            <div className="flex-1 h-px" style={{ background: T.border }} />
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: T.textPrimary }}>
                {isSignUp ? 'Criar Conta' : 'Entrar'}
              </h2>
              <p className="text-xs mt-1" style={{ color: T.textMuted }}>
                {isSignUp ? 'Comece sua jornada bíblica' : 'Continue de onde parou'}
              </p>
            </div>

            {isSignUp && (
              <div className="relative">
                <User className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.textMuted }} />
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={100}
                  className="w-full pl-7 pr-0 py-3 bg-transparent border-0 border-b text-sm focus:outline-none transition-all duration-300"
                  style={{ borderColor: inputBorderDefault, color: T.textPrimary }}
                  onFocus={e => e.target.style.borderColor = T.accent}
                  onBlur={e => e.target.style.borderColor = inputBorderDefault}
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.textMuted }} />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                maxLength={255}
                className="w-full pl-7 pr-0 py-3 bg-transparent border-0 border-b text-sm focus:outline-none transition-all duration-300"
                style={{ borderColor: inputBorderDefault, color: T.textPrimary }}
                onFocus={e => e.target.style.borderColor = T.accent}
                onBlur={e => e.target.style.borderColor = inputBorderDefault}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.textMuted }} />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-7 pr-0 py-3 bg-transparent border-0 border-b text-sm focus:outline-none transition-all duration-300"
                style={{ borderColor: inputBorderDefault, color: T.textPrimary }}
                onFocus={e => e.target.style.borderColor = T.accent}
                onBlur={e => e.target.style.borderColor = inputBorderDefault}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 font-black uppercase tracking-tight text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:opacity-90 disabled:opacity-50"
              style={{
                background: T.accent,
                color: T.page,
                clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 100%, 0 100%)',
              }}
            >
              {loading ? 'Carregando...' : isSignUp ? 'Criar Conta' : 'Entrar'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-center text-xs" style={{ color: T.textMuted }}>
              {isSignUp ? 'Já tem conta?' : 'Não tem conta?'}{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-bold hover:underline transition-all"
                style={{ color: T.accent }}
              >
                {isSignUp ? 'Entrar' : 'Criar conta'}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
