import { ShieldCrest } from '@/components/game/ShieldCrest';
import { shieldPropsFromClub, hasShield } from '@/components/game/shieldHelpers';
import { NotificationBell } from '@/components/game/NotificationBell';
import { Button } from '@/components/ui/button';
import { Users, Star, Trophy, LogOut } from 'lucide-react';
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
    <header className="border-b border-border/30 bg-gradient-to-r from-card/95 via-card/85 to-card/95 backdrop-blur-xl sticky top-0 z-50 safe-area-top shadow-lg shadow-black/20">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-4">
        {/* Club Identity */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div className="relative shrink-0">
            {hasShield(club as any) ? (
              <ShieldCrest {...shieldPropsFromClub(club as any)} size={42} className="shrink-0 drop-shadow-md" />
            ) : club.logoUrl ? (
              <img src={club.logoUrl} alt={club.name} className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl shrink-0 object-cover border border-border/40 shadow-md" />
            ) : (
              <img src={flmLogo} alt="FLM 26" className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl shrink-0 border border-border/40 shadow-md" />
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card shadow-sm" title="Online" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <h1 className="text-sm sm:text-lg font-black truncate leading-none tracking-tight mb-1">{club.name}</h1>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs">
              <Badge variant="secondary" className="h-4 px-1.5 font-bold bg-primary/20 text-primary border-none">T{season.currentSeason}</Badge>
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <span className="tabular-nums">{club.stats.points} PTS</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span className="text-emerald-400 font-bold tabular-nums">R${(club.budget / 1000000).toFixed(1)}M</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions - Grouped and spaced for touch */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-4 px-4 py-1.5 bg-accent/30 rounded-full border border-border/20 mr-2">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>{club.players.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Star className="h-3.5 w-3.5 text-primary" />
              <span>{club.reputation}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <NotificationBell players={club.players} budget={club.budget} listedPlayers={listedPlayers} clubName={club.name} infrastructure={infrastructure} isNewClub={isNewClub} userId={userId} />
            <Button size="icon" variant="ghost" onClick={onSignOut} className="touch-target h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
