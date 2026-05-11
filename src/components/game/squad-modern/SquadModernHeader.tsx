import React from 'react';
import { ClubShield } from '../ClubShield';
import { NotificationBell } from '../NotificationBell';
import { Trophy, Wallet, Star, Bell, LogOut, Clock, Calendar } from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';
import { Club } from '@/types/game';
import { SeasonData, Infrastructure } from '@/types/infrastructure';
import { Button } from '@/components/ui/button';

interface SquadModernHeaderProps {
  club: Club;
  season: SeasonData;
  infrastructure: Infrastructure;
  userId: string;
  onSignOut: () => void;
  listedPlayers: string[];
}

export function SquadModernHeader({ club, season, infrastructure, userId, onSignOut, listedPlayers }: SquadModernHeaderProps) {
  const teamOvr = Math.round(club.players.reduce((sum, p) => sum + p.overall, 0) / Math.max(1, club.players.length));
  
  return (
    <header className="h-20 bg-[#05070a]/80 backdrop-blur-xl border-b border-white/5 flex items-center px-8 justify-between sticky top-0 z-40">
      <div className="flex items-center gap-8">
        {/* Club Info */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            <ClubShield club={club as any} size={50} className="drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#10b981] border-2 border-[#05070a] shadow-[0_0_10px_#10b981]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white italic tracking-tighter leading-none mb-1 uppercase">{club.name}</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#8b5cf6]/10 border border-[#8b5cf6]/20">
                <Trophy className="h-3 w-3 text-[#8b5cf6]" />
                <span className="text-[10px] font-black text-[#8b5cf6] uppercase tracking-wider">T{season.currentSeason}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                <Star className="h-3 w-3 text-white/40" />
                <span className="text-[10px] font-black text-white/60 uppercase tracking-wider">{club.reputation} OVR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="h-10 w-px bg-white/5" />

        {/* Date/Time */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-white/40 mb-0.5">
              <Calendar className="h-3 w-3" />
              <span className="text-[9px] font-bold uppercase tracking-[0.1em]">Data Atual</span>
            </div>
            <span className="text-sm font-black text-white tracking-wide uppercase">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-white/40 mb-0.5">
              <Clock className="h-3 w-3" />
              <span className="text-[9px] font-bold uppercase tracking-[0.1em]">Horário</span>
            </div>
            <span className="text-sm font-black text-white tracking-wide uppercase">12:00</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Budget info */}
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-white/40 mb-0.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.1em]">Saldo em Caixa</span>
              <Wallet className="h-3 w-3" />
            </div>
            <span className="text-sm font-black text-[#10b981] drop-shadow-[0_0_10px_rgba(16,185,129,0.2)]">{formatMoney(club.budget)}</span>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-white/40 mb-0.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.1em]">Orçamento</span>
              <Trophy className="h-3 w-3" />
            </div>
            <span className="text-sm font-black text-white">R$ 5.4M</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-10 w-px bg-white/5" />

        {/* Notifications & Logout */}
        <div className="flex items-center gap-3">
          <NotificationBell 
            players={club.players} 
            budget={club.budget} 
            listedPlayers={listedPlayers} 
            clubName={club.name} 
            infrastructure={infrastructure} 
            userId={userId} 
          />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onSignOut}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-white/60 transition-all duration-300"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
