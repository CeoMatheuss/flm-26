import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import flmLogo from '@/assets/flm26-logo.png';
import stadiumBg from '@/assets/stadium-management-hero.jpg';
import { Shield, Trophy, Users, Zap, Search, Target, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PremiumLoadingScreenProps {
  message?: string;
  subMessage?: string;
  progress?: number;
  onRetry?: () => void;
  showRetryAfter?: number;
}

const TIPS = [
  { icon: Zap, text: 'Jogadores jovens evoluem mais rápido e podem se tornar superestrelas.' },
  { icon: Trophy, text: 'Treinos intensivos aumentam o ganho de atributos, mas elevam o risco de lesão.' },
  { icon: Search, text: 'Scouts de alto nível encontram promessas melhores e mais baratas.' },
  { icon: Users, text: 'Moral alta melhora significativamente o desempenho do time em campo.' },
  { icon: Target, text: 'Rotação de elenco evita desgaste físico excessivo em semanas de jogos duplos.' },
  { icon: TrendingUp, text: 'Melhorar o estádio aumenta a renda de bilheteria a longo prazo.' },
  { icon: Shield, text: 'Ajuste sua tática com base nos pontos fracos do adversário.' },
  { icon: Search, text: 'Olheiros especializados em jovens trazem as melhores joias da base.' },
];

export function PremiumLoadingScreen({ 
  message = 'Carregando temporada', 
  subMessage, 
  progress: manualProgress,
  onRetry,
  showRetryAfter = 15
}: PremiumLoadingScreenProps) {
  const [autoProgress, setAutoProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [showRetry, setShowRetry] = useState(false);

  // Use manual progress if provided, otherwise auto-increment
  const currentProgress = manualProgress !== undefined ? manualProgress : autoProgress;

  // Auto-progress simulation
  useEffect(() => {
    if (manualProgress !== undefined) return;
    
    const interval = setInterval(() => {
      setAutoProgress(prev => {
        if (prev >= 99) return 99;
        const remaining = 100 - prev;
        const increment = prev < 30 ? 1.5 : (prev < 70 ? 0.5 : remaining * 0.05);
        return Math.min(prev + increment, 99);
      });
    }, 150);
    return () => clearInterval(interval);
  }, [manualProgress]);

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TIPS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Timer for retry
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

  const activeTip = TIPS[tipIndex];

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center overflow-hidden font-sans select-none">
      
      {/* 1. BACKGROUND LAYER - Stadium with cinematic zoom */}
      <motion.div 
        initial={{ scale: 1.15, opacity: 0 }}
        animate={{ 
          scale: [1.15, 1.05],
          opacity: 0.4,
          x: [-10, 10, -10],
          y: [-5, 5, -5]
        }}
        transition={{ 
          scale: { duration: 5, ease: "easeOut" },
          opacity: { duration: 2 },
          x: { duration: 20, repeat: Infinity, ease: "linear" },
          y: { duration: 15, repeat: Infinity, ease: "linear" }
        }}
        className="absolute inset-0 z-0"
      >
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat grayscale-[0.3] contrast-[1.2]"
          style={{ backgroundImage: `url(${stadiumBg})` }}
        />
        {/* Cinematic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/80 via-transparent to-[#020617]/80" />
      </motion.div>

      {/* 2. ATMOSPHERIC EFFECTS - Particles & Light Beams */}
      <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
        {/* Floating Particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%", 
              opacity: 0 
            }}
            animate={{ 
              y: ["-10%", "110%"],
              opacity: [0, 0.4, 0],
              x: (Math.random() * 10 - 5) + "%"
            }}
            transition={{ 
              duration: 10 + Math.random() * 20, 
              repeat: Infinity, 
              ease: "linear",
              delay: Math.random() * 10
            }}
            className="absolute w-1 h-1 bg-blue-400 rounded-full blur-[1px]"
          />
        ))}
        
        {/* Neon Light Beams (Top corners) */}
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[150px] animate-pulse" />
      </div>

      {/* 3. CENTRAL LOGO AREA */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-2xl px-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative group mb-16"
        >
          {/* Logo Glow */}
          <div className="absolute inset-[-40px] bg-primary/20 rounded-full blur-[60px] animate-pulse opacity-60" />
          
          {/* Main Logo */}
          <motion.div
            animate={{ 
              y: [0, -8, 0],
              filter: ["drop-shadow(0 0 10px rgba(59,130,246,0.3))", "drop-shadow(0 0 30px rgba(59,130,246,0.6))", "drop-shadow(0 0 10px rgba(59,130,246,0.3))"]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <img 
              src={flmLogo} 
              alt="FLM 26" 
              className="w-32 h-32 md:w-48 md:h-48 object-contain"
            />
          </motion.div>
        </motion.div>

        {/* 4. LOADING PROGRESS SECTION */}
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={message}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                <h3 className="text-lg md:text-xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-blue-300">
                    {message}
                  </span>
                  <span className="text-primary font-mono tabular-nums min-w-[3.5rem]">
                    {Math.round(currentProgress)}%
                  </span>
                </h3>
                {subMessage && (
                  <p className="text-[10px] md:text-xs text-blue-200/50 font-bold tracking-[0.2em] uppercase mt-1">
                    {subMessage}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Premium Progress Bar */}
          <div className="relative group">
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 backdrop-blur-md p-[1px]">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-600 via-primary to-emerald-400 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                initial={{ width: 0 }}
                animate={{ width: `${currentProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {/* Progress indicator glow */}
            <motion.div 
              className="absolute top-[-10px] w-20 h-[30px] bg-primary/20 blur-xl pointer-events-none"
              animate={{ left: `calc(${currentProgress}% - 40px)` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* 5. RETRY SYSTEM */}
        <AnimatePresence>
          {showRetry && onRetry && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mt-8 flex flex-col items-center gap-4 w-full"
            >
              <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl backdrop-blur-md">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  Servidor demorando para responder...
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => {
                  setTimer(0);
                  setShowRetry(false);
                  onRetry();
                }}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-full px-8 h-12 font-black uppercase tracking-tighter transition-all active:scale-95 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar agora
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 6. BOTTOM TIPS BAR - EA FC / FM Style */}
      <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 z-10 flex flex-col items-center">
        <div className="w-full max-w-4xl border-t border-white/5 pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={tipIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-6"
            >
              <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner">
                {activeTip && <activeTip.icon className="w-6 h-6 md:w-8 md:h-8 text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
              </div>
              <div className="flex-1">
                <p className="text-[10px] md:text-xs font-black text-primary uppercase tracking-[0.3em] mb-1">
                  Dica de Treinador
                </p>
                <p className="text-sm md:text-lg text-white/80 font-medium leading-relaxed">
                  "{activeTip.text}"
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-4 right-8 opacity-20 hidden md:block">
        <p className="text-[10px] font-black tracking-[0.5em] text-white uppercase italic">
          FLM 26 PREMUM EXPERIENCE
        </p>
      </div>
    </div>
  );
}
