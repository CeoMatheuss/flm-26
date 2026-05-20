import { ShieldCrest } from '@/components/game/ShieldCrest';
import { shieldPropsFromClub, hasShield } from '@/components/game/shieldHelpers';
import { NotificationBell } from '@/components/game/NotificationBell';
import { Button } from '@/components/ui/button';
import { Users, Star, Trophy, LogOut, ShoppingBag } from 'lucide-react';
import flmLogo from '@/assets/flm26-logo.png';
import { Club } from '@/types/game';
import { Infrastructure } from '@/types/infrastructure';
import { SeasonData } from '@/types/infrastructure';

interface GameHeaderProps {
  club: Club;
  season: SeasonData;
  infrastructure: Infrastructure;
  listedPlayers: string[];
  userId: string;
  isNewClub?: boolean;
  onSignOut: () => void;
}

export function GameHeader({ club, season, infrastructure, listedPlayers, userId, isNewClub, onSignOut }: GameHeaderProps) {
  return (
    <header className="border-b border-border/20 bg-card/80 backdrop-blur-xl sticky top-0 z-10 safe-area-top shadow-sm shadow-black/10">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        {/* Club Identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="relative">
            {hasShield(club as any) ? (
              <ShieldCrest {...shieldPropsFromClub(club as any)} size={36} className="shrink-0" />
            ) : club.logoUrl ? (
              <img src={club.logoUrl} alt={club.name} className="w-9 h-9 rounded-lg shrink-0 object-cover" />
            ) : (
              <img src={flmLogo} alt="FLM 26" className="w-9 h-9 rounded-lg shrink-0" />
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-card" title="Online" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold truncate leading-tight">{club.name}</h1>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
              <span className="game-badge bg-accent text-foreground">T{season.currentSeason}</span>
              
              <span>{club.stats.points}pts</span>
              <span className="text-primary font-bold">R${(club.budget / 1000000).toFixed(1)}M</span>
            </div>
          </div>
        </div>

        {/* Quick Stats - Hidden on very small screens */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1 text-[10px]">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{club.players.length}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <Star className="h-3 w-3 text-primary" />
            <span className="text-muted-foreground">{club.reputation}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <Trophy className="h-3 w-3 text-primary" />
            <span className="text-muted-foreground">{club.stats.wins}V</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <NotificationBell players={club.players} budget={club.budget} listedPlayers={listedPlayers} clubName={club.name} infrastructure={infrastructure} isNewClub={isNewClub} userId={userId} />
          <Button size="sm" variant="ghost" onClick={onSignOut} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
