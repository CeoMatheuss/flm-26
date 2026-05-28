import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Trophy, Users, Target, Swords, TrendingUp, Shield, Globe, GraduationCap,
  Mail, ArrowLeft, CheckCircle2, Clock, RefreshCw,
  ChevronRight, Eye, EyeOff, UserPlus, LogIn, ShieldCheck, Loader2, Activity
} from 'lucide-react';
import { DiagnosticOverlay } from '@/components/auth/DiagnosticOverlay';
import { BetaAccessRequestForm } from '@/components/auth/BetaAccessRequestForm';
import gamePreview1 from '@/assets/game-preview.jpg';
import gamePreview2 from '@/assets/game-preview-2.jpg';
import gamePreview3 from '@/assets/game-preview-3.jpg';
import flmLogo from '@/assets/flm26-logo.png';
import { Link } from 'react-router-dom';

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

type AuthStep = 'welcome' | 'login' | 'signup-info' | 'beta-request';

interface AuthPageProps {
  initialStep?: AuthStep;
  initialEmail?: string;
}

export default function AuthPage({ initialStep = 'welcome', initialEmail = '' }: AuthPageProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(initialEmail);

  const [step, setStep] = useState<AuthStep>(initialStep);
  const [slideIndex, setSlideIndex] = useState(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Auto-rotate carousel
  useEffect(() => {
    const timer = setInterval(() => setSlideIndex(i => (i + 1) % slides.length), 4000);
    
    // Log de montagem para debug
    console.log('[Auth] Página de Autenticação montada', { step, initialEmail });

    return () => {
      clearInterval(timer);
      console.log('[Auth] Página de Autenticação desmontada');
    };
  }, [step, initialEmail]);


  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    console.log('[Auth] Login Google iniciado', { timestamp: new Date().toISOString() });
    
    // Timeout de segurança para o botão
    const oauthTimeout = setTimeout(() => {
      setLoading(false);
      console.warn('[Auth] OAuth demorando muito, resetando loading state.');
    }, 10000);

    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin
      }) as any;
      
      if (error) {
        console.error('[Auth] Erro no Google Login:', error);
        toast.error('Erro ao entrar com Google. Tente novamente.');
        setLoading(false);
      }
      // O OAuth redireciona a página, então não chamamos setLoading(false) em caso de sucesso aqui
    } catch (err) {
      console.error('[Auth] Erro inesperado no Google Login:', err);
      toast.error('Erro ao conectar com Google.');
      setLoading(false);
    } finally {
      clearTimeout(oauthTimeout);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    const startTime = performance.now();
    console.log('[Auth] 🚀 Iniciando tentativa de login...', { email, timestamp: new Date().toISOString() });
    
    // Proteção ultra-agressiva contra travamento do botão (reset forçado após 15s)
    const buttonSafetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('[Auth] ⚠️ LOGIN TRAVADO NO BOTÃO! Forçando reset.');
        setLoading(false);
        toast.error('O servidor de autenticação está demorando muito. Tente novamente.');
      }
    }, 15000);

    try {
      // Timeout de 12 segundos para a requisição
      const loginPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT_ERROR')), 12000)
      );

      const result = await Promise.race([loginPromise, timeoutPromise]) as any;
      const duration = (performance.now() - startTime).toFixed(2);
      
      if (result.error) {
        console.error(`[Auth] ❌ Falha no login (${duration}ms):`, result.error);
        
        let message = 'Falha ao entrar. Verifique seus dados.';
        const errorMsg = result.error.message || '';
        
        if (result.error.status === 400) {
          if (errorMsg.includes('Invalid login credentials')) {
            message = 'Email ou senha incorretos.';
          } else if (errorMsg.includes('Email not confirmed')) {
            message = 'Confirme seu email para entrar.';
          }
        } else if (result.error.status === 429) {
          message = 'Muitas tentativas. Aguarde um momento.';
        } else if (errorMsg.includes('Database error') || [500, 502, 503, 504].includes(result.error.status)) {
          message = 'Servidor sobrecarregado. Tente novamente em alguns segundos.';
        }
        
        toast.error(message);
        setLoading(false);
      } else if (result.data?.session) {
        console.log(`[Auth] ✅ Autenticação Supabase OK (${duration}ms)`);
        toast.success('Login aceito! Entrando...');
        
        // Persistir sucesso para ajudar o carregamento inicial
        localStorage.setItem('flm:last-login-success', Date.now().toString());

        // Redirecionamento direto usando a sessão já obtida
        console.log('[Auth] Sessão confirmada. Redirecionando...');
        window.location.href = '/';
      } else {
        // Caso bizarro onde não há erro mas não há sessão
        console.warn('[Auth] Login sem sessão. Tentando recuperar...');
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          window.location.href = '/';
        } else {
          throw new Error('SESSION_NOT_FOUND');
        }
      }
    } catch (err: any) {
      const duration = (performance.now() - startTime).toFixed(2);
      setLoading(false);
      
      if (err.message === 'TIMEOUT_ERROR') {
        console.error(`[Auth] ⏳ Timeout no servidor (${duration}ms)`);
        toast.error('O servidor não respondeu a tempo. Tente novamente.');
      } else {
        console.error(`[Auth] 💥 Erro (${duration}ms):`, err);
        toast.error('Erro de conexão. Verifique sua internet.');
      }
    } finally {
      clearTimeout(buttonSafetyTimeout);
    }
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
    const startTime = performance.now();
    console.log('[Auth] 📝 Cadastro iniciado', { email, displayName, timestamp: new Date().toISOString() });
    
    // Proteção contra travamento
    const signupSafetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('[Auth] ⚠️ Cadastro travado! Resetando estado.');
        setLoading(false);
        toast.error('O cadastro está demorando muito. Tente novamente.');
      }
    }, 20000);

    try {
      // Timeout de 15 segundos para cadastro (pode demorar mais que login)
      const signupPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: displayName.trim() || 'Manager',
          },
        },
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT_ERROR')), 30000)
      );

      const result = await Promise.race([signupPromise, timeoutPromise]) as any;
      const duration = (performance.now() - startTime).toFixed(2);

      if (result.error) {
        console.error(`[Auth] ❌ Falha no cadastro (${duration}ms):`, result.error);
        const msg = result.error.message || '';
        const isBetaBlock = /BETA_NOT_WHITELISTED|whitelist|não autorizado|Database error saving new user|unexpected_failure/i.test(msg);
        const isDuplicate = /already registered|already exists|duplicate|User already/i.test(msg);
        
        if (isDuplicate) {
          toast.error('Este email já está cadastrado. Tente fazer login.');
          setStep('login');
        } else if (isBetaBlock) {
          toast.error('Email não autorizado no BETA. Solicite acesso primeiro.');
          setStep('beta-request');
        } else {
          toast.error(msg || 'Erro ao criar conta. Tente novamente.');
        }
        setLoading(false);
      } else {
        console.log(`[Auth] ✅ Cadastro bem-sucedido (${duration}ms)`, { userId: result.data.user?.id });
        toast.success('Conta criada! Entrando...');
        
        // Pequeno delay para garantir persistência e tentar reload
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            window.location.reload();
          } else {
            setStep('login');
            setEmail(email);
            setLoading(false);
          }
        }, 1500);
      }
    } catch (err: any) {
      const duration = (performance.now() - startTime).toFixed(2);
      if (err.message === 'TIMEOUT_ERROR') {
        console.error(`[Auth] ⏳ Timeout no cadastro (${duration}ms)`);
        toast.error('O servidor demorou muito para criar sua conta. Tente novamente.');
      } else {
        console.error(`[Auth] 💥 Erro inesperado no cadastro (${duration}ms):`, err);
        toast.error('Erro inesperado ao criar conta. Tente novamente.');
      }
      setLoading(false);
    } finally {
      clearTimeout(signupSafetyTimeout);
    }
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

              <div className={`rounded-xl border px-4 py-3.5 transition-all ${
                acceptedTerms && acceptedPrivacy
                  ? 'border-primary/50 bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]'
                  : 'border-border/60 bg-muted/30'
              }`}>
                <label
                  htmlFor="terms"
                  className="group flex items-center gap-3 cursor-pointer select-none"
                >
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms && acceptedPrivacy}
                    onCheckedChange={(checked) => {
                      setAcceptedTerms(checked === true);
                      setAcceptedPrivacy(checked === true);
                    }}
                    className="shrink-0 h-4 w-4 rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className="text-xs text-foreground/80 leading-snug">
                    Aceito os{" "}
                    <Link
                      to="/terms"
                      className="font-semibold text-primary underline-offset-2 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Termos de Uso
                    </Link>
                    {" "}e a{" "}
                    <Link
                      to="/privacy"
                      className="font-semibold text-primary underline-offset-2 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Política de Privacidade
                    </Link>
                  </span>
                </label>
              </div>
            </div>

            <Button
              onClick={handleSignup}
              disabled={loading || !displayName.trim() || !email || password.length < 6 || password !== confirmPassword || !acceptedTerms || !acceptedPrivacy}
              className="w-full h-12 font-bold gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Criando conta...</span>
                </>
              ) : (
                <>
                  <span>Criar Conta</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
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
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <span>🎮 Entrar</span>
                )}
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
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto flex items-center justify-center">
            <img src={flmLogo} alt="FLM Logo" className="w-full h-full object-contain drop-shadow-md" />
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
          {/* Link para diagnóstico técnico em caso de falha */}
          <div className="mt-8 pt-6 border-t border-border/10 flex justify-center">
            <button 
              onClick={() => setShowDiagnostics(true)}
              className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/40 hover:text-primary transition-colors uppercase tracking-widest"
            >
              <Activity className="w-3 h-3" />
              Diagnóstico do Sistema
            </button>
          </div>
        </div>
        
        {showDiagnostics && <DiagnosticOverlay onClose={() => setShowDiagnostics(false)} />}
      </div>
    </div>
  );
}
