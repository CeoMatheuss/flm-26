import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trophy, Calendar, Users, Swords, Target, ArrowLeft, Medal, TrendingUp, Shield, BarChart3, Eye } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  format: string;
  status: string;
  max_teams: number;
  prize_1st: number;
  prize_2nd: number;
  prize_3rd: number;
  start_date: string | null;
  match_time: string;
  country: string;
  description?: string;
  rules_text?: string;
  match_interval_hours?: number;
}

interface TournamentTeam {
  id: string;
  club_name: string;
  club_logo: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  played: number;
  group_letter: string | null;
  is_bot: boolean;
  bot_strength: number;
  bot_squad: any[];
  eliminated: boolean;
  user_id: string | null;
}

interface TournamentMatch {
  id: string;
  home_team_id: string;
  away_team_id: string;
  round: number;
  stage: string | null;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
  scheduled_at: string | null;
  match_data: any;
}

interface Props {
  onExpand?: (tournamentId: string) => void;
}

export function TournamentDashboardCard({ onExpand }: Props) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teamsMap, setTeamsMap] = useState<Record<string, TournamentTeam[]>>({});
  const [matchesMap, setMatchesMap] = useState<Record<string, TournamentMatch[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('custom_tournaments')
        .select('*')
        .in('status', ['in_progress', 'registration'])
        .order('created_at', { ascending: false })
        .limit(10);
      if (data && data.length > 0) {
        setTournaments(data as any);
        const ids = data.map(d => d.id);
        const [teamsRes, matchesRes] = await Promise.all([
          supabase.from('custom_tournament_teams').select('*').in('tournament_id', ids).order('points', { ascending: false }),
          supabase.from('custom_tournament_matches').select('*').in('tournament_id', ids).order('round', { ascending: true }),
        ]);
        const tMap: Record<string, TournamentTeam[]> = {};
        const mMap: Record<string, TournamentMatch[]> = {};
        ids.forEach(id => { tMap[id] = []; mMap[id] = []; });
        (teamsRes.data as any[] || []).forEach((t: any) => { if (tMap[t.tournament_id]) tMap[t.tournament_id].push(t); });
        (matchesRes.data as any[] || []).forEach((m: any) => { if (mMap[m.tournament_id]) mMap[m.tournament_id].push(m); });
        setTeamsMap(tMap);
        setMatchesMap(mMap);
      }
    };
    load();
  }, []);

  if (tournaments.length === 0) return null;

  const handleExpand = (id: string) => {
    if (onExpand) onExpand(id);
    else setExpandedId(id);
  };

  if (expandedId) {
    return <TournamentExpandedView tournamentId={expandedId} onClose={() => setExpandedId(null)} />;
  }

  const formatLabels: Record<string, string> = { league: 'Liga', knockout: 'Mata-mata', group_knockout: 'Grupos' };

  return (
    <Card className="game-card-accent">
      <CardHeader className="section-header pb-1 px-3 pt-3">
        <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5 text-primary" /> Campeonatos Ativos
          <Badge variant="outline" className="text-[8px] ml-auto">{tournaments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5">
        {tournaments.map(t => {
          const teams = teamsMap[t.id] || [];
          const matches = matchesMap[t.id] || [];
          const played = matches.filter(m => m.status === 'played').length;
          const sorted = [...teams].sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against));
          const leader = sorted[0];

          return (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-lg bg-accent/20 hover:bg-accent/40 px-2.5 py-2 transition-colors cursor-pointer"
              onClick={() => handleExpand(t.id)}
            >
              <Trophy className="h-3.5 w-3.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate">{t.name}</p>
                <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground">
                  <span>{formatLabels[t.format] || t.format}</span>
                  <span>•</span>
                  <span>{teams.length} times</span>
                  <span>•</span>
                  <span>{played}/{matches.length} jogos</span>
                  {leader && (
                    <>
                      <span>•</span>
                      <span className="text-primary font-bold">👑 {leader.club_name.slice(0, 10)}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={`text-[7px] shrink-0 ${t.status === 'in_progress' ? 'text-success border-success/30' : 'text-warning border-warning/30'}`}>
                {t.status === 'in_progress' ? '🟢 Ativo' : '📋 Registro'}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ── PHASE PRIZE LOGIC ───────────────────────────────────── */
function getPhasePrizes(prize1st: number, format: string) {
  if (format === 'knockout') {
    return {
      'Final': { win: prize1st, lose: Math.round(prize1st * 0.4) },
      'Semi': { win: Math.round(prize1st * 0.15), lose: Math.round(prize1st * 0.08) },
      'Quartas': { win: Math.round(prize1st * 0.08), lose: Math.round(prize1st * 0.04) },
      'Oitavas': { win: Math.round(prize1st * 0.04), lose: Math.round(prize1st * 0.02) },
    };
  }
  if (format === 'group_knockout') {
    return {
      'Final': { win: prize1st, lose: Math.round(prize1st * 0.35) },
      'Semi': { win: Math.round(prize1st * 0.12), lose: Math.round(prize1st * 0.06) },
      'Quartas': { win: Math.round(prize1st * 0.06), lose: Math.round(prize1st * 0.03) },
      'Fase de Grupos': { win: Math.round(prize1st * 0.02), lose: 0 },
    };
  }
  return {};
}

function formatMoney(v: number): string {
  if (v >= 1e6) return `R$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `R$${(v / 1e3).toFixed(0)}K`;
  return `R$${v}`;
}

/* ── EXPANDED FULL PAGE TOURNAMENT VIEW ─────────────────────── */

interface ExpandedProps {
  tournamentId: string;
  onClose: () => void;
}

export function TournamentExpandedView({ tournamentId, onClose }: ExpandedProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'groups' | 'calendar' | 'bracket' | 'stats'>('overview');
  const [viewingSquadTeam, setViewingSquadTeam] = useState<TournamentTeam | null>(null);

  useEffect(() => {
    const load = async () => {
      const [tRes, teamsRes, matchesRes] = await Promise.all([
        supabase.from('custom_tournaments').select('*').eq('id', tournamentId).single(),
        supabase.from('custom_tournament_teams').select('*').eq('tournament_id', tournamentId).order('points', { ascending: false }),
        supabase.from('custom_tournament_matches').select('*').eq('tournament_id', tournamentId).order('round', { ascending: true }),
      ]);
      if (tRes.data) setTournament(tRes.data as any);
      if (teamsRes.data) setTeams(teamsRes.data as any);
      if (matchesRes.data) setMatches(matchesRes.data as any);
    };
    load();
  }, [tournamentId]);

  if (!tournament) return null;

  const getTeamName = (id: string) => teams.find(t => t.id === id)?.club_name || '???';
  const getTeamLogo = (id: string) => teams.find(t => t.id === id)?.club_logo || '⚽';

  const groupLetters = [...new Set(teams.filter(t => t.group_letter).map(t => t.group_letter!))].sort();
  const hasGroups = groupLetters.length > 0;
  const isKnockout = tournament.format === 'knockout';
  const isGroupKnockout = tournament.format === 'group_knockout';
  const sortedTeams = [...teams].sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against));
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  const totalPlayed = matches.filter(m => m.status === 'played').length;
  const totalGoals = matches.filter(m => m.status === 'played').reduce((s, m) => s + (m.home_goals || 0) + (m.away_goals || 0), 0);
  const phasePrizes = getPhasePrizes(tournament.prize_1st, tournament.format);

  const formatLabels: Record<string, string> = {
    league: '🏟️ Liga',
    knockout: '⚔️ Mata-mata',
    group_knockout: '🏟️⚔️ Grupos + Mata-mata',
  };

  const tabs = [
    { key: 'overview' as const, label: 'Geral', icon: TrendingUp },
    { key: 'teams' as const, label: 'Times', icon: Users },
    ...(hasGroups ? [{ key: 'groups' as const, label: 'Grupos', icon: Target }] : []),
    { key: 'calendar' as const, label: 'Jogos', icon: Calendar },
    ...(isKnockout || isGroupKnockout ? [{ key: 'bracket' as const, label: 'Chave', icon: Swords }] : []),
    { key: 'stats' as const, label: 'Estatísticas', icon: BarChart3 },
  ];

  return (
    <div className="space-y-3 animate-fade-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onClose} className="h-8 px-2 text-xs gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm sm:text-base font-black flex items-center gap-2 truncate">
            <Trophy className="h-4 w-4 text-primary shrink-0" /> {tournament.name}
          </h2>
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <Badge variant="outline" className="text-[7px] text-primary border-primary/30">{formatLabels[tournament.format]}</Badge>
            <span>{tournament.country === 'Mundial' ? '🌍 Mundial' : `🏴 ${tournament.country}`}</span>
          </div>
        </div>
      </div>

      {/* Prize info */}
      <div className="rounded-xl border border-primary/20 overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))' }}>
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-xs font-black">🏆 {tournament.name}</p>
              <p className="text-[9px] text-muted-foreground">{tournament.description || 'Campeonato oficial do FLM 26'}</p>
            </div>
          </div>
          {tournament.rules_text && (
            <div className="rounded-lg p-2 text-[9px] leading-relaxed border border-border/20" style={{ background: 'hsl(var(--card))' }}>
              📋 <span className="font-bold">Regras:</span> {tournament.rules_text}
            </div>
          )}

          {/* Phase prizes for knockout formats */}
          {(isKnockout || isGroupKnockout) && Object.keys(phasePrizes).length > 0 ? (
            <div className="space-y-1">
              <p className="text-[8px] font-bold text-muted-foreground uppercase">💰 Premiação por Fase</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(phasePrizes).map(([phase, prizes]) => (
                  <div key={phase} className="rounded-lg p-1.5 border border-border/20" style={{ background: 'hsl(var(--card))' }}>
                    <p className="text-[8px] font-bold text-primary">{phase}</p>
                    <p className="text-[8px]">✅ Vitória: <span className="font-bold text-success">{formatMoney(prizes.win)}</span></p>
                    {prizes.lose > 0 && <p className="text-[8px]">❌ Derrota: <span className="text-muted-foreground">{formatMoney(prizes.lose)}</span></p>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-lg p-1.5" style={{ background: 'hsl(var(--card))' }}>
                <p className="text-[8px] text-muted-foreground">🥇 1º</p>
                <p className="text-[10px] font-bold text-success">{formatMoney(tournament.prize_1st)}</p>
              </div>
              <div className="rounded-lg p-1.5" style={{ background: 'hsl(var(--card))' }}>
                <p className="text-[8px] text-muted-foreground">🥈 2º</p>
                <p className="text-[10px] font-bold text-primary">{formatMoney(tournament.prize_2nd)}</p>
              </div>
              <div className="rounded-lg p-1.5" style={{ background: 'hsl(var(--card))' }}>
                <p className="text-[8px] text-muted-foreground">🥉 3º</p>
                <p className="text-[10px] font-bold text-warning">{formatMoney(tournament.prize_3rd)}</p>
              </div>
            </div>
          )}

          {tournament.start_date && (
            <p className="text-[9px] text-muted-foreground text-center">
              📅 Início: {new Date(tournament.start_date).toLocaleDateString('pt-BR')} • ⏰ {tournament.match_time || '20:00'} • 🔄 {tournament.match_interval_hours}h entre jogos
            </p>
          )}
        </div>
      </div>

      {/* Stats banner */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: 'Times', value: teams.length, icon: '👥' },
          { label: 'Jogos', value: `${totalPlayed}/${matches.length}`, icon: '⚽' },
          { label: 'Gols', value: totalGoals, icon: '🎯' },
          { label: 'Líder', value: sortedTeams[0]?.club_name?.slice(0, 8) || '-', icon: '👑' },
        ].map((s, i) => (
          <div key={i} className="stat-card text-center">
            <p className="text-[7px] text-muted-foreground">{s.icon} {s.label}</p>
            <p className="text-[10px] sm:text-xs font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-muted/30 rounded-lg p-0.5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-0 h-7 rounded-md text-[8px] sm:text-[9px] font-semibold flex items-center justify-center gap-0.5 transition-all whitespace-nowrap ${
              activeTab === tab.key ? 'bg-primary/15 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3 w-3 shrink-0" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <ScrollArea className="max-h-[60vh]">
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* For league format show standings, for knockout show bracket summary */}
            {!isKnockout && (
              <Card className="game-card">
                <CardHeader className="section-header pb-1 px-3 pt-2">
                  <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Classificação Geral
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2">
                  <table className="w-full text-[9px]">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border/30">
                        <th className="text-left pl-1 py-1">#</th>
                        <th className="text-left py-1">Time</th>
                        <th className="text-center py-1 w-5">J</th>
                        <th className="text-center py-1 w-5">V</th>
                        <th className="text-center py-1 w-5">E</th>
                        <th className="text-center py-1 w-5">D</th>
                        <th className="text-center py-1 w-5">GP</th>
                        <th className="text-center py-1 w-5">GC</th>
                        <th className="text-center py-1 w-6 font-bold">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map((t, i) => (
                        <tr key={t.id} className={`border-b border-border/10 ${i < 3 ? 'bg-primary/5' : ''} ${t.eliminated ? 'opacity-40' : ''}`}>
                          <td className="pl-1 py-1 font-bold text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                          <td className="py-1 truncate max-w-[100px]">
                            {t.club_logo} <span className={`font-medium ${i < 3 ? 'text-primary' : ''}`}>{t.club_name}</span>
                            {t.is_bot && <span className="ml-0.5 text-[7px] text-muted-foreground">🤖</span>}
                          </td>
                          <td className="text-center py-1">{t.played}</td>
                          <td className="text-center py-1 text-success">{t.wins}</td>
                          <td className="text-center py-1">{t.draws}</td>
                          <td className="text-center py-1 text-destructive">{t.losses}</td>
                          <td className="text-center py-1">{t.goals_for}</td>
                          <td className="text-center py-1">{t.goals_against}</td>
                          <td className="text-center py-1 font-black text-primary">{t.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* For knockout, show elimination status */}
            {isKnockout && (
              <Card className="game-card">
                <CardContent className="p-3 space-y-1">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase mb-2">⚔️ Status dos Times</p>
                  {sortedTeams.map((t) => (
                    <div key={t.id} className={`flex items-center gap-2 text-[10px] py-1 px-2 rounded ${t.eliminated ? 'opacity-40 line-through' : 'bg-accent/10'}`}>
                      <span>{t.club_logo}</span>
                      <span className="flex-1 font-medium truncate">{t.club_name}</span>
                      {t.is_bot && <Badge variant="outline" className="text-[6px] px-1 py-0 h-3">🤖</Badge>}
                      <span className="text-[8px]">{t.eliminated ? '❌ Eliminado' : `✅ ${t.wins}V ${t.losses}D`}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Top Attack / Defense */}
            <div className="grid grid-cols-2 gap-2">
              <Card className="game-card">
                <CardContent className="p-2.5 space-y-1">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">⚽ Melhor Ataque</p>
                  {[...teams].sort((a, b) => b.goals_for - a.goals_for).slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-[9px] py-0.5">
                      <span className="truncate flex-1">{t.club_logo} {t.club_name}</span>
                      <span className="font-bold text-success ml-1">{t.goals_for}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="game-card">
                <CardContent className="p-2.5 space-y-1">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">🛡️ Melhor Defesa</p>
                  {[...teams].filter(t => t.played > 0).sort((a, b) => a.goals_against - b.goals_against).slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-[9px] py-0.5">
                      <span className="truncate flex-1">{t.club_logo} {t.club_name}</span>
                      <span className="font-bold text-primary ml-1">{t.goals_against}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <Card className="game-card">
            <CardHeader className="section-header pb-1 px-3 pt-2">
              <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> Todos os Times ({teams.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <ScrollArea className="max-h-[50vh]">
                <div className="space-y-0.5">
                  {sortedTeams.map((t, i) => (
                    <div key={t.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] ${i < 3 ? 'bg-primary/5' : i % 2 === 0 ? 'bg-accent/10' : ''}`}>
                      <span className="w-5 text-center font-bold text-muted-foreground">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</span>
                      <span className="text-sm">{t.club_logo}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold truncate ${i < 3 ? 'text-primary' : ''}`}>{t.club_name}</p>
                        <p className="text-[8px] text-muted-foreground">
                          {t.played}J • {t.wins}V {t.draws}E {t.losses}D • {t.goals_for}GP {t.goals_against}GC
                        </p>
                      </div>
                      {!isKnockout && (
                        <div className="text-right shrink-0">
                          <p className="font-black text-primary text-xs">{t.points}</p>
                          <p className="text-[7px] text-muted-foreground">pts</p>
                        </div>
                      )}
                      {t.is_bot && (
                        <Button size="sm" variant="ghost" className="h-5 px-1 text-[7px]" onClick={(e) => { e.stopPropagation(); setViewingSquadTeam(t); }}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      {t.is_bot && <Badge variant="outline" className="text-[6px] px-1 py-0 h-3">🤖</Badge>}
                      {t.group_letter && <Badge variant="secondary" className="text-[6px] px-1 py-0 h-3">G{t.group_letter}</Badge>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {activeTab === 'groups' && (
          <div className="space-y-2">
            {groupLetters.map(letter => {
              const groupTeams = teams
                .filter(t => t.group_letter === letter)
                .sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against));
              return (
                <Card key={letter} className="game-card-accent">
                  <CardHeader className="pb-1 px-3 pt-2">
                    <CardTitle className="text-xs font-bold flex items-center gap-1">
                      <Target className="h-3 w-3 text-primary" /> Grupo {letter}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-2">
                    <table className="w-full text-[9px]">
                      <thead>
                        <tr className="text-muted-foreground border-b border-border/20">
                          <th className="text-left pl-1 py-0.5">#</th>
                          <th className="text-left py-0.5">Time</th>
                          <th className="text-center py-0.5">J</th>
                          <th className="text-center py-0.5">V</th>
                          <th className="text-center py-0.5">E</th>
                          <th className="text-center py-0.5">D</th>
                          <th className="text-center py-0.5">GP</th>
                          <th className="text-center py-0.5">GC</th>
                          <th className="text-center py-0.5 font-bold">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupTeams.map((t, i) => (
                          <tr key={t.id} className={`${i < 2 ? 'bg-primary/5' : ''} border-t border-border/10`}>
                            <td className="pl-1 py-1 font-bold">{i + 1}</td>
                            <td className="py-1 truncate max-w-[80px] font-medium">{t.club_logo} {t.club_name}</td>
                            <td className="text-center py-1">{t.played}</td>
                            <td className="text-center py-1 text-success">{t.wins}</td>
                            <td className="text-center py-1">{t.draws}</td>
                            <td className="text-center py-1 text-destructive">{t.losses}</td>
                            <td className="text-center py-1">{t.goals_for}</td>
                            <td className="text-center py-1">{t.goals_against}</td>
                            <td className="text-center py-1 font-bold text-primary">{t.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-2">
            {rounds.map(round => {
              const roundMatches = matches.filter(m => m.round === round);
              const stageName = roundMatches[0]?.stage || `Rodada ${round}`;
              const played = roundMatches.filter(m => m.status === 'played').length;
              return (
                <Card key={round} className="game-card">
                  <CardHeader className="pb-1 px-3 pt-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[10px] font-bold flex items-center gap-1 text-muted-foreground uppercase tracking-wider">
                        <Calendar className="h-3 w-3" /> {stageName}
                      </CardTitle>
                      <Badge variant="outline" className={`text-[7px] ${played === roundMatches.length ? 'text-success border-success/30' : 'text-muted-foreground'}`}>
                        {played}/{roundMatches.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-2 pb-2 space-y-0.5">
                    {roundMatches.map(match => (
                      <div key={match.id} className={`flex items-center justify-between p-1.5 rounded-lg border text-[9px] transition-colors ${match.status === 'played' ? 'border-success/15 bg-success/5' : 'border-border/20 hover:bg-accent/20'}`}>
                        <span className="font-medium truncate max-w-[80px]">{getTeamLogo(match.home_team_id)} {getTeamName(match.home_team_id)}</span>
                        <span className={`font-bold px-2 ${match.status === 'played' ? 'text-primary' : 'text-muted-foreground'}`}>
                          {match.status === 'played' ? `${match.home_goals} - ${match.away_goals}` : 'vs'}
                        </span>
                        <span className="font-medium truncate max-w-[80px] text-right">{getTeamName(match.away_team_id)} {getTeamLogo(match.away_team_id)}</span>
                        {match.scheduled_at && (
                          <span className="text-[7px] text-muted-foreground ml-1 shrink-0">
                            {new Date(match.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'bracket' && (
          <div className="space-y-2">
            <Card className="game-card">
              <CardContent className="p-3">
                <p className="text-[9px] text-muted-foreground text-center mb-2">⚔️ Chaveamento Mata-Mata</p>
                {rounds.map(round => {
                  const roundMatches = matches.filter(m => m.round === round);
                  const stageName = roundMatches[0]?.stage || `Rodada ${round}`;
                  const prize = phasePrizes[stageName as keyof typeof phasePrizes];
                  return (
                    <div key={round} className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[8px] font-bold text-primary uppercase">{stageName}</p>
                        {prize && <span className="text-[7px] text-success">✅ {formatMoney(prize.win)}</span>}
                      </div>
                      <div className="space-y-1">
                        {roundMatches.map(m => (
                          <div key={m.id} className={`border rounded-lg overflow-hidden ${m.status === 'played' ? 'border-success/20' : 'border-border/30'}`}>
                            <div className={`flex items-center justify-between px-2 py-1.5 text-[9px] ${m.status === 'played' && m.home_goals !== null && m.away_goals !== null && m.home_goals > m.away_goals ? 'bg-primary/8 font-bold' : ''}`}>
                              <span className="truncate max-w-[100px]">{getTeamLogo(m.home_team_id)} {getTeamName(m.home_team_id)}</span>
                              <span className="font-bold">{m.status === 'played' ? m.home_goals : '-'}</span>
                            </div>
                            <div className="border-t border-border/20" />
                            <div className={`flex items-center justify-between px-2 py-1.5 text-[9px] ${m.status === 'played' && m.home_goals !== null && m.away_goals !== null && m.away_goals > m.home_goals ? 'bg-primary/8 font-bold' : ''}`}>
                              <span className="truncate max-w-[100px]">{getTeamLogo(m.away_team_id)} {getTeamName(m.away_team_id)}</span>
                              <span className="font-bold">{m.status === 'played' ? m.away_goals : '-'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'stats' && <TournamentStatsTab teams={teams} matches={matches} getTeamName={getTeamName} getTeamLogo={getTeamLogo} />}
      </ScrollArea>

      {/* Bot Squad Viewer Dialog */}
      <Dialog open={!!viewingSquadTeam} onOpenChange={() => setViewingSquadTeam(null)}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              {viewingSquadTeam?.club_logo} {viewingSquadTeam?.club_name} — Elenco
              <Badge variant="outline" className="text-[7px]">🤖 OVR {viewingSquadTeam?.bot_strength}</Badge>
            </DialogTitle>
          </DialogHeader>
          {viewingSquadTeam && (
            <BotSquadView squad={viewingSquadTeam.bot_squad} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── BOT SQUAD VIEWER ─────────────────────────────────── */
function BotSquadView({ squad }: { squad: any[] }) {
  const players = Array.isArray(squad) ? squad : [];
  if (players.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">Elenco não disponível para este time.</p>;

  const posOrder: Record<string, number> = { GOL: 0, ZAG: 1, LAT: 2, VOL: 3, MEI: 4, ATA: 5 };
  const sorted = [...players].sort((a, b) => (posOrder[a.position] ?? 9) - (posOrder[b.position] ?? 9));
  const posColors: Record<string, string> = {
    GOL: 'text-warning border-warning/30',
    ZAG: 'text-primary border-primary/30',
    LAT: 'text-primary border-primary/30',
    VOL: 'text-success border-success/30',
    MEI: 'text-success border-success/30',
    ATA: 'text-destructive border-destructive/30',
  };

  return (
    <div className="space-y-0.5">
      {sorted.map((p, i) => (
        <div key={p.id || i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] bg-accent/10">
          <Badge variant="outline" className={`text-[7px] px-1 py-0 h-4 w-8 justify-center ${posColors[p.position] || 'text-muted-foreground'}`}>
            {p.position}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{p.name}</p>
            <p className="text-[8px] text-muted-foreground">{p.age} anos • Stamina: {p.stamina}%</p>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-primary/30 bg-primary/10">
            {p.overall}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── TOURNAMENT STATISTICS TAB ───────────────────────── */
interface StatsTabProps {
  teams: TournamentTeam[];
  matches: TournamentMatch[];
  getTeamName: (id: string) => string;
  getTeamLogo: (id: string) => string;
}

function TournamentStatsTab({ teams, matches, getTeamName, getTeamLogo }: StatsTabProps) {
  const [statsView, setStatsView] = useState<'goals' | 'assists' | 'ratings'>('goals');
  const playedMatches = matches.filter(m => m.status === 'played');

  const playerStats = useMemo(() => {
    const stats: Record<string, { name: string; teamId: string; goals: number; assists: number; ratings: number[]; matches: number }> = {};

    for (const match of playedMatches) {
      const data = match.match_data as any;
      if (!data) continue;

      const goalScorers = data.goal_scorers || data.goalScorers || [];
      for (const gs of goalScorers) {
        const teamId = gs.team === 'home' ? match.home_team_id : match.away_team_id;
        const key = `${gs.name}_${teamId}`;
        if (!stats[key]) stats[key] = { name: gs.name, teamId, goals: 0, assists: 0, ratings: [], matches: 0 };
        stats[key].goals += 1;
        if (gs.assist) {
          const aKey = `${gs.assist}_${teamId}`;
          if (!stats[aKey]) stats[aKey] = { name: gs.assist, teamId, goals: 0, assists: 0, ratings: [], matches: 0 };
          stats[aKey].assists += 1;
        }
      }

      const ratings = data.player_ratings || data.playerRatings || {};
      const homePlayers = data.home_players || data.homePlayers || [];
      for (const [playerId, rating] of Object.entries(ratings)) {
        const player = homePlayers.find((p: any) => p.id === playerId);
        if (player) {
          const key = `${player.name}_${match.home_team_id}`;
          if (!stats[key]) stats[key] = { name: player.name, teamId: match.home_team_id, goals: 0, assists: 0, ratings: [], matches: 0 };
          stats[key].ratings.push(Number(rating));
          stats[key].matches += 1;
        }
      }
    }

    return Object.values(stats);
  }, [playedMatches]);

  const topScorers = [...playerStats].sort((a, b) => b.goals - a.goals).filter(p => p.goals > 0).slice(0, 15);
  const topAssisters = [...playerStats].sort((a, b) => b.assists - a.assists).filter(p => p.assists > 0).slice(0, 15);
  const topRated = [...playerStats].filter(p => p.ratings.length > 0).map(p => ({ ...p, avgRating: p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length })).sort((a, b) => b.avgRating - a.avgRating).slice(0, 15);

  if (playedMatches.length === 0) {
    return (
      <Card className="game-card">
        <CardContent className="p-4 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">As estatísticas aparecerão após os jogos serem realizados.</p>
        </CardContent>
      </Card>
    );
  }

  const renderList = (items: typeof topScorers, valueKey: 'goals' | 'assists', color: string) => (
    items.length === 0 ? (
      <p className="text-[9px] text-muted-foreground text-center py-3">Nenhum dado registrado ainda.</p>
    ) : (
      <div className="space-y-0.5">
        {items.map((p, i) => (
          <div key={`${valueKey}_${i}`} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[9px] ${i === 0 ? 'bg-primary/10' : i % 2 === 0 ? 'bg-accent/10' : ''}`}>
            <span className={`w-5 text-center font-bold ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
            <span className="text-sm">{getTeamLogo(p.teamId)}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{p.name}</p>
              <p className="text-[7px] text-muted-foreground truncate">{getTeamName(p.teamId)}</p>
            </div>
            <span className={`font-black text-sm ${color}`}>{p[valueKey]}</span>
          </div>
        ))}
      </div>
    )
  );

  const renderRatings = () => (
    topRated.length === 0 ? (
      <p className="text-[9px] text-muted-foreground text-center py-3">Nenhuma nota registrada ainda.</p>
    ) : (
      <div className="space-y-0.5">
        {topRated.map((p, i) => (
          <div key={`r_${i}`} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[9px] ${i === 0 ? 'bg-primary/10' : i % 2 === 0 ? 'bg-accent/10' : ''}`}>
            <span className={`w-5 text-center font-bold ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
            <span className="text-sm">{getTeamLogo(p.teamId)}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{p.name}</p>
              <p className="text-[7px] text-muted-foreground">{getTeamName(p.teamId)} • {p.matches}j</p>
            </div>
            <span className="font-black text-sm text-warning">{p.avgRating.toFixed(1)}</span>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="space-y-3">
      {/* 3 Toggle Buttons */}
      <div className="grid grid-cols-3 gap-1 bg-muted/30 rounded-lg p-0.5">
        <button
          onClick={() => setStatsView('goals')}
          className={`h-8 rounded-md text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${statsView === 'goals' ? 'bg-primary/15 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          ⚽ Gols ({topScorers.length})
        </button>
        <button
          onClick={() => setStatsView('assists')}
          className={`h-8 rounded-md text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${statsView === 'assists' ? 'bg-success/15 text-success shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          🎯 Assist. ({topAssisters.length})
        </button>
        <button
          onClick={() => setStatsView('ratings')}
          className={`h-8 rounded-md text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${statsView === 'ratings' ? 'bg-warning/15 text-warning shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          ⭐ Notas ({topRated.length})
        </button>
      </div>

      {/* Active stats view */}
      <Card className="game-card">
        <CardHeader className="section-header pb-1 px-3 pt-2">
          <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            {statsView === 'goals' ? '⚽ Artilheiros' : statsView === 'assists' ? '🎯 Garçons' : '⭐ Melhores Notas'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          {statsView === 'goals' && renderList(topScorers, 'goals', 'text-primary')}
          {statsView === 'assists' && renderList(topAssisters, 'assists', 'text-success')}
          {statsView === 'ratings' && renderRatings()}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="game-card">
        <CardContent className="p-2.5">
          <div className="grid grid-cols-2 gap-2 text-[9px]">
            <div className="space-y-1">
              <p>⚽ Total de gols: <span className="font-bold">{playedMatches.reduce((s, m) => s + (m.home_goals || 0) + (m.away_goals || 0), 0)}</span></p>
              <p>📊 Média/jogo: <span className="font-bold">{playedMatches.length > 0 ? (playedMatches.reduce((s, m) => s + (m.home_goals || 0) + (m.away_goals || 0), 0) / playedMatches.length).toFixed(1) : '0'}</span></p>
            </div>
            <div className="space-y-1">
              <p>🏟️ Jogos: <span className="font-bold">{playedMatches.length}/{matches.length}</span></p>
              <p>🤝 Empates: <span className="font-bold">{playedMatches.filter(m => m.home_goals === m.away_goals).length}</span></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
