import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Trophy, Plus, Users, Bot, Swords, Calendar, Clock, Award, Trash2,
  RefreshCw, ChevronRight, Play, CheckCircle, XCircle, Zap, Target, Globe
} from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  description: string;
  format: string;
  status: string;
  max_teams: number;
  total_rounds: number;
  current_round: number;
  prize_1st: number;
  prize_2nd: number;
  prize_3rd: number;
  match_duration_seconds: number;
  match_interval_hours: number;
  start_date: string | null;
  match_time: string;
  country: string;
  season: number;
  rules_text: string;
  created_at: string;
}

interface TournamentTeam {
  id: string;
  tournament_id: string;
  user_id: string | null;
  is_bot: boolean;
  bot_name: string;
  bot_strength: number;
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
  eliminated: boolean;
}

interface TournamentMatch {
  id: string;
  tournament_id: string;
  home_team_id: string;
  away_team_id: string;
  round: number;
  stage: string | null;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
  scheduled_at: string | null;
  played_at: string | null;
}

interface Props {
  userId: string;
}

// Bot name pools per country
const BOT_NAMES_BY_COUNTRY: Record<string, string[]> = {
  'Brasil': [
    'Atlético Mineiro', 'Bahia', 'Botafogo', 'Ceará', 'Chapecoense',
    'Corinthians', 'Coritiba', 'Criciúma', 'Cruzeiro', 'Cuiabá',
    'Flamengo', 'Fluminense', 'Fortaleza', 'Goiás', 'Grêmio',
    'Internacional', 'Juventude', 'Mirassol', 'Náutico', 'Palmeiras',
    'Ponte Preta', 'Red Bull Bragantino', 'Santos', 'São Paulo',
    'Sport', 'Vasco da Gama', 'Vitória', 'América-MG', 'Avaí',
    'Guarani', 'Londrina', 'Operário-PR', 'Paysandu', 'Remo',
    'Sampaio Corrêa', 'Vila Nova', 'ABC', 'CRB', 'CSA', 'Tombense',
  ],
  'Argentina': [
    'Boca Juniors', 'River Plate', 'Racing', 'Independiente', 'San Lorenzo',
    'Estudiantes', 'Vélez Sarsfield', 'Lanús', 'Defensa y Justicia', 'Talleres',
    'Banfield', 'Argentinos Juniors', 'Huracán', 'Newell\'s', 'Rosario Central',
    'Colón', 'Unión', 'Gimnasia', 'Godoy Cruz', 'Tigre',
  ],
  'Espanha': [
    'Real Madrid', 'Barcelona', 'Atlético Madrid', 'Sevilla', 'Real Sociedad',
    'Real Betis', 'Villarreal', 'Athletic Bilbao', 'Valencia', 'Celta de Vigo',
    'Espanyol', 'Osasuna', 'Getafe', 'Mallorca', 'Alavés',
    'Girona', 'Las Palmas', 'Rayo Vallecano', 'Cádiz', 'Granada',
  ],
  'Inglaterra': [
    'Manchester City', 'Liverpool', 'Arsenal', 'Chelsea', 'Manchester United',
    'Tottenham', 'Newcastle', 'Aston Villa', 'West Ham', 'Brighton',
    'Crystal Palace', 'Brentford', 'Wolves', 'Fulham', 'Everton',
    'Bournemouth', 'Nottingham Forest', 'Burnley', 'Luton Town', 'Sheffield United',
  ],
  'Itália': [
    'Juventus', 'Inter Milan', 'Milan', 'Napoli', 'Roma',
    'Lazio', 'Atalanta', 'Fiorentina', 'Torino', 'Bologna',
    'Udinese', 'Sassuolo', 'Monza', 'Empoli', 'Cagliari',
    'Lecce', 'Verona', 'Genoa', 'Salernitana', 'Frosinone',
  ],
  'Alemanha': [
    'Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen', 'Eintracht Frankfurt',
    'Union Berlin', 'Freiburg', 'Wolfsburg', 'Hoffenheim', 'Mainz 05',
    'Augsburg', 'Borussia Mönchengladbach', 'Werder Bremen', 'Stuttgart', 'Köln',
    'Bochum', 'Heidenheim', 'Darmstadt', 'St. Pauli', 'Hertha Berlin',
  ],
  'França': [
    'PSG', 'Marseille', 'Lyon', 'Monaco', 'Lille',
    'Nice', 'Lens', 'Rennes', 'Strasbourg', 'Nantes',
    'Montpellier', 'Toulouse', 'Reims', 'Brest', 'Lorient',
    'Le Havre', 'Metz', 'Clermont Foot', 'Auxerre', 'Angers',
  ],
  'Portugal': [
    'Benfica', 'Porto', 'Sporting', 'Braga', 'Vitória SC',
    'Boavista', 'Gil Vicente', 'Rio Ave', 'Arouca', 'Famalicão',
    'Estoril Praia', 'Casa Pia', 'Moreirense', 'Chaves', 'Portimonense',
    'Vizela', 'Santa Clara', 'Farense', 'Estrela Amadora', 'Nacional',
  ],
  'México': [
    'Club América', 'Guadalajara', 'Cruz Azul', 'Monterrey', 'Tigres UANL',
    'Pumas UNAM', 'Santos Laguna', 'León', 'Toluca', 'Pachuca',
    'Atlas', 'Necaxa', 'Puebla', 'Querétaro', 'San Luis',
    'Juárez', 'Mazatlán', 'Tijuana', 'FC Juárez', 'Tampico Madero',
  ],
  'Colômbia': [
    'Atlético Nacional', 'Millonarios', 'Junior', 'América de Cali', 'Deportivo Cali',
    'Santa Fe', 'Once Caldas', 'Tolima', 'Medellín', 'Bucaramanga',
    'Pereira', 'Pasto', 'La Equidad', 'Envigado', 'Águilas Doradas',
    'Jaguares', 'Alianza Petrolera', 'Boyacá Chicó', 'Patriotas', 'Rionegro',
  ],
  'Chile': [
    'Colo-Colo', 'Universidad de Chile', 'Universidad Católica', 'Cobreloa', 'Huachipato',
    'O\'Higgins', 'Unión Española', 'Audax Italiano', 'Palestino', 'Everton de Viña',
    'Cobresal', 'Curicó Unido', 'Ñublense', 'La Calera', 'La Serena',
    'Santiago Wanderers', 'Magallanes', 'Deportes Temuco', 'Rangers', 'Antofagasta',
  ],
  'Uruguai': [
    'Peñarol', 'Nacional', 'Defensor Sporting', 'Danubio', 'Cerro',
    'River Plate (URU)', 'Liverpool (URU)', 'Wanderers', 'Fénix', 'Racing (URU)',
    'Rentistas', 'Plaza Colonia', 'Boston River', 'Cerro Largo', 'Progreso',
    'Sud América', 'Villa Española', 'Deportivo Maldonado', 'Torque', 'Albion',
  ],
};

