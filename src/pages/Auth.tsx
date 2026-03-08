import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: '#101400' }}>
      {/* Left: Impact Visual */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 lg:py-0">
        <div className="max-w-lg">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ color: '#8A8F7A' }}>
              Jornada Bíblica
            </p>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.9]" style={{ color: '#f0f4d4' }}>
            Leia.<br />
            <span className="text-impact italic" style={{ color: '#D2FF00' }}>Acompanhe.</span><br />
            Conquiste.
          </h1>
          <p className="mt-6 text-sm lg:text-base" style={{ color: '#8A8F7A' }}>
            O tracker de leitura bíblica com gamificação.
          </p>
          <div className="mt-8 flex gap-4">
            <div className="h-[2px] w-12" style={{ background: '#D2FF00' }} />
            <div className="h-[2px] w-8" style={{ background: 'rgba(210,255,0,0.3)' }} />
            <div className="h-[2px] w-4" style={{ background: 'rgba(210,255,0,0.15)' }} />
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-16" style={{ background: '#1A1F00' }}>
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: '#f0f4d4' }}>
              {isSignUp ? 'Criar Conta' : 'Entrar'}
            </h2>
            <p className="text-xs mt-1" style={{ color: '#8A8F7A' }}>
              {isSignUp ? 'Comece sua jornada bíblica' : 'Continue de onde parou'}
            </p>
          </div>

          {isSignUp && (
            <div className="relative">
              <User className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8A8F7A' }} />
              <input
                type="text"
                placeholder="Seu nome"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={100}
                className="w-full pl-7 pr-0 py-3 bg-transparent border-0 border-b text-sm focus:outline-none transition-all duration-300"
                style={{
                  borderColor: '#2a3000',
                  color: '#f0f4d4',
                }}
                onFocus={e => e.target.style.borderColor = '#D2FF00'}
                onBlur={e => e.target.style.borderColor = '#2a3000'}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8A8F7A' }} />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              maxLength={255}
              className="w-full pl-7 pr-0 py-3 bg-transparent border-0 border-b text-sm focus:outline-none transition-all duration-300"
              style={{
                borderColor: '#2a3000',
                color: '#f0f4d4',
              }}
              onFocus={e => e.target.style.borderColor = '#D2FF00'}
              onBlur={e => e.target.style.borderColor = '#2a3000'}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8A8F7A' }} />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-7 pr-0 py-3 bg-transparent border-0 border-b text-sm focus:outline-none transition-all duration-300"
              style={{
                borderColor: '#2a3000',
                color: '#f0f4d4',
              }}
              onFocus={e => e.target.style.borderColor = '#D2FF00'}
              onBlur={e => e.target.style.borderColor = '#2a3000'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 font-black uppercase tracking-tight text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:opacity-90 disabled:opacity-50"
            style={{
              background: '#D2FF00',
              color: '#101400',
              clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 100%, 0 100%)',
            }}
          >
            {loading ? 'Carregando...' : isSignUp ? 'Criar Conta' : 'Entrar'}
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-xs" style={{ color: '#8A8F7A' }}>
            {isSignUp ? 'Já tem conta?' : 'Não tem conta?'}{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-bold hover:underline transition-all"
              style={{ color: '#D2FF00' }}
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
