import { useState, useMemo } from 'react';
import { LeagueTeam } from '@/types/league';
import { Player } from '@/types/game';
import { generatePlayer } from '@/utils/playerGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Trophy, TrendingUp, Landmark, Star } from 'lucide-react';

interface Props {
  team: LeagueTeam;
  isUserTeam: boolean;
  userPlayers?: Player[];
  onBack: () => void;
}

const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
};

const posOrder = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

// Generate a fake stadium name based on team name
function generateStadiumName(teamName: string): string {
  const stadiums = [
    `Arena ${teamName.split(' ')[0]}`,
    `Estádio ${teamName.split(' ')[0]}`,
    `${teamName.split(' ')[0]} Park`,
    `Estádio Municipal`,
    `Arena Municipal`,
  ];
  const idx = teamName.length % stadiums.length;
  return stadiums[idx];
}

function generateBotSquad(teamStrength: number): Player[] {
  const squad: Player[] = [];
  const posCount: [Player['position'], number][] = [
    ['GOL', 2], ['ZAG', 4], ['LAT', 3], ['VOL', 3], ['MEI', 4], ['ATA', 4],
  ];
  const minOvr = Math.max(40, teamStrength - 15);
  const maxOvr = Math.min(95, teamStrength + 5);
  for (const [pos, count] of posCount) {
    for (let i = 0; i < count; i++) {
      squad.push(generatePlayer([minOvr, maxOvr], [18, 34], pos));
    }
  }
  return squad;
}

export function TeamViewModal({ team, isUserTeam, userPlayers, onBack }: Props) {
  const players = useMemo(() => {
    if (isUserTeam && userPlayers) return userPlayers;
    return generateBotSquad(team.strength || 65);
  }, [team.name, team.strength, isUserTeam, userPlayers]);

  const sortedPlayers = [...players].sort((a, b) => {
    const posA = posOrder.indexOf(a.position);
    const posB = posOrder.indexOf(b.position);
    if (posA !== posB) return posA - posB;
    return b.overall - a.overall;
  });

  const totalGames = team.played;
  const winRate = totalGames > 0 ? Math.round((team.wins / totalGames) * 100) : 0;
  const reputation = team.strength || 65;
  const stadiumName = generateStadiumName(team.name);

  // First 11 by position are starters
  const startersByPos: Record<string, number> = {};
  const starterIds = new Set<string>();
  for (const p of sortedPlayers) {
    const maxStarters: Record<string, number> = { GOL: 1, ZAG: 2, LAT: 2, VOL: 2, MEI: 2, ATA: 2 };
    const current = startersByPos[p.position] || 0;
    if (current < (maxStarters[p.position] || 2)) {
      startersByPos[p.position] = current + 1;
      starterIds.add(p.id);
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar à Liga
      </Button>

      {/* Team Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{team.logo}</span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">{team.name}</h2>
              <p className="text-xs text-muted-foreground">{players.length} jogadores</p>
            </div>
          </div>

          {/* Club Info */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 bg-muted/30 rounded p-3">
              <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Estádio</p>
                <p className="text-xs font-medium">{stadiumName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-muted/30 rounded p-3">
              <Star className="h-4 w-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Reputação</p>
                <p className="text-xs font-bold">{reputation}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className="text-lg font-bold">{team.points}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Pontos</p>
            </div>
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className="text-lg font-bold text-emerald-400">{team.wins}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Vitórias</p>
            </div>
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className="text-lg font-bold">{team.goalsFor}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Gols Pró</p>
            </div>
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className="text-lg font-bold">{winRate}%</p>
              <p className="text-[9px] text-muted-foreground uppercase">Aprov.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Squad - No attributes, only name/position/age/status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" /> Elenco Completo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {sortedPlayers.map((p, i) => {
              const isStarter = starterIds.has(p.id);
              return (
                <div key={p.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/20 hover:bg-muted/40 transition-colors">
                  <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[p.position]}`}>{p.position}</span>
                  <span className="text-xs font-medium flex-1 truncate">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground">{p.age} anos</span>
                  <Badge variant={isStarter ? 'default' : 'outline'} className="text-[8px] px-1.5 h-4">
                    {isStarter ? 'Titular' : 'Reserva'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
