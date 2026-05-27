import { useState, useEffect } from 'react';
import flmLogo from '@/assets/flm26-logo.png';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface GameLoadingScreenProps {
  message?: string;
  subMessage?: string;
  showProgress?: boolean;
  onRetry?: () => void;
  showRetryAfter?: number; // segundos
}

const TIPS = [
  'Dica: Treine seus jogadores regularmente para melhorar seus atributos.',
  'Dica: Invista na base — jovens talentos podem valer milhões!',
  'Dica: Use táticas que combinem com o estilo dos seus jogadores.',
  'Dica: Fique de olho no cansaço — rotacione o elenco em semanas pesadas.',
  'Dica: Contrate olheiros para encontrar joias escondidas no mercado.',
  'Dica: Melhore seu estádio para atrair mais torcedores e patrocinadores.',
  'Dica: A moral do time afeta diretamente o desempenho em campo.',
  'Dica: Jogadores com alto ritmo de trabalho pressionam melhor o adversário.',
];

export function GameLoadingScreen({ 
  message = 'Carregando...', 
  subMessage, 
  showProgress = true,
  onRetry,
  showRetryAfter = 12
}: GameLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const [dots, setDots] = useState('');
  const [timer, setTimer] = useState(0);
  const [showRetry, setShowRetry] = useState(false);

  // Asymptotic progress — never visually stuck, approaches 99% smoothly
  useEffect(() => {
    if (!showProgress) return;
    const interval = setInterval(() => {
      setProgress(prev => {
        const remaining = 99 - prev;
        if (remaining <= 0.1) return 99;
        return prev + Math.max(0.5, remaining * 0.08);
      });
    }, 80);
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logo with pulse animation */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
        <img
          src={flmLogo}
          alt="FLM 26"
          className="w-24 h-24 sm:w-32 sm:h-32 object-contain relative z-10 drop-shadow-lg"
        />
      </div>

      {/* Title */}
      <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2 tracking-wide">
        FLM 26
      </h2>

      {/* Message */}
      <div className="flex flex-col items-center gap-1 mb-6">
        <p className="text-sm text-muted-foreground">
          {message}{dots}
        </p>
        {subMessage && (
          <p className="text-[11px] text-muted-foreground/60">{subMessage}</p>
        )}
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="w-64 sm:w-80 mb-8">
          <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 px-0.5">
            <span className="text-[9px] text-muted-foreground/40 font-mono">
              ESTADO: {Math.round(timer)}s
            </span>
            <span className="text-[10px] text-muted-foreground/60 font-mono">
              {Math.round(clampedProgress)}%
            </span>
          </div>
        </div>
      )}

      {/* Retry Button - Appears if taking too long */}
      {showRetry && onRetry && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center gap-4 mb-8">
          <div className="flex items-center gap-2 text-amber-500/80 bg-amber-500/5 px-4 py-2 rounded-full border border-amber-500/10">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">O servidor está demorando para responder...</span>
          </div>
          <Button 
            onClick={() => {
              setTimer(0);
              setShowRetry(false);
              onRetry();
            }}
            variant="outline"
            size="sm"
            className="gap-2 border-primary/20 hover:bg-primary/5 px-6"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </Button>
        </div>
      )}

      {/* Tip */}
      <div className="max-w-xs text-center">
        <p className="text-[11px] text-muted-foreground/50 italic leading-relaxed">
          💡 {tip}
        </p>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-6 flex flex-col items-center gap-1 opacity-40">
        <div className="text-[10px] font-black tracking-widest text-foreground/40">FLM 2026</div>
        <div className="w-4 h-[1px] bg-foreground/20" />
      </div>
    </div>
  );
}
