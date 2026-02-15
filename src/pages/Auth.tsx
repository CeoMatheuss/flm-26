import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import flmLogo from '@/assets/flm26-logo.png';
import { Trophy, Users, Target, Swords, TrendingUp, Star } from 'lucide-react';

const features = [
  { icon: Users, title: 'Gerencie seu Elenco', desc: 'Contrate, treine e escale jogadores' },
  { icon: Swords, title: 'Simule Partidas', desc: 'Jogue campeonatos e copas' },
  { icon: Target, title: 'Táticas 2D', desc: 'Escalação visual no campo' },
  { icon: TrendingUp, title: 'Mercado Dinâmico', desc: 'Compra e venda de jogadores' },
  { icon: Trophy, title: 'Multiplayer Online', desc: 'Ligas com amigos em tempo real' },
  { icon: Star, title: 'Base & Juventude', desc: 'Desenvolva jovens talentos' },
];

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast.error('Erro ao entrar com Google');
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName || 'Manager' },
      },
    });
    if (error) toast.error(error.message);
    else toast.success('Conta criada! Verifique seu email para confirmar.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gap-6">
      {/* Hero */}
      <div className="text-center space-y-2 max-w-md">
        <img src={flmLogo} alt="FLM 26" className="w-20 h-20 mx-auto" />
        <h1 className="text-3xl font-bold tracking-tight">FLM 26</h1>
        <p className="text-muted-foreground text-sm">Football League Manager 2026</p>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-center">Entrar no Jogo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Button */}
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-11 gap-3"
            variant="outline"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loading ? 'Entrando...' : 'Entrar com Google'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou com email</span></div>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="w-full mb-3">
              <TabsTrigger value="login" className="flex-1 text-xs">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1 text-xs">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-3">
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="h-10" />
                <Input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required className="h-10" />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3">
                <Input placeholder="Nome do Manager" value={displayName} onChange={e => setDisplayName(e.target.value)} className="h-10" />
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="h-10" />
                <Input type="password" placeholder="Senha (mín. 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="h-10" />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Conta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold text-center text-muted-foreground uppercase tracking-wider mb-3">Destaques v2026</p>
        <div className="grid grid-cols-2 gap-2">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg border border-border/50 bg-card/30">
              <f.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{f.title}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-3">
          🆕 Escalação 2D • Jornal Dinâmico • Criação de Clube • Multiplayer Online
        </p>
      </div>
    </div>
  );
}
