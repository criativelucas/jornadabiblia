import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, User, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-primary/10 border border-primary/20">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Jornada Bíblica</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-card border border-border shadow-sm space-y-5">
          <h2 className="text-xl font-bold text-center mb-2 text-foreground">{isSignUp ? 'Criar Conta' : 'Entrar'}</h2>

          {isSignUp && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type="text" placeholder="Seu nome" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={100}
                className="w-full pl-11 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all" />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required maxLength={255}
              className="w-full pl-11 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all" />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full pl-11 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-lg bg-primary font-semibold text-primary-foreground flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? 'Carregando...' : isSignUp ? 'Criar Conta' : 'Entrar'}
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? 'Já tem conta?' : 'Não tem conta?'}{' '}
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-primary hover:underline font-medium">{isSignUp ? 'Entrar' : 'Criar conta'}</button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Auth;
