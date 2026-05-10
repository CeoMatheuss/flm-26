import { ShieldCrest } from '@/components/game/ShieldCrest';
import { shieldPropsFromClub, hasShield } from '@/components/game/shieldHelpers';
import { NotificationBell } from '@/components/game/NotificationBell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Star, LogOut } from 'lucide-react';
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
    <header className="border-b border-border/30 bg-card/95 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1920px] mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-4">
        {/* Club Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            {hasShield(club as any) ? (
              <ShieldCrest {...shieldPropsFromClub(club as any)} size={32} className="shrink-0" />
            ) : club.logoUrl ? (
              <img src={club.logoUrl} alt={club.name} className="w-8 h-8 rounded-lg shrink-0 object-cover border border-border/40" />
            ) : (
              <img src={flmLogo} alt="FLM 26" className="w-8 h-8 rounded-lg shrink-0 border border-border/40" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate leading-none mb-0.5">{club.name}</h1>
            <div className="flex items-center gap-2 text-[10px]">
              <Badge variant="secondary" className="h-4 px-1 font-bold bg-primary/20 text-primary border-none">T{season.currentSeason}</Badge>
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <span className="tabular-nums">{club.stats.points} PTS</span>
                <span className="text-emerald-400 font-bold tabular-nums">R${(club.budget / 1000000).toFixed(1)}M</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Info */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase text-muted-foreground font-bold leading-none mb-1">Elenco</span>
            <div className="flex items-center gap-1.5 text-xs font-black">
              <Users className="h-3 w-3 text-primary" />
              <span>{club.players.length}</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase text-muted-foreground font-bold leading-none mb-1">Reputação</span>
            <div className="flex items-center gap-1.5 text-xs font-black">
              <Star className="h-3 w-3 text-primary" />
              <span>{club.reputation}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationBell players={club.players} budget={club.budget} listedPlayers={listedPlayers} clubName={club.name} infrastructure={infrastructure} isNewClub={isNewClub} userId={userId} />
          <Button size="icon" variant="ghost" onClick={onSignOut} className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-lg">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
