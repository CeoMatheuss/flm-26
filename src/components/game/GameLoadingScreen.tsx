import { useState, useEffect } from 'react';
import flmLogo from '@/assets/flm26-logo.png';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Shield, Trophy, Users, Zap } from 'lucide-react';

interface GameLoadingScreenProps {
  message?: string;
  subMessage?: string;
  showProgress?: boolean;
  onRetry?: () => void;
  showRetryAfter?: number; // segundos
}

const TIPS = [
  { icon: Zap, text: 'Dica: Treine seus jogadores regularmente para melhorar seus atributos.' },
  { icon: Trophy, text: 'Dica: Invista na base — jovens talentos podem valer milhões!' },
  { icon: Shield, text: 'Dica: Use táticas que combinem com o estilo dos seus jogadores.' },
  { icon: Users, text: 'Dica: Fique de olho no cansaço — rotacione o elenco em semanas pesadas.' },
  { icon: Zap, text: 'Dica: Contrate olheiros para encontrar joias escondidas no mercado.' },
  { icon: Trophy, text: 'Dica: Melhore seu estádio para atrair mais torcedores e patrocinadores.' },
  { icon: Users, text: 'Dica: A moral do time afeta diretamente o desempenho em campo.' },
  { icon: Zap, text: 'Dica: Jogadores com alto ritmo de trabalho pressionam melhor o adversário.' },
];

export function GameLoadingScreen({ 
  message = 'Carregando...', 
  subMessage, 
  showProgress = true,
  onRetry,
  showRetryAfter = 12
}: GameLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [dots, setDots] = useState('');
  const [timer, setTimer] = useState(0);
  const [showRetry, setShowRetry] = useState(false);

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Asymptotic progress — never visually stuck, approaches 99% smoothly
  useEffect(() => {
    if (!showProgress) return;
    const interval = setInterval(() => {
      setProgress(prev => {
        const remaining = 99 - prev;
        if (remaining <= 0.1) return 99;
        // Faster at start, slower as it reaches the end
        const step = prev < 30 ? 1.5 : (prev < 70 ? 0.4 : remaining * 0.05);
        return prev + step;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [showProgress]);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Timer for retry button
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timer >= showRetryAfter) {
      setShowRetry(true);
    }
  }, [timer, showRetryAfter]);

  const clampedProgress = Math.min(progress, 99);
  const ActiveTip = TIPS[tipIndex];

  return (
    <div className="min-h-screen bg-[#0c0f1a] relative flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      
      {/* Mesh Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} 
      />

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
        {/* Logo Section */}
        <div className="relative mb-12 group">
          <div className="absolute inset-[-20px] bg-primary/20 rounded-full blur-3xl animate-pulse group-hover:bg-primary/30 transition-all duration-700" />
          <div className="relative bg-gradient-to-b from-white/10 to-transparent p-6 rounded-[2.5rem] border border-white/10 backdrop-blur-sm shadow-2xl">
            <img
              src={flmLogo}
              alt="FLM 26"
              className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
            />
          </div>
          
          {/* Animated rings */}
          <div className="absolute inset-0 border border-primary/20 rounded-full scale-[1.2] animate-[ping_3s_ease-in-out_infinite] opacity-20" />
        </div>

        {/* Text Section */}
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase italic">
            Football Life <span className="text-primary">Manager 26</span>
          </h2>
          
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm sm:text-base font-medium text-blue-200/80 flex items-center justify-center min-w-[200px]">
              {message}<span className="inline-block w-6 text-left">{dots}</span>
            </p>
            {subMessage && (
              <p className="text-xs text-muted-foreground/60 font-medium tracking-wide uppercase">{subMessage}</p>
            )}
          </div>
        </div>

        {/* Loading Progress */}
        {showProgress && (
          <div className="w-full max-w-sm mb-12">
            <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 backdrop-blur-md p-[2px]">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-primary to-blue-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
            <div className="flex justify-between mt-3 px-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] text-muted-foreground/40 font-bold tracking-widest uppercase">
                  Server Status: OK
                </span>
              </div>
              <span className="text-xs text-primary font-black font-mono">
                {Math.round(clampedProgress)}%
              </span>
            </div>
          </div>
        )}

        {/* Retry/Error Section */}
        {showRetry && onRetry && (
          <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center gap-4 mb-10 w-full">
            <div className="flex items-center gap-3 text-amber-400 bg-amber-500/10 px-5 py-3 rounded-2xl border border-amber-500/20 backdrop-blur-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold leading-none mb-1">LATÊNCIA DETECTADA</p>
                <p className="text-[10px] text-amber-400/70 font-medium">O banco de dados está processando muitas requisições.</p>
              </div>
            </div>
            <Button 
              onClick={() => {
                setTimer(0);
                setShowRetry(false);
                onRetry();
              }}
              className="h-12 w-full max-w-[240px] gap-3 bg-white text-black hover:bg-white/90 font-black uppercase tracking-tighter rounded-xl transition-transform active:scale-95 shadow-xl"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Agora
            </Button>
          </div>
        )}

        {/* Tips Section */}
        <div className="w-full max-w-sm">
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <div className="flex gap-4 items-start">
              <div className="bg-primary/20 p-2 rounded-lg">
                <ActiveTip.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-blue-100/70 font-medium leading-relaxed italic animate-in fade-in slide-in-from-right-2 duration-700">
                "{ActiveTip.text}"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Version Info */}
      <div className="absolute bottom-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-4 opacity-30">
          <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-white" />
          <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white">EST. 2026</span>
          <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-white" />
        </div>
        <div className="text-[9px] font-medium text-white/20 tracking-widest uppercase">
          Football Life Manager • Versão Estável
        </div>
      </div>
    </div>
  );
}
