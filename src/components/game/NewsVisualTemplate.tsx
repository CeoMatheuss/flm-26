import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ClubShield } from './ClubShield';
import { Trophy, Star, TrendingUp, TrendingDown, Target, Zap, Activity } from 'lucide-react';
import leagueBg from '@/assets/news-league-champion.jpg';
import cupBg from '@/assets/news-cup-champion.jpg';
import ballonDorBg from '@/assets/news-ballon-dor.jpg';
import transferBg from '@/assets/transfer-signing.jpg';
import stadiumBg from '@/assets/stadium-management-hero.jpg';

export type TemplateKey = 
  | 'league_win' | 'league_loss' | 'league_draw' | 'league_champion' 
  | 'cup_advance' | 'cup_eliminated' | 'cup_champion' 
  | 'mvp' | 'top_scorer' | 'derby' | 'win_streak' | 'crisis' | 'transfer' | 'default';

interface NewsVisualProps {
  templateKey?: TemplateKey;
  teamName?: string;
  opponentName?: string;
  score?: string;
  competition?: string;
  phase?: string;
  playerName?: string;
  importance?: number;
  club?: any; // For shield
  className?: string;
}

const TEMPLATES: Record<string, { bg: string; icon: any; color: string; label: string }> = {
  league_win: { bg: leagueBg, icon: TrendingUp, color: 'from-emerald-600/90', label: 'VITÓRIA NA LIGA' },
  league_loss: { bg: leagueBg, icon: TrendingDown, color: 'from-red-600/90', label: 'DERROTA AMARGA' },
  league_draw: { bg: leagueBg, icon: Activity, color: 'from-blue-600/90', label: 'EMPATE DISPUTADO' },
  league_champion: { bg: leagueBg, icon: Trophy, color: 'from-amber-500/90', label: 'CAMPEÃO NACIONAL' },
  cup_advance: { bg: cupBg, icon: Zap, color: 'from-emerald-500/90', label: 'CLASSIFICADO!' },
  cup_eliminated: { bg: cupBg, icon: TrendingDown, color: 'from-red-600/90', label: 'ELIMINAÇÃO' },
  cup_champion: { bg: cupBg, icon: Trophy, color: 'from-amber-600/90', label: 'CAMPEÃO DA COPA' },
  mvp: { bg: ballonDorBg, icon: Star, color: 'from-yellow-500/90', label: 'MELHOR DA PARTIDA' },
  top_scorer: { bg: ballonDorBg, icon: Target, color: 'from-primary/90', label: 'ARTILHEIRO' },
  derby: { bg: stadiumBg, icon: Zap, color: 'from-purple-600/90', label: 'DERBY CLÁSSICO' },
  win_streak: { bg: stadiumBg, icon: TrendingUp, color: 'from-emerald-400/90', label: 'SEQUÊNCIA POSITIVA' },
  crisis: { bg: stadiumBg, icon: Activity, color: 'from-red-700/90', label: 'CRISE NO CLUBE' },
  transfer: { bg: transferBg, icon: Star, color: 'from-blue-500/90', label: 'NOVO REFORÇO' },
  default: { bg: stadiumBg, icon: Newspaper, color: 'from-slate-700/90', label: 'NOTÍCIA' },
};

export function NewsVisualTemplate({ 
  templateKey = 'default', 
  teamName, 
  opponentName, 
  score, 
  competition, 
  phase, 
  playerName, 
  club,
  className = "" 
}: NewsVisualProps) {
  const config = TEMPLATES[templateKey] || TEMPLATES.default;
  const Icon = config.icon;

  return (
    <div className={`relative w-full aspect-video sm:aspect-[21/9] overflow-hidden rounded-xl group bg-black ${className}`}>
      {/* Background Image */}
      <img 
        src={config.bg} 
        alt="Background" 
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 opacity-60"
      />
      
      {/* Overlay Gradients */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent`} />
      <div className={`absolute inset-0 bg-gradient-to-r ${config.color} via-transparent to-transparent opacity-80`} />
      
      {/* Decorative Lines (FIFA/ESPN Style) */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-white/40 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-2 bg-primary/20 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between z-10">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Badge className="bg-white text-black font-black text-[8px] sm:text-[10px] italic skew-x-[-12deg] tracking-widest px-3">
              {config.label}
            </Badge>
            {competition && (
              <span className="text-[7px] sm:text-[9px] font-bold text-white/70 uppercase tracking-tighter ml-1">
                {competition} {phase ? `• ${phase}` : ''}
              </span>
            )}
          </div>
          <div className="bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10">
            <Icon className="h-3 w-3 sm:h-5 sm:h-5 text-white" />
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="flex-1">
            {playerName ? (
              <h2 className="text-xl sm:text-3xl font-black text-white italic skew-x-[-5deg] leading-none tracking-tighter drop-shadow-2xl">
                {playerName.toUpperCase()}
              </h2>
            ) : (
              <div className="space-y-1">
                <h2 className="text-lg sm:text-2xl font-black text-white italic skew-x-[-5deg] leading-none tracking-tighter drop-shadow-2xl uppercase">
                  {teamName}
                </h2>
                {opponentName && score && (
                  <p className="text-xs sm:text-lg font-black text-primary italic skew-x-[-5deg] tracking-widest drop-shadow-lg">
                    {score} vs {opponentName}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {club && (
            <div className="shrink-0 flex items-center justify-center p-2 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform">
              <ClubShield club={club} size={window.innerWidth < 640 ? 40 : 60} />
            </div>
          )}
        </div>
      </div>
      
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
    </div>
  );
}