// All countries available
const ALL_COUNTRIES = [
  'Brasil', 'Argentina', 'Colômbia', 'Chile', 'Uruguai',
  'Portugal', 'Espanha', 'Itália', 'França', 'Alemanha',
  'Inglaterra', 'México'
];

function getBotNamesForScope(scope: string): string[] {
  if (scope === 'Mundial') {
    return Object.values(BOT_NAMES_BY_COUNTRY).flat();
  }
  return BOT_NAMES_BY_COUNTRY[scope] || BOT_NAMES_BY_COUNTRY['Brasil'];
}

export function AdminTournamentTab({ userId }: Props) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formFormat, setFormFormat] = useState('league');
  const [formTotalRounds, setFormTotalRounds] = useState('1');
  const [formPrize1, setFormPrize1] = useState('5000000');
  const [formPrize2, setFormPrize2] = useState('2000000');
  const [formPrize3, setFormPrize3] = useState('1000000');
  const [formDuration, setFormDuration] = useState('720');
  const [formInterval, setFormInterval] = useState('24');
  const [formStartDate, setFormStartDate] = useState('');
  const [formMatchTime, setFormMatchTime] = useState('20:00');
  const [formCountry, setFormCountry] = useState('Brasil');
  const [formRules, setFormRules] = useState('');

  // Scope: country-based or world
  const [formScope, setFormScope] = useState<'country' | 'world'>('country');

  // Team source mode
  const [teamSource, setTeamSource] = useState<'online_only' | 'online_plus_bots' | 'bots_only'>('online_plus_bots');

  // Bot fill
  const [batchBotMinOvr, setBatchBotMinOvr] = useState('50');
  const [batchBotMaxOvr, setBatchBotMaxOvr] = useState('80');
  const [formMaxTeams, setFormMaxTeams] = useState('20');

  // Add single team state
  const [addTeamType, setAddTeamType] = useState<'bot' | 'player'>('bot');
  const [botName, setBotName] = useState('');
  const [botStrength, setBotStrength] = useState('60');
  const [playerUserId, setPlayerUserId] = useState('');
  const [playerClubName, setPlayerClubName] = useState('');
  const [availablePlayers, setAvailablePlayers] = useState<Array<{ user_id: string; display_name: string | null }>>([]);

  // View tabs
  const [detailTab, setDetailTab] = useState<'teams' | 'matches' | 'groups'>('teams');

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('custom_tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setTournaments(data as any);
    setLoading(false);
  }, []);

  const loadTeams = useCallback(async (tournamentId: string) => {
    const { data } = await supabase
      .from('custom_tournament_teams')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('points', { ascending: false });
    if (data) setTeams(data as any);
  }, []);

  const loadMatches = useCallback(async (tournamentId: string) => {
    const { data } = await supabase
      .from('custom_tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round', { ascending: true });
    if (data) setMatches(data as any);
  }, []);

  const loadPlayers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('user_id, display_name').limit(200);
    if (data) setAvailablePlayers(data);
  }, []);

  useEffect(() => {
    loadTournaments();
    loadPlayers();
  }, [loadTournaments, loadPlayers]);

  // ── FIXTURE GENERATION ──────────────────────────────────────
  const generateLeagueFixtures = (teamIds: string[], totalRounds: number, startDate: string, matchTime: string, intervalHours: number) => {
    const fixtures: Array<{ home_team_id: string; away_team_id: string; round: number; stage: string; scheduled_at: string }> = [];
    const n = teamIds.length;
    const ids = [...teamIds];
    if (n % 2 !== 0) ids.push('BYE');
    const total = ids.length;
    const roundsPerTurn = total - 1;
    let matchDay = 0;

    for (let turn = 0; turn < totalRounds; turn++) {
      const shuffled = [...ids];
      for (let round = 0; round < roundsPerTurn; round++) {
        for (let i = 0; i < total / 2; i++) {
          const home = shuffled[i];
          const away = shuffled[total - 1 - i];
          if (home === 'BYE' || away === 'BYE') continue;
          const h = turn % 2 === 0 ? home : away;
          const a = turn % 2 === 0 ? away : home;
          const date = new Date(startDate);
          date.setHours(...(matchTime.split(':').map(Number) as [number, number]));
          date.setTime(date.getTime() + matchDay * intervalHours * 3600000);
          fixtures.push({ home_team_id: h, away_team_id: a, round: turn * roundsPerTurn + round + 1, stage: 'league', scheduled_at: date.toISOString() });
        }
        matchDay++;
        const last = shuffled.pop()!;
        shuffled.splice(1, 0, last);
      }
    }
    return fixtures;
  };

  const generateKnockoutFixtures = (teamIds: string[], startDate: string, matchTime: string, intervalHours: number) => {
    const fixtures: Array<{ home_team_id: string; away_team_id: string; round: number; stage: string; scheduled_at: string }> = [];
    const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
    const totalRounds = Math.ceil(Math.log2(shuffled.length));
    const stageNames = ['Final', 'Semi', 'Quartas', 'Oitavas', 'R32', 'R64'];
    const firstRoundPairs = Math.floor(shuffled.length / 2);
    const stageName = stageNames[Math.min(totalRounds - 1, stageNames.length - 1)] || `R${shuffled.length}`;
    
    for (let i = 0; i < firstRoundPairs; i++) {
      const date = new Date(startDate);
      date.setHours(...(matchTime.split(':').map(Number) as [number, number]));
      date.setTime(date.getTime() + i * intervalHours * 3600000);
      fixtures.push({ home_team_id: shuffled[i * 2], away_team_id: shuffled[i * 2 + 1], round: 1, stage: stageName, scheduled_at: date.toISOString() });
    }
    return fixtures;
  };

  const generateGroupFixtures = (teamsByGroup: Record<string, string[]>, startDate: string, matchTime: string, intervalHours: number) => {
    const fixtures: Array<{ home_team_id: string; away_team_id: string; round: number; stage: string; scheduled_at: string }> = [];
    let matchDay = 0;

    for (const [groupLetter, ids] of Object.entries(teamsByGroup)) {
      const n = ids.length;
      const padded = [...ids];
      if (n % 2 !== 0) padded.push('BYE');
      const total = padded.length;
      const rounds = total - 1;

      for (let round = 0; round < rounds; round++) {
        for (let i = 0; i < total / 2; i++) {
          const home = padded[i];
          const away = padded[total - 1 - i];
          if (home === 'BYE' || away === 'BYE') continue;
          const date = new Date(startDate);
          date.setHours(...(matchTime.split(':').map(Number) as [number, number]));
          date.setTime(date.getTime() + matchDay * intervalHours * 3600000);
          fixtures.push({ home_team_id: home, away_team_id: away, round: round + 1, stage: `Grupo ${groupLetter}`, scheduled_at: date.toISOString() });
        }
        matchDay++;
      }
    }
    return fixtures;
  };

  const assignGroups = async (tournamentId: string, teamList: TournamentTeam[]): Promise<Record<string, string[]>> => {
    const shuffled = [...teamList].sort(() => Math.random() - 0.5);
    const groupCount = Math.max(2, Math.floor(shuffled.length / 4));
    const groups: Record<string, string[]> = {};
    const letters = 'ABCDEFGH';

    for (let i = 0; i < groupCount; i++) {
      groups[letters[i]] = [];
    }

    shuffled.forEach((team, idx) => {
      const groupIdx = idx % groupCount;
      groups[letters[groupIdx]].push(team.id);
    });

    for (const [letter, ids] of Object.entries(groups)) {
      for (const id of ids) {
        await supabase.from('custom_tournament_teams').update({ group_letter: letter } as any).eq('id', id);
      }
    }

    return groups;
  };

  // ── Fetch ALL existing teams from game_saves (even offline) filtered by country ──
  const fetchOnlineTeams = async (scope: string): Promise<Array<{ user_id: string; club_name: string; club_logo: string }>> => {
    // Get all game saves - these are all created teams regardless of online status
    const { data: saves } = await supabase.from('game_saves').select('user_id, club_data');
    if (!saves) return [];

    const result: Array<{ user_id: string; club_name: string; club_logo: string }> = [];

    for (const save of saves) {
      try {
        const clubData = save.club_data as any;
        if (!clubData) continue;
        const clubCountry = clubData?.country || 'Brasil';
        const clubName = clubData?.name || 'Clube';
        const clubLogo = clubData?.logo || '⚽';

        if (scope === 'Mundial' || clubCountry === scope) {
          result.push({ user_id: save.user_id, club_name: clubName, club_logo: clubLogo });
        }
      } catch { /* skip bad data */ }
    }

    return result;
  };

  // ── CREATE WITH AUTO-ENROLLMENT ──────────────────────────────
  const createTournament = async () => {
    if (!formName.trim()) return toast.error('Nome é obrigatório');
    const maxTeams = Math.max(4, Math.min(64, Number(formMaxTeams) || 20));
    const minOvr = Math.max(20, Math.min(99, Number(batchBotMinOvr) || 50));
    const maxOvr = Math.max(minOvr, Math.min(99, Number(batchBotMaxOvr) || 80));
    const startDateStr = formStartDate || new Date().toISOString().split('T')[0];
    const scope = formScope === 'world' ? 'Mundial' : formCountry;

    setLoading(true);

    // 1. Create tournament
    const { data: tournamentData, error } = await supabase.from('custom_tournaments').insert([{
      name: formName.trim(),
      description: formDesc.trim(),
      format: formFormat,
      max_teams: maxTeams,
      total_rounds: formFormat === 'knockout' ? 1 : Number(formTotalRounds) || 1,
      prize_1st: Number(formPrize1) || 0,
      prize_2nd: Number(formPrize2) || 0,
      prize_3rd: Number(formPrize3) || 0,
      match_duration_seconds: Number(formDuration) || 720,
      match_interval_hours: Number(formInterval) || 24,
      start_date: startDateStr,
      match_time: formMatchTime || '20:00',
      country: scope,
      rules_text: formRules.trim(),
      created_by: userId,
      status: 'in_progress',
    }]).select().single();

    if (error || !tournamentData) {
      toast.error('Erro: ' + (error?.message || 'Falha ao criar'));
      setLoading(false);
      return;
    }

    const tournament = tournamentData as any;
    const allTeamInserts: any[] = [];

    // 2. Enroll online players if applicable (deduplicate by user_id)
    if (teamSource !== 'bots_only') {
      const onlineTeams = await fetchOnlineTeams(scope);
      const enrollCount = Math.min(onlineTeams.length, maxTeams);
      const enrolledUserIds = new Set<string>();
      
      for (let i = 0; i < enrollCount; i++) {
        const uid = onlineTeams[i].user_id;
        if (enrolledUserIds.has(uid)) continue;
        enrolledUserIds.add(uid);
        allTeamInserts.push({
          tournament_id: tournament.id,
          is_bot: false,
          user_id: uid,
          club_name: onlineTeams[i].club_name,
          club_logo: onlineTeams[i].club_logo || '⚽',
          bot_name: '',
          bot_strength: 0,
        });
      }
    }

    // 3. Fill remaining slots with bots
    const slotsForBots = maxTeams - allTeamInserts.length;
    if (slotsForBots > 0 && teamSource !== 'online_only') {
      const botPool = getBotNamesForScope(scope);
      const usedNames = new Set(allTeamInserts.map(t => t.club_name));
      const availableNames = botPool.filter(n => !usedNames.has(n));
      
      // Shuffle available names
      const shuffledNames = [...availableNames].sort(() => Math.random() - 0.5);

      for (let i = 0; i < slotsForBots; i++) {
        let name = shuffledNames[i % shuffledNames.length];
        if (!name || usedNames.has(name)) name = `Bot FC ${i + 1}`;
        usedNames.add(name);
        const ovr = Math.floor(Math.random() * (maxOvr - minOvr + 1)) + minOvr;
        allTeamInserts.push({
          tournament_id: tournament.id,
          is_bot: true,
          bot_name: name,
          bot_strength: ovr,
          club_name: name,
          club_logo: '🤖',
          user_id: null,
        });
      }
    }

    // Insert all teams in batches
    if (allTeamInserts.length > 0) {
      for (let i = 0; i < allTeamInserts.length; i += 50) {
        const batch = allTeamInserts.slice(i, i + 50);
        const { error: teamErr } = await supabase.from('custom_tournament_teams').insert(batch);
        if (teamErr) {
          toast.error('Erro ao criar times: ' + teamErr.message);
          setLoading(false);
          return;
        }
      }
    }

    // 4. Load created teams
    const { data: createdTeams } = await supabase
      .from('custom_tournament_teams')
      .select('*')
      .eq('tournament_id', tournament.id);

    if (!createdTeams || createdTeams.length < 2) {
      toast.success('🏆 Campeonato criado! Adicione mais times para gerar jogos.');
      setShowCreate(false);
      loadTournaments();
      setLoading(false);
      return;
    }

    const teamList = createdTeams as any as TournamentTeam[];
    const onlineCount = teamList.filter(t => !t.is_bot).length;
    const botCount = teamList.filter(t => t.is_bot).length;

    // 5. Generate fixtures
    let fixtures: Array<{ home_team_id: string; away_team_id: string; round: number; stage: string; scheduled_at: string }> = [];

    if (formFormat === 'league') {
      fixtures = generateLeagueFixtures(teamList.map(t => t.id), Number(formTotalRounds) || 1, startDateStr, formMatchTime, Number(formInterval) || 24);
    } else if (formFormat === 'knockout') {
      fixtures = generateKnockoutFixtures(teamList.map(t => t.id), startDateStr, formMatchTime, Number(formInterval) || 24);
    } else if (formFormat === 'group_knockout') {
      const groups = await assignGroups(tournament.id, teamList);
      fixtures = generateGroupFixtures(groups, startDateStr, formMatchTime, Number(formInterval) || 24);
    }

    // 6. Insert fixtures
    if (fixtures.length > 0) {
      for (let i = 0; i < fixtures.length; i += 50) {
        const batch = fixtures.slice(i, i + 50).map(f => ({
          tournament_id: tournament.id,
          home_team_id: f.home_team_id,
          away_team_id: f.away_team_id,
          round: f.round,
          stage: f.stage,
          scheduled_at: f.scheduled_at,
          status: 'scheduled',
        }));
        await supabase.from('custom_tournament_matches').insert(batch);
      }
    }

    const maxRound = fixtures.length > 0 ? Math.max(...fixtures.map(f => f.round)) : 1;
    await supabase.from('custom_tournaments').update({ total_rounds: maxRound } as any).eq('id', tournament.id);

    toast.success(`🏆 Campeonato "${formName}" criado! ${onlineCount} online + ${botCount} bots = ${teamList.length} times, ${fixtures.length} jogos!`);
    setShowCreate(false);
    setFormName(''); setFormDesc(''); setFormRules('');
    loadTournaments();
    setLoading(false);
  };

  const addTeam = async () => {
    if (!selectedTournament) return;
    if (teams.length >= selectedTournament.max_teams) return toast.error('Limite de times atingido!');
    setLoading(true);
    if (addTeamType === 'bot') {
      if (!botName.trim()) { setLoading(false); return toast.error('Nome do time bot é obrigatório'); }
      const strength = Math.max(20, Math.min(99, Number(botStrength) || 60));
      const { error } = await supabase.from('custom_tournament_teams').insert([{
        tournament_id: selectedTournament.id, is_bot: true, bot_name: botName.trim(), bot_strength: strength,
        club_name: botName.trim(), club_logo: '🤖', user_id: null,
      }]);
      if (error) toast.error('Erro: ' + error.message);
      else { toast.success(`🤖 Bot "${botName}" (OVR ${strength}) adicionado!`); setBotName(''); }
    } else {
      if (!playerUserId.trim()) { setLoading(false); return toast.error('ID do jogador é obrigatório'); }
      const { error } = await supabase.from('custom_tournament_teams').insert([{
        tournament_id: selectedTournament.id, is_bot: false, user_id: playerUserId.trim(),
        club_name: playerClubName.trim() || 'Clube do Jogador', club_logo: '⚽',
      }]);
      if (error) toast.error('Erro: ' + error.message);
      else { toast.success('👤 Jogador adicionado!'); setPlayerUserId(''); setPlayerClubName(''); }
    }
    await loadTeams(selectedTournament.id);
    setLoading(false);
  };

  const removeTeam = async (teamId: string) => {
    if (!selectedTournament) return;
    await supabase.from('custom_tournament_teams').delete().eq('id', teamId);
    toast.success('Time removido!');
    loadTeams(selectedTournament.id);
  };

  const regenerateFixtures = async () => {
    if (!selectedTournament) return;
    if (!confirm('Isso apagará todos os jogos existentes e gerará novos. Continuar?')) return;
    setLoading(true);
    await supabase.from('custom_tournament_matches').delete().eq('tournament_id', selectedTournament.id);
    const startDateStr = selectedTournament.start_date || new Date().toISOString().split('T')[0];
    let fixtures: Array<{ home_team_id: string; away_team_id: string; round: number; stage: string; scheduled_at: string }> = [];

    if (selectedTournament.format === 'league') {
      fixtures = generateLeagueFixtures(teams.map(t => t.id), selectedTournament.total_rounds, startDateStr, selectedTournament.match_time, selectedTournament.match_interval_hours);
    } else if (selectedTournament.format === 'knockout') {
      fixtures = generateKnockoutFixtures(teams.map(t => t.id), startDateStr, selectedTournament.match_time, selectedTournament.match_interval_hours);
    } else {
      const groups = await assignGroups(selectedTournament.id, teams);
      fixtures = generateGroupFixtures(groups, startDateStr, selectedTournament.match_time, selectedTournament.match_interval_hours);
    }

    if (fixtures.length > 0) {
      for (let i = 0; i < fixtures.length; i += 50) {
        const batch = fixtures.slice(i, i + 50).map(f => ({
          tournament_id: selectedTournament.id, home_team_id: f.home_team_id, away_team_id: f.away_team_id,
          round: f.round, stage: f.stage, scheduled_at: f.scheduled_at, status: 'scheduled',
        }));
        await supabase.from('custom_tournament_matches').insert(batch);
      }
    }

    toast.success(`🔄 ${fixtures.length} jogos regenerados!`);
    await loadMatches(selectedTournament.id);
    setLoading(false);
  };

  const updateTournamentStatus = async (status: string) => {
    if (!selectedTournament) return;
    const { error } = await supabase.from('custom_tournaments').update({ status } as any).eq('id', selectedTournament.id);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success(`Status atualizado para: ${status}`);
      setSelectedTournament({ ...selectedTournament, status });
      loadTournaments();
    }
  };

  const deleteTournament = async (id: string) => {
    if (!confirm('Excluir campeonato e todos os jogos/times?')) return;
    await supabase.from('custom_tournament_matches').delete().eq('tournament_id', id);
    await supabase.from('custom_tournament_teams').delete().eq('tournament_id', id);
    await supabase.from('custom_tournaments').delete().eq('id', id);
    toast.success('Campeonato excluído!');
    if (selectedTournament?.id === id) setSelectedTournament(null);
    loadTournaments();
  };

  const selectTournament = (t: Tournament) => {
    setSelectedTournament(t);
    loadTeams(t.id);
    loadMatches(t.id);
  };

  const formatMoney = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`;
  const statusColors: Record<string, string> = {
    draft: 'text-muted-foreground border-muted',
    registration: 'text-blue-400 border-blue-500/30',
    in_progress: 'text-green-400 border-green-500/30',
    finished: 'text-yellow-400 border-yellow-500/30',
    cancelled: 'text-red-400 border-red-500/30',
  };
  const statusLabels: Record<string, string> = {
    draft: '📝 Rascunho',
    registration: '📋 Inscrições',
    in_progress: '🔥 Em andamento',
    finished: '🏆 Finalizado',
    cancelled: '❌ Cancelado',
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.club_name : '???';
  };

  // ── GROUPS VIEW ──
  const renderGroups = () => {
    const groupLetters = [...new Set(teams.filter(t => t.group_letter).map(t => t.group_letter!))].sort();
    if (groupLetters.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">Sem grupos definidos.</p>;

    return (
      <div className="space-y-3">
        {groupLetters.map(letter => {
          const groupTeams = teams.filter(t => t.group_letter === letter).sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against));
          return (
            <Card key={letter} className="border-primary/20">
              <CardHeader className="pb-1 px-3 pt-2">
                <CardTitle className="text-xs font-bold">Grupo {letter}</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="text-muted-foreground">
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
                      <tr key={t.id} className={`${i < 2 ? 'bg-green-500/10' : ''} border-t border-border/20`}>
                        <td className="pl-1 py-1 font-bold">{i + 1}</td>
                        <td className="py-1 truncate max-w-[80px]">{t.club_logo} {t.club_name}</td>
                        <td className="text-center py-1">{t.played}</td>
                        <td className="text-center py-1 text-emerald-400">{t.wins}</td>
                        <td className="text-center py-1">{t.draws}</td>
                        <td className="text-center py-1 text-destructive">{t.losses}</td>
                        <td className="text-center py-1">{t.goals_for}</td>
                        <td className="text-center py-1">{t.goals_against}</td>
                        <td className="text-center py-1 font-bold">{t.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // ── MATCHES/CALENDAR VIEW ──
  const renderMatches = () => {
    if (matches.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">Nenhum jogo gerado ainda.</p>;
    const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);

    return (
      <div className="space-y-3">
        {rounds.map(round => {
          const roundMatches = matches.filter(m => m.round === round);
          const stageName = roundMatches[0]?.stage || `Rodada ${round}`;
          return (
            <Card key={round} className="border-border/50">
              <CardHeader className="pb-1 px-3 pt-2">
                <CardTitle className="text-[10px] font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <Calendar className="h-3 w-3" /> {stageName} — Rodada {round}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2 space-y-1">
                {roundMatches.map(match => (
                  <div key={match.id} className={`flex items-center justify-between p-1.5 rounded border text-[10px] ${match.status === 'played' ? 'border-green-500/20 bg-green-500/5' : 'border-border/30'}`}>
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="font-semibold truncate max-w-[70px]">{getTeamName(match.home_team_id)}</span>
                      <span className="text-muted-foreground shrink-0">
                        {match.status === 'played' ? <span className="font-bold">{match.home_goals} - {match.away_goals}</span> : 'vs'}
                      </span>
                      <span className="font-semibold truncate max-w-[70px]">{getTeamName(match.away_team_id)}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {match.scheduled_at && (
                        <span className="text-[8px] text-muted-foreground">
                          {new Date(match.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {new Date(match.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <Badge variant="outline" className={`text-[7px] ${match.status === 'played' ? 'text-green-400 border-green-500/30' : 'text-muted-foreground'}`}>
                        {match.status === 'played' ? '✅' : '⏳'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // ── TOURNAMENT LIST VIEW ──
  if (!selectedTournament) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" /> Campeonatos Personalizados
          </h3>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={loadTournaments} disabled={loading} className="h-7 px-2 text-[10px]">
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="h-7 px-2 text-[10px] gap-1">
              <Plus className="h-3 w-3" /> Criar
            </Button>
          </div>
        </div>

        {/* Create Form */}
        {showCreate && (
          <Card className="border-yellow-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="h-4 w-4 text-yellow-400" /> Novo Campeonato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="Nome do campeonato" value={formName} onChange={e => setFormName(e.target.value)} className="text-xs h-8" maxLength={100} />
              <Textarea placeholder="Descrição (opcional)" value={formDesc} onChange={e => setFormDesc(e.target.value)} className="text-xs min-h-[50px]" maxLength={500} />
              
              {/* Scope: País ou Mundial */}
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardHeader className="pb-1 px-3 pt-2">
                  <CardTitle className="text-[10px] flex items-center gap-1.5 text-blue-400">
                    <Globe className="h-3 w-3" /> Escopo do Campeonato
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-2 space-y-1.5">
                  <div className="grid grid-cols-2 gap-1">
                    <Button size="sm" variant={formScope === 'country' ? 'default' : 'outline'} className="h-7 text-[9px] gap-1" onClick={() => setFormScope('country')}>
                      🏴 Por País
                    </Button>
                    <Button size="sm" variant={formScope === 'world' ? 'default' : 'outline'} className="h-7 text-[9px] gap-1" onClick={() => setFormScope('world')}>
                      🌍 Mundial
                    </Button>
                  </div>
                  {formScope === 'country' && (
                    <Select value={formCountry} onValueChange={setFormCountry}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_COUNTRIES.map(c => (
                          <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-[8px] text-blue-400/70">
                    {formScope === 'world' 
                      ? '🌍 Todos os times criados de todos os países participam' 
                      : `🏴 Apenas times do ${formCountry} participam`}
                  </p>
                </CardContent>
              </Card>

              {/* Team source */}
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardHeader className="pb-1 px-3 pt-2">
                  <CardTitle className="text-[10px] flex items-center gap-1.5 text-emerald-400">
                    <Users className="h-3 w-3" /> Origem dos Times
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-2 space-y-1.5">
                  <div className="grid grid-cols-3 gap-1">
                    <Button size="sm" variant={teamSource === 'online_plus_bots' ? 'default' : 'outline'} className="h-7 text-[8px] gap-0.5" onClick={() => setTeamSource('online_plus_bots')}>
                      👤+🤖
                    </Button>
                    <Button size="sm" variant={teamSource === 'online_only' ? 'default' : 'outline'} className="h-7 text-[8px] gap-0.5" onClick={() => setTeamSource('online_only')}>
                      👤 Só online
                    </Button>
                    <Button size="sm" variant={teamSource === 'bots_only' ? 'default' : 'outline'} className="h-7 text-[8px] gap-0.5" onClick={() => setTeamSource('bots_only')}>
                      🤖 Só bots
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[8px] text-muted-foreground">Total Times</label>
                      <Input value={formMaxTeams} onChange={e => setFormMaxTeams(e.target.value)} className="text-xs h-7" type="number" min="4" max="64" />
                    </div>
                    {teamSource !== 'online_only' && (
                      <>
                        <div>
                          <label className="text-[8px] text-muted-foreground">Bot OVR Mín</label>
                          <Input value={batchBotMinOvr} onChange={e => setBatchBotMinOvr(e.target.value)} className="text-xs h-7" type="number" min="20" max="99" />
                        </div>
                        <div>
                          <label className="text-[8px] text-muted-foreground">Bot OVR Máx</label>
                          <Input value={batchBotMaxOvr} onChange={e => setBatchBotMaxOvr(e.target.value)} className="text-xs h-7" type="number" min="20" max="99" />
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-[8px] text-emerald-400/70">
                    {teamSource === 'online_plus_bots' && `Todos jogadores online são inscritos + bots completam até ${formMaxTeams} times`}
                    {teamSource === 'online_only' && `Apenas jogadores online reais (máx ${formMaxTeams})`}
                    {teamSource === 'bots_only' && `${formMaxTeams} times bot com OVR ${batchBotMinOvr}-${batchBotMaxOvr}`}
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-muted-foreground">Formato</label>
                  <Select value={formFormat} onValueChange={setFormFormat}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="league" className="text-xs">🏟️ Liga</SelectItem>
                      <SelectItem value="knockout" className="text-xs">⚔️ Mata-mata</SelectItem>
                      <SelectItem value="group_knockout" className="text-xs">🏟️⚔️ Grupos + Mata-mata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formFormat !== 'knockout' && (
                  <div>
                    <label className="text-[9px] text-muted-foreground">Turnos</label>
                    <Select value={formTotalRounds} onValueChange={setFormTotalRounds}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1" className="text-xs">Turno único</SelectItem>
                        <SelectItem value="2" className="text-xs">Turno e returno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-muted-foreground">🥇 1º (R$)</label>
                  <Input value={formPrize1} onChange={e => setFormPrize1(e.target.value)} className="text-xs h-8" type="number" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">🥈 2º (R$)</label>
                  <Input value={formPrize2} onChange={e => setFormPrize2(e.target.value)} className="text-xs h-8" type="number" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">🥉 3º (R$)</label>
                  <Input value={formPrize3} onChange={e => setFormPrize3(e.target.value)} className="text-xs h-8" type="number" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-muted-foreground">Duração Partida</label>
                  <Select value={formDuration} onValueChange={setFormDuration}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="360" className="text-xs">6 min</SelectItem>
                      <SelectItem value="720" className="text-xs">12 min</SelectItem>
                      <SelectItem value="900" className="text-xs">15 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">Intervalo entre Jogos</label>
                  <Select value={formInterval} onValueChange={setFormInterval}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="text-xs">1 hora</SelectItem>
                      <SelectItem value="6" className="text-xs">6 horas</SelectItem>
                      <SelectItem value="12" className="text-xs">12 horas</SelectItem>
                      <SelectItem value="24" className="text-xs">24 horas</SelectItem>
                      <SelectItem value="48" className="text-xs">48 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-muted-foreground">Data de Início</label>
                  <Input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} className="text-xs h-8" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">Horário dos Jogos</label>
                  <Input type="time" value={formMatchTime} onChange={e => setFormMatchTime(e.target.value)} className="text-xs h-8" />
                </div>
              </div>

              <Textarea placeholder="Regras especiais (opcional)" value={formRules} onChange={e => setFormRules(e.target.value)} className="text-xs min-h-[40px]" maxLength={1000} />

              <Button className="w-full h-9 text-xs gap-1 bg-yellow-600 hover:bg-yellow-700 text-white" onClick={createTournament} disabled={loading}>
                {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Trophy className="h-3 w-3" />}
                Criar Campeonato + Gerar Calendário
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tournament List */}
        {tournaments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Nenhum campeonato criado ainda.</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {tournaments.map(t => (
                <Card key={t.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => selectTournament(t)}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-bold truncate">{t.name}</p>
                          <Badge variant="outline" className={`text-[8px] ${statusColors[t.status] || ''}`}>
                            {statusLabels[t.status] || t.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                          <span>{t.format === 'league' ? '🏟️ Liga' : t.format === 'knockout' ? '⚔️ Mata-mata' : '🏟️⚔️ Grupos+MM'}</span>
                          <span>•</span>
                          <span>{t.country === 'Mundial' ? '🌍 Mundial' : `🏴 ${t.country}`}</span>
                          <span>•</span>
                          <span>{t.max_teams} times</span>
                          <span>•</span>
                          <span>🥇 {formatMoney(t.prize_1st)}</span>
                        </div>
                        {t.start_date && (
                          <p className="text-[8px] text-muted-foreground mt-0.5">
                            📅 {new Date(t.start_date).toLocaleDateString('pt-BR')} às {t.match_time}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400" onClick={(e) => { e.stopPropagation(); deleteTournament(t.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  }

  // ── TOURNAMENT DETAIL VIEW ──
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => setSelectedTournament(null)} className="h-7 px-2 text-[10px]">← Voltar</Button>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => { loadTeams(selectedTournament.id); loadMatches(selectedTournament.id); }} className="h-7 px-2 text-[10px]">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Tournament Info */}
      <Card className="border-yellow-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" /> {selectedTournament.name}
            </CardTitle>
            <Badge variant="outline" className={`text-[8px] ${statusColors[selectedTournament.status] || ''}`}>
              {statusLabels[selectedTournament.status] || selectedTournament.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-5 gap-1.5 text-center">
            <div className="p-1.5 rounded bg-muted/20">
              <p className="text-[8px] text-muted-foreground">Formato</p>
              <p className="text-[10px] font-semibold">{selectedTournament.format === 'league' ? 'Liga' : selectedTournament.format === 'knockout' ? 'Mata-mata' : 'Grupos+MM'}</p>
            </div>
            <div className="p-1.5 rounded bg-muted/20">
              <p className="text-[8px] text-muted-foreground">Escopo</p>
              <p className="text-[10px] font-semibold">{selectedTournament.country === 'Mundial' ? '🌍' : '🏴'} {selectedTournament.country?.slice(0, 6)}</p>
            </div>
            <div className="p-1.5 rounded bg-muted/20">
              <p className="text-[8px] text-muted-foreground">Times</p>
              <p className="text-[10px] font-semibold">{teams.length}</p>
            </div>
            <div className="p-1.5 rounded bg-muted/20">
              <p className="text-[8px] text-muted-foreground">Jogos</p>
              <p className="text-[10px] font-semibold">{matches.length}</p>
            </div>
            <div className="p-1.5 rounded bg-muted/20">
              <p className="text-[8px] text-muted-foreground">Jogados</p>
              <p className="text-[10px] font-semibold">{matches.filter(m => m.status === 'played').length}</p>
            </div>
          </div>

          {/* Online vs Bot count */}
          <div className="flex items-center gap-2 text-[9px]">
            <span className="text-green-400">👤 {teams.filter(t => !t.is_bot).length} online</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-orange-400">🤖 {teams.filter(t => t.is_bot).length} bots</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="p-1.5 rounded bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-[8px] text-yellow-400">🥇</p>
              <p className="text-[10px] font-bold text-yellow-400">{formatMoney(selectedTournament.prize_1st)}</p>
            </div>
            <div className="p-1.5 rounded bg-gray-400/10 border border-gray-400/20">
              <p className="text-[8px] text-gray-400">🥈</p>
              <p className="text-[10px] font-bold text-gray-400">{formatMoney(selectedTournament.prize_2nd)}</p>
            </div>
            <div className="p-1.5 rounded bg-orange-500/10 border border-orange-500/20">
              <p className="text-[8px] text-orange-400">🥉</p>
              <p className="text-[10px] font-bold text-orange-400">{formatMoney(selectedTournament.prize_3rd)}</p>
            </div>
          </div>

          {/* Status Controls */}
          <div className="flex gap-1 flex-wrap">
            {selectedTournament.status === 'draft' && (
              <Button size="sm" className="h-7 px-2 text-[10px] gap-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => updateTournamentStatus('registration')}>
                <Play className="h-3 w-3" /> Abrir Inscrições
              </Button>
            )}
            {(selectedTournament.status === 'draft' || selectedTournament.status === 'registration') && (
              <Button size="sm" className="h-7 px-2 text-[10px] gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => updateTournamentStatus('in_progress')}>
                <Swords className="h-3 w-3" /> Iniciar
              </Button>
            )}
            {selectedTournament.status === 'in_progress' && (
              <Button size="sm" className="h-7 px-2 text-[10px] gap-1 bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => updateTournamentStatus('finished')}>
                <Award className="h-3 w-3" /> Finalizar
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] gap-1" onClick={regenerateFixtures} disabled={loading}>
              <Zap className="h-3 w-3" /> Regerar Jogos
            </Button>
            {selectedTournament.status !== 'cancelled' && selectedTournament.status !== 'finished' && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] gap-1 text-red-400 border-red-500/30" onClick={() => updateTournamentStatus('cancelled')}>
                <XCircle className="h-3 w-3" /> Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
        {[
          { key: 'teams' as const, label: 'Times', icon: Users },
          { key: 'matches' as const, label: 'Calendário', icon: Calendar },
          { key: 'groups' as const, label: 'Grupos', icon: Target },
        ].map(tab => (
          <Button
            key={tab.key}
            size="sm"
            variant={detailTab === tab.key ? 'default' : 'ghost'}
            className="flex-1 h-7 text-[10px] gap-1"
            onClick={() => setDetailTab(tab.key)}
          >
            <tab.icon className="h-3 w-3" /> {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      <ScrollArea className="max-h-[500px]">
        {detailTab === 'teams' && (
          <div className="space-y-2">
            {/* Add Team (draft/registration only) */}
            {(selectedTournament.status === 'draft' || selectedTournament.status === 'registration') && (
              <Card className="border-border/50">
                <CardContent className="p-2 space-y-1.5">
                  <div className="grid grid-cols-2 gap-1">
                    <Button size="sm" variant={addTeamType === 'bot' ? 'default' : 'outline'} className="h-6 text-[9px] gap-1" onClick={() => setAddTeamType('bot')}>
                      <Bot className="h-3 w-3" /> Bot
                    </Button>
                    <Button size="sm" variant={addTeamType === 'player' ? 'default' : 'outline'} className="h-6 text-[9px] gap-1" onClick={() => setAddTeamType('player')}>
                      <Users className="h-3 w-3" /> Real
                    </Button>
                  </div>
                  {addTeamType === 'bot' ? (
                    <div className="flex gap-1">
                      <Input placeholder="Nome bot" value={botName} onChange={e => setBotName(e.target.value)} className="text-xs h-7 flex-1" maxLength={50} />
                      <Input placeholder="OVR" value={botStrength} onChange={e => setBotStrength(e.target.value)} className="text-xs h-7 w-14" type="number" min="20" max="99" />
                      <Button size="sm" className="h-7 px-2 text-[9px]" onClick={addTeam} disabled={loading}><Plus className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        <Input placeholder="UUID jogador" value={playerUserId} onChange={e => setPlayerUserId(e.target.value)} className="text-xs h-7 flex-1 font-mono" />
                        <Button size="sm" className="h-7 px-2 text-[9px]" onClick={addTeam} disabled={loading}><Plus className="h-3 w-3" /></Button>
                      </div>
                      {availablePlayers.length > 0 && (
                        <ScrollArea className="max-h-[80px]">
                          {availablePlayers.slice(0, 15).map(p => (
                            <div key={p.user_id} className="flex justify-between p-1 text-[9px] cursor-pointer hover:bg-muted/30 rounded" onClick={() => setPlayerUserId(p.user_id)}>
                              <span>{p.display_name || 'Sem nome'}</span>
                              <span className="font-mono text-muted-foreground">{p.user_id.slice(0, 8)}...</span>
                            </div>
                          ))}
                        </ScrollArea>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Team list */}
            <div className="space-y-1">
              {teams.map((t, idx) => (
                <div key={t.id} className={`flex items-center justify-between p-2 rounded-lg border text-[10px] ${t.eliminated ? 'border-red-500/20 bg-red-500/5 opacity-60' : 'border-border/30'}`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-muted-foreground w-4 text-center">{idx + 1}</span>
                    <span>{t.club_logo}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold truncate">{t.club_name}</span>
                        <Badge variant="outline" className={`text-[6px] py-0 ${t.is_bot ? 'text-orange-400 border-orange-500/30' : 'text-green-400 border-green-500/30'}`}>
                          {t.is_bot ? `🤖${t.bot_strength}` : '👤'}
                        </Badge>
                        {t.group_letter && <Badge variant="outline" className="text-[6px] py-0">G{t.group_letter}</Badge>}
                      </div>
                      {(selectedTournament.status === 'in_progress' || selectedTournament.status === 'finished') && (
                        <span className="text-[8px] text-muted-foreground">{t.played}J {t.wins}V {t.draws}E {t.losses}D {t.goals_for}:{t.goals_against} <b>{t.points}pts</b></span>
                      )}
                    </div>
                  </div>
                  {(selectedTournament.status === 'draft' || selectedTournament.status === 'registration') && (
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-400" onClick={() => removeTeam(t.id)}>
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {detailTab === 'matches' && renderMatches()}
        {detailTab === 'groups' && renderGroups()}
      </ScrollArea>
    </div>
  );
}
