import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Trophy, Landmark, Star, ShoppingCart } from 'lucide-react';
import { ShieldCrest, ShieldShape } from './ShieldCrest';
import { generatePlayer } from '@/utils/playerGenerator';
import { supabase } from '@/integrations/supabase/client';
import type { Player } from '@/types/game';
import type { LeagueMember, LeagueMatch, LeagueSquad } from '@/hooks/useMultiplayer';

interface Props {
  member: LeagueMember;
  members: LeagueMember[];
  userId: string;
  leagueMatches: LeagueMatch[];
  leagueSquads: LeagueSquad[];
  clubShield?: { primaryColor: string; secondaryColor: string; pattern: string; shape: string };
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

function getTeamColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 55%)`;
}

export function ClubProfilePage({ member, members, userId, leagueMatches, leagueSquads, clubShield, onBack }: Props) {
  const [transferPlayerNames, setTransferPlayerNames] = useState<Set<string>>(new Set());
  const [loanPlayerNames, setLoanPlayerNames] = useState<Set<string>>(new Set());

  const isBot = member.user_id.startsWith('bot_');
  const isUserTeam = member.user_id === userId;

  // Fetch transfer/loan listings for this club
  useEffect(() => {
    async function fetchListings() {
      const { data: transfers } = await supabase
        .from('transfer_listings')
        .select('player_name')
        .eq('seller_id', member.user_id)
        .eq('status', 'active');

      const { data: loans } = await supabase
        .from('loan_listings')
        .select('player_name')
        .eq('seller_id', member.user_id)
        .eq('status', 'active');

      if (transfers) setTransferPlayerNames(new Set(transfers.map(t => t.player_name)));
      if (loans) setLoanPlayerNames(new Set(loans.map(l => l.player_name)));
    }
    if (!isBot) fetchListings();
  }, [member.user_id, isBot]);

  // Get squad
  const squad = useMemo(() => {
    if (isBot) {
      const strength = Math.max(40, Math.min(85, member.reputation));
      const minOvr = Math.max(40, strength - 15);
      const maxOvr = Math.min(95, strength + 5);
      const posCount: [Player['position'], number][] = [
        ['GOL', 2], ['ZAG', 4], ['LAT', 3], ['VOL', 3], ['MEI', 4], ['ATA', 4],
      ];
      const players: Player[] = [];
      for (const [pos, count] of posCount) {
        for (let i = 0; i < count; i++) {
          players.push(generatePlayer([minOvr, maxOvr], [18, 34], pos));
        }
      }
      return players;
    }

    // Real player - check league squads
    const squadData = leagueSquads.find(s => s.user_id === member.user_id);
    if (squadData?.squad_data && Array.isArray(squadData.squad_data)) {
      return (squadData.squad_data as any[]).map((p: any) => ({
        id: p.id || crypto.randomUUID(),
        name: p.name || 'Desconhecido',
        position: p.position || 'MEI',
        age: p.age || 20,
        overall: p.overall || 50,
        goals: p.goals || 0,
        assists: p.assists || 0,
      })) as Player[];
    }

    return [];
  }, [member, isBot, leagueSquads]);

  const sortedPlayers = [...squad].sort((a, b) => {
    const pA = posOrder.indexOf(a.position);
    const pB = posOrder.indexOf(b.position);
    if (pA !== pB) return pA - pB;
    return (b.overall || 0) - (a.overall || 0);
  });

  // Determine starters (first 11 by position)
  const starterIds = useMemo(() => {
    const ids = new Set<string>();
    const byPos: Record<string, number> = {};
    const maxStarters: Record<string, number> = { GOL: 1, ZAG: 2, LAT: 2, VOL: 2, MEI: 2, ATA: 2 };
    for (const p of sortedPlayers) {
      const current = byPos[p.position] || 0;
      if (current < (maxStarters[p.position] || 2)) {
        byPos[p.position] = current + 1;
        ids.add(p.id);
      }
    }
    return ids;
  }, [sortedPlayers]);

  // Stats
  const sg = member.goals_for - member.goals_against;
  const winRate = member.played > 0 ? Math.round((member.wins / member.played) * 100) : 0;

  // Last 5 form
  const last5 = useMemo(() => {
    const teamMatches = leagueMatches
      .filter(m => m.status === 'played' && (m.home_user_id === member.user_id || m.away_user_id === member.user_id))
      .sort((a, b) => (b.round || 0) - (a.round || 0))
      .slice(0, 5);

    return teamMatches.map(m => {
      const isHome = m.home_user_id === member.user_id;
      const myGoals = isHome ? (m.home_goals ?? 0) : (m.away_goals ?? 0);
      const oppGoals = isHome ? (m.away_goals ?? 0) : (m.home_goals ?? 0);
      return myGoals > oppGoals ? 'V' : myGoals === oppGoals ? 'E' : 'D';
    });
  }, [leagueMatches, member.user_id]);

  // Match history
  const matchHistory = useMemo(() => {
    return leagueMatches
      .filter(m => m.status === 'played' && (m.home_user_id === member.user_id || m.away_user_id === member.user_id))
      .sort((a, b) => (a.round || 0) - (b.round || 0));
  }, [leagueMatches, member.user_id]);

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar à Tabela
      </Button>

      {/* Club Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            {isUserTeam && clubShield ? (
              <ShieldCrest
                primaryColor={clubShield.primaryColor}
                secondaryColor={clubShield.secondaryColor}
                pattern={clubShield.pattern}
                shape={clubShield.shape as ShieldShape}
                size={40}
              />
            ) : (
              <ShieldCrest
                primaryColor={getTeamColor(member.club_name)}
                secondaryColor="#ffffff"
                pattern="solid"
                shape="classic"
                size={40}
              />
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                {member.club_name}
                {isBot && <Badge variant="secondary" className="text-[8px]">BOT</Badge>}
              </h2>
              <p className="text-xs text-muted-foreground">
                Reputação: {member.reputation} • {squad.length} jogadores
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className="text-lg font-bold">{member.points}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Pontos</p>
            </div>
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className="text-lg font-bold text-emerald-400">{member.wins}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Vitórias</p>
            </div>
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className={`text-lg font-bold ${sg > 0 ? 'text-emerald-400' : sg < 0 ? 'text-rose-400' : ''}`}>
                {sg > 0 ? `+${sg}` : sg}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase">Saldo</p>
            </div>
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className="text-lg font-bold">{winRate}%</p>
              <p className="text-[9px] text-muted-foreground uppercase">Aprov.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-muted/20 rounded p-1.5 text-center text-xs">
              <span className="text-muted-foreground">J</span> <span className="font-bold ml-1">{member.played}</span>
            </div>
            <div className="bg-muted/20 rounded p-1.5 text-center text-xs">
              <span className="text-muted-foreground">GP</span> <span className="font-bold ml-1">{member.goals_for}</span>
            </div>
            <div className="bg-muted/20 rounded p-1.5 text-center text-xs">
              <span className="text-muted-foreground">GC</span> <span className="font-bold ml-1">{member.goals_against}</span>
            </div>
          </div>

          {/* Form */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Forma:</span>
            <div className="flex gap-0.5">
              {last5.length === 0 ? (
                <span className="text-[10px] text-muted-foreground">—</span>
              ) : last5.map((r, ri) => (
                <span key={ri} className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold ${
                  r === 'V' ? 'bg-emerald-500/20 text-emerald-400' : r === 'E' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                }`}>{r}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Squad */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" /> Elenco
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedPlayers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Elenco não disponível</p>
          ) : (
            <div className="space-y-1">
              {sortedPlayers.map((p, i) => {
                const isStarter = starterIds.has(p.id);
                const isOnTransfer = transferPlayerNames.has(p.name);
                const isOnLoan = loanPlayerNames.has(p.name);

                return (
                  <div key={p.id} className={`flex items-center gap-2 py-1.5 px-2 rounded transition-colors ${
                    isOnTransfer ? 'bg-amber-500/10 border border-amber-500/20' :
                    isOnLoan ? 'bg-blue-500/10 border border-blue-500/20' :
                    'bg-muted/20 hover:bg-muted/40'
                  }`}>
                    <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[p.position]}`}>{p.position}</span>
                    <span className="text-xs font-medium flex-1 truncate">{p.name}</span>
                    {isOnTransfer && (
                      <Badge variant="outline" className="text-[8px] px-1 h-4 border-amber-500/50 text-amber-400 gap-0.5">
                        <ShoppingCart className="h-2.5 w-2.5" /> À Venda
                      </Badge>
                    )}
                    {isOnLoan && (
                      <Badge variant="outline" className="text-[8px] px-1 h-4 border-blue-500/50 text-blue-400">
                        🔄 Empréstimo
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">{p.age} anos</span>
                    <Badge variant={isStarter ? 'default' : 'outline'} className="text-[8px] px-1.5 h-4">
                      {isStarter ? 'Titular' : 'Reserva'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match History */}
      {matchHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Histórico de Jogos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {matchHistory.filter(m => m.status === 'played').map(m => {
              const isHome = m.home_user_id === member.user_id;
              const oppId = isHome ? m.away_user_id : m.home_user_id;
              const opp = members.find(mb => mb.user_id === oppId);
              const myGoals = isHome ? (m.home_goals ?? 0) : (m.away_goals ?? 0);
              const oppGoals = isHome ? (m.away_goals ?? 0) : (m.home_goals ?? 0);
              const result = myGoals > oppGoals ? 'V' : myGoals === oppGoals ? 'E' : 'D';
              const resultColor = result === 'V' ? 'text-emerald-400' : result === 'D' ? 'text-rose-400' : 'text-amber-400';
              return (
                <div key={m.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/20 text-xs">
                  <span className="text-muted-foreground font-mono w-6">R{m.round}</span>
                  <span className={`font-bold w-4 ${resultColor}`}>{result}</span>
                  <span className="font-mono">{myGoals} - {oppGoals}</span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="truncate font-medium">{opp?.club_name || '???'}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
