import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Trophy, Users, Target, Swords, TrendingUp, Shield, Globe, GraduationCap,
  Mail, ArrowLeft, CheckCircle2, Clock, RefreshCw,
  ChevronRight, Eye, EyeOff, Gamepad2, UserPlus, LogIn
} from 'lucide-react';
import gamePreview1 from '@/assets/game-preview.jpg';
import gamePreview2 from '@/assets/game-preview-2.jpg';
import gamePreview3 from '@/assets/game-preview-3.jpg';

const RESEND_COOLDOWN = 60;

const slides = [
  { img: gamePreview1, title: 'Gerencie seu Clube', desc: 'Escale, treine e leve seu time ao topo' },
  { img: gamePreview2, title: 'Disputas Online', desc: 'Campeonatos multiplayer competitivos' },
  { img: gamePreview3, title: 'Conquiste Títulos', desc: 'Infraestrutura, base e mercado dinâmico' },
];

const countryOptions = [
  { value: 'BR', label: '🇧🇷 Brasil', flag: '🇧🇷' },
  { value: 'AR', label: '🇦🇷 Argentina', flag: '🇦🇷' },
  { value: 'PT', label: '🇵🇹 Portugal', flag: '🇵🇹' },
  { value: 'ES', label: '🇪🇸 Espanha', flag: '🇪🇸' },
  { value: 'EN', label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { value: 'IT', label: '🇮🇹 Itália', flag: '🇮🇹' },
  { value: 'DE', label: '🇩🇪 Alemanha', flag: '🇩🇪' },
  { value: 'FR', label: '🇫🇷 França', flag: '🇫🇷' },
  { value: 'MX', label: '🇲🇽 México', flag: '🇲🇽' },
  { value: 'CO', label: '🇨🇴 Colômbia', flag: '🇨🇴' },
];

const formationOptions = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '4-1-4-1', '3-4-3', '5-3-2', '4-5-1'];

const playstyleOptions = [
  { value: 'offensive', label: '⚔️ Ofensivo', desc: 'Posse alta, pressão constante' },
  { value: 'defensive', label: '🛡️ Defensivo', desc: 'Contra-ataques mortais' },
  { value: 'balanced', label: '⚖️ Equilibrado', desc: 'Adaptável a qualquer rival' },
  { value: 'possession', label: '🎯 Posse de Bola', desc: 'Tiki-taka, toque curto' },
];

const features = [
  { icon: Users, title: 'Gerencie seu Elenco', desc: 'Contrate, treine e escale' },
  { icon: Swords, title: 'Simule Partidas', desc: 'Campeonatos com táticas' },
  { icon: Target, title: 'Táticas 2D', desc: 'Escalação visual interativa' },
  { icon: TrendingUp, title: 'Mercado Dinâmico', desc: 'Compra, venda e leilões' },
  { icon: Trophy, title: 'Multiplayer Online', desc: 'Ligas competitivas' },
  { icon: GraduationCap, title: 'Base & Olheiros', desc: 'Desenvolva talentos' },
  { icon: Shield, title: 'Infraestrutura', desc: 'CT, estádio e mais' },
  { icon: Globe, title: 'Eventos Aleatórios', desc: 'Lesões, protestos e surpresas' },
];

