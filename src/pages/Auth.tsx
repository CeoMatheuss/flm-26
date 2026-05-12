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
  ChevronRight, Eye, EyeOff, UserPlus, LogIn, ShieldCheck
} from 'lucide-react';
import { BetaAccessRequestForm } from '@/components/auth/BetaAccessRequestForm';
import gamePreview1 from '@/assets/game-preview.jpg';
import gamePreview2 from '@/assets/game-preview-2.jpg';
import gamePreview3 from '@/assets/game-preview-3.jpg';

const RESEND_COOLDOWN = 60;

const slides = [
  { img: gamePreview1, title: 'Gerencie seu Clube', desc: 'Escale, treine e leve seu time ao topo' },
  { img: gamePreview2, title: 'Disputas Online', desc: 'Campeonatos multiplayer competitivos' },
  { img: gamePreview3, title: 'Conquiste Títulos', desc: 'Infraestrutura, base e mercado dinâmico' },
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

type AuthStep = 'welcome' | 'login' | 'signup-info' | 'verify-email' | 'beta-request';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

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
      const msg = error.message || '';
      const isBetaBlock = /BETA_NOT_WHITELISTED|whitelist|não autorizado|Database error saving new user|unexpected_failure/i.test(msg);
      const isDuplicate = /already registered|already exists|duplicate|User already/i.test(msg);
      if (isDuplicate) {
        toast.error('Este email já está cadastrado. Tente fazer login.');
      } else if (isBetaBlock) {
        toast.error('Email não autorizado no BETA. Solicite acesso primeiro.');
        setStep('beta-request');
      } else {
        toast.error(msg || 'Erro ao criar conta. Tente novamente.');
      }
    } else {
      setPendingEmail(email);
      // Dispara o envio do código via Edge Function
      await supabase.functions.invoke('auth-service', {
        body: { action: 'send-code', email }
      });
      setStep('verify-email');
      startResendTimer();
      toast.success('Código de verificação enviado para seu email!');
    }
    setLoading(false);
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error('O código deve ter 6 dígitos');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-service', {
        body: { action: 'verify-code', email: pendingEmail, code: verificationCode }
      });

      if (error || data?.error) throw new Error(error?.message || data?.error);

      toast.success('Conta verificada com sucesso! Você já pode entrar.');
      setStep('login');
      setEmail(pendingEmail);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao verificar código');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    const { error } = await supabase.functions.invoke('auth-service', {
      body: { action: 'send-code', email: pendingEmail }
    });
    if (error) toast.error('Erro ao reenviar código.');
    else {
      toast.success('Novo código enviado!');
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
        <Card className="w-full max-w-md border-border/30 bg-card/95 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden">
          {/* Neon Top Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-primary animate-pulse" />
          
          <CardContent className="p-6 space-y-6">
            <div className="text-center space-y-3">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center relative transform rotate-3">
                <ShieldCheck className="w-10 h-10 text-primary" />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-success/20 flex items-center justify-center border-2 border-card">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                </div>
              </div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Validar Manager</h2>
              <p className="text-sm text-muted-foreground">Enviamos um código de 6 dígitos para:</p>
              <Badge variant="secondary" className="text-xs font-bold px-4 py-1.5 bg-primary/5 border-primary/20 text-primary">{pendingEmail}</Badge>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Código de Verificação</label>
                <div className="relative">
                  <Input 
                    placeholder="000000" 
                    value={verificationCode} 
                    onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-16 text-3xl font-black text-center tracking-[0.5em] bg-white/5 border-white/10 rounded-xl focus:border-primary/50 focus:ring-primary/20"
                  />
                  <div className="absolute -inset-1 bg-primary/5 blur-sm -z-10 rounded-xl" />
                </div>
              </div>

              <Button 
                onClick={handleVerifyCode} 
                disabled={loading || verificationCode.length !== 6}
                className="w-full h-14 text-sm font-black uppercase italic tracking-wider gap-3 rounded-xl shadow-[0_0_20px_rgba(0,242,255,0.2)]"
              >
                {loading ? 'Validando...' : 'Confirmar Acesso'} <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Problemas?</span>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
              </div>

              <div className="flex flex-col gap-2">
                {resendTimer > 0 ? (
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 font-bold">
                    <Clock className="w-3.5 h-3.5" /> Reenviar código em <strong className="text-primary">{resendTimer}s</strong>
                  </p>
                ) : (
                  <Button variant="ghost" size="sm" onClick={handleResendVerification} disabled={loading} className="text-xs font-bold gap-2 hover:bg-white/5">
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Reenviar código de verificação
                  </Button>
                )}
                
                <Button variant="ghost" size="sm" onClick={() => setStep('welcome')} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-foreground">
                  <ArrowLeft className="w-3 h-3 mr-2" /> Alterar Email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // (signup-preferences step removed — preferences are no longer collected at signup)

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
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Confirmar Senha</label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12 text-sm"
                />
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="text-[10px] text-destructive">As senhas não coincidem</p>
                )}
              </div>
            </div>

            <Button
              onClick={handleSignup}
              disabled={loading || !displayName.trim() || !email || password.length < 6 || password !== confirmPassword}
              className="w-full h-12 font-bold gap-2"
            >
              {loading ? 'Criando conta...' : 'Criar Conta'} <ChevronRight className="w-4 h-4" />
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

  // ── BETA ACCESS REQUEST STEP ──
  if (step === 'beta-request') {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <img src={slides[2].img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        <div className="relative z-10 w-full flex justify-center">
          <BetaAccessRequestForm onBack={() => setStep('welcome')} />
        </div>
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

          <button
            onClick={() => setStep('beta-request')}
            className="w-full text-[11px] text-primary hover:underline mt-1 flex items-center justify-center gap-1"
          >
            <ShieldCheck className="w-3 h-3" /> Solicitar acesso ao BETA
          </button>
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
