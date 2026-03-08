import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useThemeContext } from '@/contexts/ThemeContext';
import { toast } from 'sonner';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
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
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
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
                style={{
                  borderColor: inputBorderDefault,
                  color: T.textPrimary,
                }}
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
              style={{
                borderColor: inputBorderDefault,
                color: T.textPrimary,
              }}
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
              style={{
                borderColor: inputBorderDefault,
                color: T.textPrimary,
              }}
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
  );
};

export default Auth;
