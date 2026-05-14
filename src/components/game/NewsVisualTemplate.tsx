import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ClubShield } from './ClubShield';
import { Trophy, Star, TrendingUp, TrendingDown, Target, Zap, Activity, Newspaper } from 'lucide-react';
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

  // New Result-focused layout for match results
  const isResult = ['league_win', 'league_loss', 'league_draw', 'league_champion', 'cup_advance', 'cup_eliminated', 'cup_champion'].includes(templateKey);

  return (
    <div className={`relative w-full overflow-hidden rounded-xl group bg-black ${isResult ? 'aspect-[21/7]' : 'aspect-video sm:aspect-[21/9]'} ${className}`}>
      {/* Background Image */}
      <img 
        src={config.bg} 
        alt="Background" 
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 opacity-40"
      />
      
      {/* Overlay Gradients */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent`} />
      <div className={`absolute inset-0 bg-gradient-to-r ${config.color} via-transparent to-transparent opacity-60`} />
      
      {/* Decorative Lines */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-white/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-primary/20 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative h-full p-3 sm:p-5 flex flex-col justify-between z-10">
        <div className="flex items-start justify-between">
          <Badge className="bg-white text-black font-black text-[7px] sm:text-[9px] italic skew-x-[-12deg] tracking-widest px-2 py-0">
            {config.label}
          </Badge>
          <div className="bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/10">
            <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
          </div>
        </div>

        {isResult && opponentName && score ? (
          <div className="flex items-center justify-center gap-4 sm:gap-8 mb-2">
            <div className="flex flex-col items-center gap-1">
              <div className="p-1.5 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 shadow-xl">
                <ClubShield club={club} size={window.innerWidth < 640 ? 32 : 48} />
              </div>
              <span className="text-[8px] sm:text-[10px] font-black text-white uppercase truncate max-w-[60px] sm:max-w-[100px]">{teamName}</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="bg-primary/90 text-white px-3 py-1 rounded-sm skew-x-[-10deg] shadow-lg border border-white/20">
                <span className="text-lg sm:text-2xl font-black italic tracking-tighter tabular-nums">{score}</span>
              </div>
              {competition && (
                <span className="text-[6px] sm:text-[8px] font-bold text-white/50 uppercase tracking-tighter mt-1">
                  {competition}
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="p-1.5 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 shadow-xl group-hover:bg-white/10 transition-colors">
                {opponentName ? (
                  <ClubShield 
                    club={{ name: opponentName }} 
                    size={window.innerWidth < 640 ? 32 : 48} 
                    className="opacity-90"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center bg-black/20 rounded">
                    <Target className="h-4 w-4 sm:h-6 sm:w-6 text-white/40" />
                  </div>
                )}
              </div>
              <span className="text-[8px] sm:text-[10px] font-black text-white/80 uppercase truncate max-w-[60px] sm:max-w-[100px]">{opponentName}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1">
              {playerName ? (
                <h2 className="text-lg sm:text-2xl font-black text-white italic skew-x-[-5deg] leading-none tracking-tighter drop-shadow-2xl">
                  {playerName.toUpperCase()}
                </h2>
              ) : (
                <div className="space-y-0.5">
                  <h2 className="text-sm sm:text-xl font-black text-white italic skew-x-[-5deg] leading-none tracking-tighter drop-shadow-2xl uppercase">
                    {teamName}
                  </h2>
                  {competition && (
                    <span className="text-[7px] sm:text-[9px] font-bold text-white/70 uppercase tracking-tighter">
                      {competition} {phase ? `• ${phase}` : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {club && (
              <div className="shrink-0 p-1.5 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 shadow-2xl rotate-2 group-hover:rotate-0 transition-transform">
                <ClubShield club={club} size={window.innerWidth < 640 ? 32 : 48} />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
    </div>
  );
}
