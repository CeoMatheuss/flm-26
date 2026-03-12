import { useState, useEffect } from 'react';
import flmLogo from '@/assets/flm26-logo.png';

interface GameLoadingScreenProps {
  message?: string;
  subMessage?: string;
  showProgress?: boolean;
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

export function GameLoadingScreen({ message = 'Carregando...', subMessage, showProgress = true }: GameLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const [dots, setDots] = useState('');

  // Animated progress
  useEffect(() => {
    if (!showProgress) return;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev + 0.2;
        if (prev >= 70) return prev + 0.5;
        if (prev >= 40) return prev + 1;
        return prev + 2;
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

  const clampedProgress = Math.min(progress, 95);

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
      <p className="text-sm text-muted-foreground mb-6">
        {message}{dots}
      </p>

      {/* Progress bar */}
      {showProgress && (
        <div className="w-64 sm:w-80 mb-6">
          <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/60 text-center mt-1.5 font-mono">
            {Math.round(clampedProgress)}%
          </p>
        </div>
      )}

      {/* Sub-message */}
      {subMessage && (
        <p className="text-xs text-muted-foreground/70 mb-4">{subMessage}</p>
      )}

      {/* Tip */}
      <div className="max-w-xs text-center">
        <p className="text-[11px] text-muted-foreground/50 italic leading-relaxed">
          💡 {tip}
        </p>
      </div>

      {/* Animated football */}
      <div className="mt-8 text-2xl animate-bounce">
        ⚽
      </div>
    </div>
  );
}
