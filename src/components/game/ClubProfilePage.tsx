import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Trophy, Landmark, Star, ShoppingCart, Building2, Heart, GraduationCap, Home, Calendar, ArrowLeft, Send, DollarSign, Gift, HelpCircle, X, Eye } from 'lucide-react';
import { ShieldCrest, ShieldShape } from './ShieldCrest';
import { shieldPropsFromClub } from './shieldHelpers';
import { generatePlayer } from '@/utils/playerGenerator';
import { supabase } from '@/integrations/supabase/client';
import { getStadiumCapacity } from '@/types/infrastructure';
import { toast } from 'sonner';
import type { Player } from '@/types/game';
import type { LeagueMember, LeagueMatch, LeagueSquad } from '@/hooks/useMultiplayer';

interface TransferListing {
  id: string;
  seller_id: string;
  seller_club_name: string;
  player_name: string;
  player_position: string;
  player_overall: number;
  player_age: number;
  player_data: any;
  asking_price: number;
  status: string;
  transfer_count: number;
}

interface LoanListing {
  id: string;
  seller_id: string;
  seller_club_name: string;
  player_name: string;
  player_position: string;
  player_overall: number;
  player_age: number;
  player_data: any;
  salary: number;
  status: string;
}

interface Props {
  member: LeagueMember;
  members: LeagueMember[];
  userId: string;
  leagueMatches: LeagueMatch[];
  leagueSquads: LeagueSquad[];
  clubShield?: { primaryColor: string; secondaryColor: string; pattern: string; shape: string };
  onBack: () => void;
  // Optional: for buying directly
  budget?: number;
  clubName?: string;
  onPlayerBought?: (playerData: any, price: number, salary: number, contractYears: number) => void;
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
const posLabels: Record<string, string> = {
  GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante',
};

function getTeamColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 55%)`;
}

interface ClubMeta {
  stadiumName?: string;
  stadiumLevel?: number;
  trainingCenterLevel?: number;
  physiotherapyLevel?: number;
  youthAcademyLevel?: number;
  primaryColor?: string;
  secondaryColor?: string;
  detailColor?: string;
  shieldPattern?: string;
  shieldShape?: string;
  shieldIcon?: string;
  shieldConfig?: any;
  country?: string;
  reputation?: number;
  fans?: number;
  foundedSeason?: number;
  ownerName?: string;
  motto?: string;
  trophies?: { title: string; season: number; date: string }[];
}

export function ClubProfilePage({ member, members, userId, leagueMatches, leagueSquads, clubShield, onBack, budget, clubName, onPlayerBought }: Props) {
  const [transferListings, setTransferListings] = useState<TransferListing[]>([]);
  const [loanListings, setLoanListings] = useState<LoanListing[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [negotiatingListing, setNegotiatingListing] = useState<TransferListing | null>(null);
  const [myPurchases, setMyPurchases] = useState<any[]>([]);

  useEffect(() => {
    async function fetchPurchases() {
      const { data } = await supabase.from('shop_purchases').select('product_id').eq('user_id', member.user_id).eq('status', 'completed');
      if (data) setMyPurchases(data);
    }
    fetchPurchases();
  }, [member.user_id]);

  const isBot = member.user_id.startsWith('bot_');
  const isUserTeam = member.user_id === userId;
  const canBuy = !isUserTeam && !isBot && budget != null && clubName != null && onPlayerBought != null;

  // Fetch transfer/loan listings for this club
  useEffect(() => {
    async function fetchListings() {
      const { data: transfers } = await supabase
        .from('transfer_listings')
        .select('*')
        .eq('seller_id', member.user_id)
        .eq('status', 'active');

      const { data: loans } = await supabase
        .from('loan_listings')
        .select('*')
        .eq('seller_id', member.user_id)
        .eq('status', 'active');

      if (transfers) setTransferListings(transfers as unknown as TransferListing[]);
      if (loans) setLoanListings(loans as unknown as LoanListing[]);
    }
    if (!isBot) fetchListings();
  }, [member.user_id, isBot]);

  const transferPlayerNames = useMemo(() => new Set(transferListings.map(t => t.player_name)), [transferListings]);
  const loanPlayerNames = useMemo(() => new Set(loanListings.map(l => l.player_name)), [loanListings]);

  // Parse squad data
  const { squad, clubMeta } = useMemo(() => {
    if (isBot) {
      const strength = Math.max(40, Math.min(85, member.reputation));
      const minOvr = Math.max(40, strength - 15);
      const maxOvr = Math.min(95, strength + 5);
      const posCount: [Player['position'], number][] = [
        ['GOL', 2], ['ZAG', 2], ['LAT', 2], ['VOL', 2], ['MEI', 2], ['ATA', 2],
      ];
      const players: Player[] = [];
      for (const [pos, count] of posCount) {
        for (let i = 0; i < count; i++) {
          players.push(generatePlayer([minOvr, maxOvr], [18, 34], pos));
        }
      }
      const botMeta: ClubMeta = {
        stadiumName: `Estádio ${member.club_name}`,
        stadiumLevel: Math.max(1, Math.min(5, Math.floor(member.reputation / 20))),
        trainingCenterLevel: Math.max(0, Math.min(5, Math.floor(member.reputation / 25))),
        physiotherapyLevel: Math.max(0, Math.min(4, Math.floor(member.reputation / 30))),
        youthAcademyLevel: Math.max(0, Math.min(10, Math.floor(member.reputation / 10))),
        fans: 1000,
      };
      return { squad: players, clubMeta: botMeta };
    }

    const squadData = leagueSquads.find(s => s.user_id === member.user_id);
    if (squadData?.squad_data) {
      const raw = squadData.squad_data as any;
      if (raw.players && Array.isArray(raw.players)) {
        const players = raw.players.map((p: any) => ({
          id: p.id || crypto.randomUUID(),
          name: p.name || 'Desconhecido',
          position: p.position || 'MEI',
          age: p.age || 20,
          overall: p.overall || 50,
          goals: p.goals || 0,
          assists: p.assists || 0,
          gamesPlayed: p.gamesPlayed || 0,
          seasonRatings: p.seasonRatings || [],
        })) as any[];
        return { squad: players, clubMeta: (raw.clubMeta || {}) as ClubMeta };
      }
      if (Array.isArray(raw)) {
        const players = raw.map((p: any) => ({
          id: p.id || crypto.randomUUID(),
          name: p.name || 'Desconhecido',
          position: p.position || 'MEI',
          age: p.age || 20,
          overall: p.overall || 50,
          goals: p.goals || 0,
          assists: p.assists || 0,
          gamesPlayed: p.gamesPlayed || 0,
          seasonRatings: p.seasonRatings || [],
        })) as any[];
        return { squad: players, clubMeta: {} as ClubMeta };
      }
    }

    return { squad: [] as any[], clubMeta: {} as ClubMeta };
  }, [member, isBot, leagueSquads]);

  const sortedPlayers = [...squad].sort((a: any, b: any) => {
    const pA = posOrder.indexOf(a.position);
    const pB = posOrder.indexOf(b.position);
    if (pA !== pB) return pA - pB;
    return (b.overall || 0) - (a.overall || 0);
  });

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

  const sg = member.goals_for - member.goals_against;
  const winRate = member.played > 0 ? Math.round((member.wins / member.played) * 100) : 0;

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

  const matchHistory = useMemo(() => {
    return leagueMatches
      .filter(m => m.status === 'played' && (m.home_user_id === member.user_id || m.away_user_id === member.user_id))
      .sort((a, b) => (a.round || 0) - (b.round || 0));
  }, [leagueMatches, member.user_id]);

  const shieldData = isUserTeam && clubShield ? clubShield : (clubMeta.primaryColor || clubMeta.shieldConfig ? shieldPropsFromClub(clubMeta as any) : null);

  const stadiumCapacity = clubMeta.stadiumLevel ? getStadiumCapacity(clubMeta.stadiumLevel) : null;
  const trophies = clubMeta.trophies || [];

  // Find listing for a player by name
  const getListingForPlayer = (playerName: string) => transferListings.find(l => l.player_name === playerName);
  const getLoanForPlayer = (playerName: string) => loanListings.find(l => l.player_name === playerName);

  // If negotiating a player purchase
  if (negotiatingListing) {
    return (
      <NegotiationView
        listing={negotiatingListing}
        budget={budget || 0}
        clubName={clubName || ''}
        onBack={() => setNegotiatingListing(null)}
        onSuccess={() => {
          setNegotiatingListing(null);
          // Refresh listings
          supabase.from('transfer_listings').select('*').eq('seller_id', member.user_id).eq('status', 'active')
            .then(({ data }) => { if (data) setTransferListings(data as unknown as TransferListing[]); });
        }}
      />
    );
  }

  // League position (rank within members)
  const leaguePosition = useMemo(() => {
    const sorted = [...members].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const sgA = a.goals_for - a.goals_against;
      const sgB = b.goals_for - b.goals_against;
      if (sgB !== sgA) return sgB - sgA;
      return b.goals_for - a.goals_for;
    });
    const idx = sorted.findIndex(m => m.user_id === member.user_id);
    return idx >= 0 ? idx + 1 : null;
  }, [members, member.user_id]);

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onBack}>
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Button>

      {/* Hero Header — escudo em destaque + identidade */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
            <div className="shrink-0">
              {shieldData ? (
                <ShieldCrest {...(shieldData as any)} shape={(shieldData as any).shape as ShieldShape} size={88} />
              ) : (
                <ShieldCrest primaryColor={getTeamColor(member.club_name)} secondaryColor="#ffffff" pattern="solid" shape="classic" size={88} />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h2 className="text-2xl font-bold leading-tight flex items-center gap-2">
                  <span style={{ color: clubMeta.detailColor || 'inherit' }}>{member.club_name}</span>
                  {myPurchases.some(p => p.product_id === 'custom_badge') && (
                    <Badge className="bg-gradient-to-r from-amber-400 to-yellow-600 text-white border-none animate-pulse px-1.5 py-0">
                      <Star className="h-3 w-3 fill-current" />
                    </Badge>
                  )}
                </h2>
                {isBot && <Badge variant="secondary" className="text-[9px]">BOT</Badge>}
                {isUserTeam && <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Seu clube</Badge>}
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap text-[11px] text-muted-foreground">
                {clubMeta.country && <span className="inline-flex items-center gap-1">🌍 {clubMeta.country}</span>}
                {leaguePosition && <span className="inline-flex items-center gap-1">📊 {leaguePosition}º na liga</span>}
                <span>• {squad.length} jogadores</span>
                {clubMeta.fans ? <span>• {clubMeta.fans.toLocaleString()} torcedores</span> : null}
              </div>
              {clubMeta.motto && (
                <p className="text-[11px] text-muted-foreground italic pt-0.5">"{clubMeta.motto}"</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-auto">
          <TabsTrigger value="overview" className="text-[11px] sm:text-xs py-2">Visão Geral</TabsTrigger>
          <TabsTrigger value="squad" className="text-[11px] sm:text-xs py-2">Elenco</TabsTrigger>
          <TabsTrigger value="stats" className="text-[11px] sm:text-xs py-2">Estatísticas</TabsTrigger>
          <TabsTrigger value="history" className="text-[11px] sm:text-xs py-2">Histórico</TabsTrigger>
        </TabsList>

        {/* === VISÃO GERAL === */}
        <TabsContent value="overview" className="space-y-3 mt-3">
          {/* Identity blocks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Identidade do clube</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <InfoBlock icon={<Star className="h-3.5 w-3.5 text-amber-400" />} label="Reputação" value={String(clubMeta.reputation ?? member.reputation)} />
                <InfoBlock icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />} label="Fundado" value={clubMeta.foundedSeason ? `Temporada ${clubMeta.foundedSeason}` : '—'} />
                <InfoBlock icon={<Users className="h-3.5 w-3.5 text-blue-400" />} label="Dirigente" value={clubMeta.ownerName || 'Sem dados'} />
                <InfoBlock icon={<Home className="h-3.5 w-3.5 text-emerald-400" />} label="Estádio" value={clubMeta.stadiumName || 'Sem dados'} sub={stadiumCapacity ? `${stadiumCapacity.toLocaleString('pt-BR')} lugares` : undefined} />
                <InfoBlock icon={<Heart className="h-3.5 w-3.5 text-rose-400" />} label="Torcida" value={clubMeta.fans ? clubMeta.fans.toLocaleString() : '—'} />
                <InfoBlock icon={<Trophy className="h-3.5 w-3.5 text-yellow-500" />} label="Posição" value={leaguePosition ? `${leaguePosition}º` : '—'} sub="na liga" />
              </div>
            </CardContent>
          </Card>

          {/* Forma */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Forma recente</CardTitle>
            </CardHeader>
            <CardContent>
              {last5.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Sem partidas disputadas ainda.</p>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Últimos {last5.length} jogos:</span>
                  <div className="flex gap-1">
                    {last5.map((r, ri) => (
                      <span key={ri} className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold border ${
                        r === 'V' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        r === 'E' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`} title={r === 'V' ? 'Vitória' : r === 'E' ? 'Empate' : 'Derrota'}>{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Troféus */}
          {trophies.length > 0 ? (
            <Card className="border-yellow-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" /> Troféus ({trophies.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {trophies.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/5 rounded-lg p-2.5 border border-yellow-500/20">
                      <span className="text-xl">🏆</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{t.title}</p>
                        <p className="text-[10px] text-muted-foreground">Temporada {t.season} • {t.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Infraestrutura */}
          {(clubMeta.stadiumLevel != null || clubMeta.trainingCenterLevel != null) && (
            <Card className="border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-amber-400" /> Infraestrutura
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <InfraItem icon={<Home className="h-3.5 w-3.5 text-emerald-400" />} label="Estádio" sublabel={clubMeta.stadiumName || 'Estádio'} level={clubMeta.stadiumLevel ?? 1} maxLevel={15} color="emerald" extra={stadiumCapacity ? `${stadiumCapacity.toLocaleString()} lug.` : undefined} />
                  <InfraItem icon={<Building2 className="h-3.5 w-3.5 text-blue-400" />} label="CT" sublabel="Centro de Treinamento" level={clubMeta.trainingCenterLevel ?? 0} maxLevel={10} color="blue" />
                  <InfraItem icon={<Heart className="h-3.5 w-3.5 text-rose-400" />} label="Fisioterapia" sublabel="Departamento Médico" level={clubMeta.physiotherapyLevel ?? 0} maxLevel={10} color="rose" />
                  <InfraItem icon={<GraduationCap className="h-3.5 w-3.5 text-purple-400" />} label="Base" sublabel="Categorias de Base" level={clubMeta.youthAcademyLevel ?? 0} maxLevel={30} color="purple" />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* === ELENCO === */}
        <TabsContent value="squad" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Elenco ({sortedPlayers.length} jogadores)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedPlayers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Sem dados de elenco — aguardando sincronização.</p>
              ) : (
                <div className="space-y-1">
                  {sortedPlayers.map((p: any, i: number) => {
                    const isStarter = starterIds.has(p.id);
                    const isOnTransfer = transferPlayerNames.has(p.name);
                    const isOnLoan = loanPlayerNames.has(p.name);
                    const listing = isOnTransfer ? getListingForPlayer(p.name) : null;
                    const loan = isOnLoan ? getLoanForPlayer(p.name) : null;

                    return (
                      <button
                        key={p.id}
                        className={`w-full flex items-center gap-2 py-2 px-2.5 rounded-md transition-colors text-left ${
                          isOnTransfer ? 'bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15' :
                          isOnLoan ? 'bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15' :
                          'bg-muted/20 hover:bg-muted/40'
                        }`}
                        onClick={() => setSelectedPlayer({ ...p, listing, loan })}
                      >
                        <span className="text-[10px] text-muted-foreground w-5 shrink-0">{i + 1}</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${posColors[p.position]}`}>{p.position}</span>
                        <span className="text-xs font-medium flex-1 truncate">{p.name}</span>
                        {isOnTransfer && (
                          <Badge variant="outline" className="text-[8px] px-1 h-4 border-amber-500/50 text-amber-400 gap-0.5 hidden sm:inline-flex">
                            <ShoppingCart className="h-2.5 w-2.5" /> À Venda
                          </Badge>
                        )}
                        {isOnLoan && (
                          <Badge variant="outline" className="text-[8px] px-1 h-4 border-blue-500/50 text-blue-400 hidden sm:inline-flex">
                            🔄 Empréstimo
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground shrink-0">{p.age}a</span>
                        <Badge variant={isStarter ? 'default' : 'outline'} className="text-[8px] px-1.5 h-4 shrink-0">
                          {isStarter ? 'Titular' : 'Reserva'}
                        </Badge>
                        <Eye className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ESTATÍSTICAS === */}
        <TabsContent value="stats" className="space-y-3 mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resumo da temporada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard label="Pontos" value={member.points} accent="primary" />
                <StatCard label="Vitórias" value={member.wins} accent="emerald" />
                <StatCard label="Empates" value={member.draws} accent="amber" />
                <StatCard label="Derrotas" value={member.losses} accent="rose" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard label="Jogos" value={member.played} accent="muted" />
                <StatCard label="Gols pró" value={member.goals_for} accent="emerald" />
                <StatCard label="Gols contra" value={member.goals_against} accent="rose" />
                <StatCard
                  label="Saldo"
                  value={sg > 0 ? `+${sg}` : String(sg)}
                  accent={sg > 0 ? 'emerald' : sg < 0 ? 'rose' : 'muted'}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Aproveitamento" value={`${winRate}%`} accent="primary" />
                <StatCard
                  label="Média de gols"
                  value={member.played > 0 ? (member.goals_for / member.played).toFixed(2) : '0,00'}
                  accent="emerald"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === HISTÓRICO === */}
        <TabsContent value="history" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4" /> Histórico de jogos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matchHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Sem partidas disputadas ainda.</p>
              ) : (
                <div className="space-y-1">
                  {matchHistory.filter(m => m.status === 'played').map(m => {
                    const isHome = m.home_user_id === member.user_id;
                    const oppId = isHome ? m.away_user_id : m.home_user_id;
                    const opp = members.find(mb => mb.user_id === oppId);
                    const myGoals = isHome ? (m.home_goals ?? 0) : (m.away_goals ?? 0);
                    const oppGoals = isHome ? (m.away_goals ?? 0) : (m.home_goals ?? 0);
                    const result = myGoals > oppGoals ? 'V' : myGoals === oppGoals ? 'E' : 'D';
                    const resultColor = result === 'V' ? 'text-emerald-400' : result === 'D' ? 'text-rose-400' : 'text-amber-400';
                    return (
                      <div key={m.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/20 text-xs">
                        <span className="text-muted-foreground font-mono w-7 shrink-0">R{m.round}</span>
                        <span className={`font-bold w-4 shrink-0 ${resultColor}`}>{result}</span>
                        <span className="font-mono shrink-0">{myGoals} - {oppGoals}</span>
                        <span className="text-muted-foreground shrink-0">{isHome ? 'vs' : '@'}</span>
                        <span className="truncate font-medium">{opp?.club_name || '???'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Player Detail Dialog */}
      <PlayerDetailDialog
        player={selectedPlayer}
        open={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        canBuy={canBuy}
        isUserTeam={isUserTeam}
        onBuy={(listing) => {
          setSelectedPlayer(null);
          setNegotiatingListing(listing);
        }}
      />
    </div>
  );
}

// === Info Block (Visão Geral) ===
function InfoBlock({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-muted/20 rounded-lg p-2.5 space-y-0.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xs font-semibold truncate">{value}</p>
      {sub && <p className="text-[9px] text-muted-foreground truncate">{sub}</p>}
    </div>
  );
}

// === Stat Card (Estatísticas) ===
function StatCard({ label, value, accent }: { label: string; value: string | number; accent: 'primary' | 'emerald' | 'amber' | 'rose' | 'muted' }) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    muted: 'text-foreground',
  };
  return (
    <div className="bg-muted/30 rounded-lg p-3 text-center">
      <p className={`text-2xl font-bold ${colorMap[accent]}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

// === Infrastructure Item ===
function InfraItem({ icon, label, sublabel, level, maxLevel, color, extra }: {
  icon: React.ReactNode; label: string; sublabel: string; level: number; maxLevel: number; color: string; extra?: string;
}) {
  return (
    <div className="bg-muted/20 rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="text-[10px] text-muted-foreground truncate">{sublabel}</p>
      <div className="flex items-center gap-1">
        <span className={`text-xs font-bold text-${color}-400`}>Nível {level}</span>
        {extra && <span className="text-[9px] text-muted-foreground">• {extra}</span>}
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full bg-${color}-500 rounded-full`} style={{ width: `${(level / maxLevel) * 100}%` }} />
      </div>
    </div>
  );
}

// === Player Detail Dialog ===
function PlayerDetailDialog({ player, open, onClose, canBuy, isUserTeam, onBuy }: {
  player: any; open: boolean; onClose: () => void;
  canBuy: boolean; isUserTeam: boolean;
  onBuy: (listing: TransferListing) => void;
}) {
  if (!player) return null;

  const avgRating = player.seasonRatings?.length > 0
    ? (player.seasonRatings.reduce((a: number, b: number) => a + b, 0) / player.seasonRatings.length)
    : null;

  const listing = player.listing as TransferListing | null;
  const loan = player.loan as LoanListing | null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${posColors[player.position]}`}>{player.position}</span>
            {player.name}
          </DialogTitle>
        </DialogHeader>

        {/* Basic Info */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted/30 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Posição</p>
            <p className="font-semibold">{posLabels[player.position] || player.position}</p>
          </div>
          <div className="bg-muted/30 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Idade</p>
            <p className="font-semibold">{player.age} anos</p>
          </div>
          <div className="bg-muted/30 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground">★ Média</p>
            <p className={`font-bold ${avgRating && avgRating >= 7 ? 'text-emerald-400' : avgRating && avgRating >= 5.5 ? 'text-primary' : 'text-muted-foreground'}`}>
              {avgRating ? avgRating.toFixed(1) : '—'}
            </p>
          </div>
        </div>

        {/* Career Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted/30 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Jogos</p>
            <p className="font-bold text-lg">{player.gamesPlayed ?? 0}</p>
          </div>
          <div className="bg-muted/30 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground">⚽ Gols</p>
            <p className="font-bold text-lg">{player.goals ?? 0}</p>
          </div>
          <div className="bg-muted/30 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground">🅰️ Assist.</p>
            <p className="font-bold text-lg">{player.assists ?? 0}</p>
          </div>
        </div>

        {/* Transfer Status */}
        {listing && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">À VENDA</span>
            </div>
            <p className="text-xs">Preço: <span className="font-bold text-emerald-400">R${(listing.asking_price / 1000).toFixed(0)}k</span></p>
            <p className="text-[10px] text-muted-foreground">OVR {listing.player_overall} • {listing.player_age} anos</p>
            {canBuy && (
              <Button size="sm" className="w-full mt-2 gap-1.5" onClick={() => onBuy(listing)}>
                <Send className="h-3.5 w-3.5" /> Fazer Proposta
              </Button>
            )}
          </div>
        )}

        {loan && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔄</span>
              <span className="text-xs font-bold text-blue-400">DISPONÍVEL PARA EMPRÉSTIMO</span>
            </div>
            <p className="text-xs mt-1">Salário: <span className="font-bold">R${(loan.salary / 1000).toFixed(0)}k/mês</span></p>
          </div>
        )}

        {!listing && !loan && !isUserTeam && (
          <p className="text-[10px] text-muted-foreground text-center py-2">Este jogador não está disponível para transferência.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// === Negotiation View ===
function NegotiationView({ listing, budget, clubName, onBack, onSuccess }: {
  listing: TransferListing; budget: number; clubName: string; onBack: () => void; onSuccess: () => void;
}) {
  const [offerSalary, setOfferSalary] = useState(listing.player_data?.salary || 500);
  const [offerYears, setOfferYears] = useState(2);
  const [signingBonus, setSigningBonus] = useState(0);
  const [bonusGoals, setBonusGoals] = useState(0);
  const [bonusAssists, setBonusAssists] = useState(0);
  const [bonusGames, setBonusGames] = useState(0);
  const [bonusTitles, setBonusTitles] = useState(0);
  const [loading, setLoading] = useState(false);

  const currentSalary = listing.player_data?.salary || 500;

  const makeOffer = async () => {
    if (budget < listing.asking_price) { toast.error('Orçamento insuficiente!'); return; }
    setLoading(true);
    const res = await supabase.functions.invoke('process-transfer', {
      body: {
        action: 'offer',
        listingId: listing.id,
        offeredPrice: listing.asking_price,
        offeredSalary: offerSalary,
        contractYears: offerYears,
        bonusGoals, bonusAssists, bonusGames, bonusTitles, signingBonus,
        clubName,
      },
    });
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao enviar proposta');
    } else {
      toast.success(`Proposta enviada para ${listing.player_name}!`);
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={onBack}>
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Perfil
      </Button>

      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Negociar — {listing.player_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Player header */}
          <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-3">
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[listing.player_position] || 'bg-muted'}`}>{listing.player_position}</span>
            <div>
              <p className="text-sm font-bold">{listing.player_name}</p>
              <p className="text-xs text-muted-foreground">{listing.player_age}a • OVR {listing.player_overall} • {listing.seller_club_name}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] text-muted-foreground">Preço</p>
              <p className="font-bold text-sm text-emerald-400">R${(listing.asking_price / 1000).toFixed(0)}k</p>
            </div>
          </div>

          {/* Price - fixed */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Valor da transferência (R$)</label>
            <p className="text-lg font-bold text-emerald-400 mt-1">R${(listing.asking_price / 1000).toFixed(0)}k</p>
            <p className="text-[9px] text-muted-foreground">Preço fixo baseado nos atributos do jogador</p>
          </div>

          {/* Salary */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">💰 Salário mensal (R$) — atual: R${currentSalary}</label>
            <Input type="number" value={offerSalary} onChange={e => setOfferSalary(Math.max(100, Number(e.target.value)))} className="h-9 text-xs mt-1" />
            {offerSalary < currentSalary && <p className="text-[10px] text-orange-400 mt-0.5">⚠️ Salário inferior ao atual — menor chance de aceite</p>}
          </div>

          {/* Contract */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">📄 Duração do contrato</label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map(y => (
                <Button key={y} size="sm" variant={offerYears === y ? 'default' : 'outline'} className="h-7 px-3 text-xs" onClick={() => setOfferYears(y)}>
                  {y} ano{y > 1 ? 's' : ''}
                </Button>
              ))}
            </div>
          </div>

          {/* Signing Bonus */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Gift className="h-3.5 w-3.5" /> Luvas (R$)</label>
            <Input type="number" value={signingBonus} onChange={e => setSigningBonus(Math.max(0, Number(e.target.value)))} className="h-9 text-xs mt-1" />
          </div>

          {/* Performance Bonuses */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">🎯 Bônus por desempenho (R$)</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">⚽ Por gol</label>
                <Input type="number" value={bonusGoals} onChange={e => setBonusGoals(Math.max(0, Number(e.target.value)))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">🅰️ Por assistência</label>
                <Input type="number" value={bonusAssists} onChange={e => setBonusAssists(Math.max(0, Number(e.target.value)))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">🏟️ Por jogo</label>
                <Input type="number" value={bonusGames} onChange={e => setBonusGames(Math.max(0, Number(e.target.value)))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">🏆 Por título</label>
                <Input type="number" value={bonusTitles} onChange={e => setBonusTitles(Math.max(0, Number(e.target.value)))} className="h-8 text-xs" />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-primary/10 rounded-lg p-3 text-xs">
            <p className="font-bold text-primary mb-1">📊 Resumo da proposta:</p>
            <p>💵 Valor: R${(listing.asking_price / 1000).toFixed(0)}k</p>
            <p>💰 Salário: R${offerSalary}/mês {offerSalary >= currentSalary ? '✅' : '⚠️'}</p>
            <p>📄 Contrato: {offerYears} ano{offerYears > 1 ? 's' : ''}</p>
            {signingBonus > 0 && <p>🎁 Luvas: R${(signingBonus / 1000).toFixed(0)}k</p>}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-10 text-xs" onClick={onBack}>Cancelar</Button>
            <Button className="flex-1 h-10 text-xs" onClick={makeOffer} disabled={loading || budget < listing.asking_price}>
              <Send className="h-3.5 w-3.5 mr-1.5" /> Enviar Proposta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