type AuthStep = 'welcome' | 'login' | 'signup-info' | 'verify-email';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  const [resendTimer, setResendTimer] = useState(0);
  const [step, setStep] = useState<AuthStep>('welcome');
  const [slideIndex, setSlideIndex] = useState(0);

  // Auto-rotate carousel
  useEffect(() => {
    const timer = setInterval(() => setSlideIndex(i => (i + 1) % slides.length), 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const startResendTimer = useCallback(() => setResendTimer(RESEND_COOLDOWN), []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin
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
    if (error) {
      if (error.message === 'Email not confirmed') {
        setPendingEmail(email);
        setStep('verify-email');
        startResendTimer();
        toast.info('Email não confirmado. Verifique sua caixa de entrada.');
        await supabase.auth.resend({ type: 'signup', email });
      } else {
        toast.error(error.message);
      }
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!displayName.trim()) {
      toast.error('Informe o nome do Manager');
      return;
    }
    if (password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: displayName.trim() || 'Manager',
        },
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      setPendingEmail(email);
      setStep('verify-email');
      startResendTimer();
      toast.success('Email de verificação enviado!');
    }
    setLoading(false);
  };

  const handleResendVerification = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail });
    if (error) toast.error('Erro ao reenviar email.');
    else {
      toast.success('Novo email de verificação enviado!');
      startResendTimer();
    }
    setLoading(false);
  };

  // ── Carousel component ──
  const CarouselPanel = ({ className = '' }: { className?: string }) => (
    <div className={`relative overflow-hidden ${className}`}>
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ${i === slideIndex ? 'opacity-100' : 'opacity-0'}`}
        >
          <img src={slide.img} alt={slide.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <h3 className="text-xl font-black text-foreground drop-shadow-lg">{slide.title}</h3>
            <p className="text-sm text-foreground/80">{slide.desc}</p>
          </div>
        </div>
      ))}
      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlideIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === slideIndex ? 'bg-primary w-5' : 'bg-foreground/30'}`}
          />
        ))}
      </div>
    </div>
  );

  // ── OTP STEP ──
  if (step === 'verify-email') {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <img src={slides[0].img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
        <Card className="w-full max-w-md border-border/30 bg-card/95 backdrop-blur-xl shadow-2xl relative z-10">
          <CardContent className="p-6 space-y-5">
            <div className="text-center space-y-3">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center relative">
                <Mail className="w-10 h-10 text-primary" />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-success/20 flex items-center justify-center border-2 border-card">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                </div>
              </div>
              <h2 className="text-xl font-black">Verifique seu Email! 📬</h2>
              <p className="text-sm text-muted-foreground">Enviamos um link de verificação para:</p>
              <Badge variant="secondary" className="text-xs font-bold px-4 py-1.5">{pendingEmail}</Badge>
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="text-xs font-bold">Abra seu email</p>
                  <p className="text-[10px] text-muted-foreground">Verifique a caixa de entrada e spam</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="text-xs font-bold">Clique no link "Confirm your mail"</p>
                  <p className="text-[10px] text-muted-foreground">O link vai te redirecionar de volta para o jogo</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-success">3</span>
                </div>
                <div>
                  <p className="text-xs font-bold">Pronto! 🎮</p>
                  <p className="text-[10px] text-muted-foreground">Sua conta será ativada automaticamente</p>
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              {resendTimer > 0 ? (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" /> Reenviar em <strong className="text-primary">{resendTimer}s</strong>
                </p>
              ) : (
                <Button variant="outline" size="sm" onClick={handleResendVerification} disabled={loading} className="text-xs gap-1">
                  <RefreshCw className="w-3 h-3" /> Reenviar email de verificação
                </Button>
              )}
            </div>

            <Button variant="ghost" size="sm" onClick={() => setStep('welcome')} className="w-full text-xs text-muted-foreground gap-1">
              <ArrowLeft className="w-3 h-3" /> Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── SIGNUP PREFERENCES STEP ──
  if (step === 'signup-preferences') {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <img src={slides[2].img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
        <Card className="w-full max-w-md border-border/30 bg-card/95 backdrop-blur-xl shadow-2xl relative z-10">
          <CardContent className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <Gamepad2 className="w-10 h-10 text-primary mx-auto" />
              <h2 className="text-xl font-black">Seu Perfil de Manager</h2>
              <p className="text-xs text-muted-foreground">Configure suas preferências iniciais</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">🌍 País da Liga</label>
              <div className="grid grid-cols-5 gap-1.5">
                {countryOptions.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFavoriteCountry(c.value)}
                    className={`p-2 rounded-lg border text-center transition-all text-lg ${
                      favoriteCountry === c.value
                        ? 'bg-primary/15 border-primary shadow-sm ring-1 ring-primary/30'
                        : 'bg-card/50 border-border/30 hover:border-primary/30'
                    }`}
                    title={c.label}
                  >
                    {c.flag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">📋 Formação Preferida</label>
              <div className="grid grid-cols-4 gap-1.5">
                {formationOptions.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setPreferredFormation(f)}
                    className={`py-2 px-1 rounded-lg text-xs font-black border transition-all ${
                      preferredFormation === f
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-card/50 border-border/30 text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">🎮 Estilo de Jogo</label>
              <div className="grid grid-cols-2 gap-2">
                {playstyleOptions.map(ps => (
                  <button
                    key={ps.value}
                    type="button"
                    onClick={() => setPlaystyle(ps.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      playstyle === ps.value
                        ? 'bg-primary/10 border-primary shadow-sm ring-1 ring-primary/30'
                        : 'bg-card/50 border-border/30 hover:border-primary/30'
                    }`}
                  >
                    <span className="text-sm font-bold block">{ps.label}</span>
                    <span className="text-[10px] text-muted-foreground">{ps.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleSignup} disabled={loading} className="w-full h-12 font-bold gap-2">
              <ChevronRight className="w-4 h-4" />
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setStep('signup-info')} className="w-full text-xs text-muted-foreground gap-1">
              <ArrowLeft className="w-3 h-3" /> Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── SIGNUP INFO STEP ──
  if (step === 'signup-info') {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <img src={slides[1].img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        <Card className="w-full max-w-md border-border/30 bg-card/95 backdrop-blur-xl shadow-2xl relative z-10">
          <CardContent className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <UserPlus className="w-10 h-10 text-primary mx-auto" />
              <h2 className="text-xl font-black">Criar Conta</h2>
              <p className="text-xs text-muted-foreground">Preencha seus dados para começar</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Nome do Manager</label>
                <Input placeholder="Ex: Sir Alex" value={displayName} onChange={e => setDisplayName(e.target.value)} className="h-12 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Email</label>
                <Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Senha</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 text-sm pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                if (!email) { toast.error('Preencha o email'); return; }
                if (password.length < 6) { toast.error('Senha deve ter no mínimo 6 caracteres'); return; }
                setStep('signup-preferences');
              }}
              className="w-full h-12 font-bold gap-2"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setStep('welcome')} className="w-full text-xs text-muted-foreground gap-1">
              <ArrowLeft className="w-3 h-3" /> Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── LOGIN STEP ──
  if (step === 'login') {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <img src={slides[1].img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />
        <Card className="w-full max-w-md border-border/30 bg-card/95 backdrop-blur-xl shadow-2xl relative z-10">
          <CardContent className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <LogIn className="w-10 h-10 text-primary mx-auto" />
              <h2 className="text-xl font-black">Entrar</h2>
              <p className="text-xs text-muted-foreground">Acesse sua conta e volte ao campo</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Email</label>
                <Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Senha</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Sua senha"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="h-12 text-sm pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-12 font-bold gap-2" disabled={loading}>
                {loading ? 'Entrando...' : '🎮 Entrar'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/30" /></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
            </div>

            <Button onClick={handleGoogleLogin} disabled={loading} className="w-full h-11 gap-3 text-sm font-semibold" variant="outline">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Entrar com Google
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setStep('welcome')} className="w-full text-xs text-muted-foreground gap-1">
              <ArrowLeft className="w-3 h-3" /> Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── WELCOME STEP — Split screen with carousel ──
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Carousel — header on mobile, side panel on desktop */}
      <CarouselPanel className="h-56 sm:h-72 lg:h-auto lg:flex-1 lg:sticky lg:top-0" />

      {/* Content panel */}
      <div className="flex-1 lg:max-w-lg flex flex-col items-center justify-center p-6 sm:p-8 bg-background relative z-10">
        {/* Logo & Title */}
        <div className="text-center space-y-3 mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter">FLM 26</h1>
          <p className="text-sm text-muted-foreground">Football Life Manager 2026</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Gerencie seu clube, escale seu time, dispute campeonatos online e conquiste títulos.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="w-full max-w-sm space-y-3 mb-8">
          <Button onClick={() => setStep('login')} className="w-full h-14 text-base font-black gap-2 shadow-lg">
            <LogIn className="w-5 h-5" /> Entrar
          </Button>
          <Button onClick={() => setStep('signup-info')} variant="outline" className="w-full h-14 text-base font-black gap-2">
            <UserPlus className="w-5 h-5" /> Criar Conta
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/30" /></div>
            <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-background px-3 text-muted-foreground">ou</span></div>
          </div>

          <Button onClick={handleGoogleLogin} disabled={loading} variant="ghost" className="w-full h-12 gap-3 text-sm font-semibold border border-border/30">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Entrar com Google
          </Button>
        </div>

        {/* Features Grid */}
        <div className="w-full max-w-sm">
          <p className="text-[10px] font-bold text-center text-primary uppercase tracking-[0.2em] mb-3">✨ Funcionalidades</p>
          <div className="grid grid-cols-2 gap-2">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl border border-border/20 bg-card/50 hover:border-primary/20 transition-colors">
                <f.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold truncate">{f.title}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-center text-muted-foreground/50 mt-4">FLM 26 © 2026</p>
        </div>
      </div>
    </div>
  );
}
