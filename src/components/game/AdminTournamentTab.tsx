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
import { secureShuffle } from '@/utils/secureShuffle';

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

const BOT_FIRST_NAMES = ['Carlos','Henrique','Vinícius','Renan','Caio','Yuri','Danilo','Igor','Gustavo','Eduardo','Ricardo','Willian','Samuel','Otávio','Matheus','Luan','Wesley','Breno','Davi','Enzo','Miguel','Arthur','Rafael','Pedro','Lucas','Felipe','Gabriel','Thiago','Bruno','André','Diego','Marcos','Leonardo','Bernardo','João','Nicolas','Vitor','Guilherme','Hugo','Cássio'];
const BOT_LAST_NAMES = ['Silva','Santos','Oliveira','Souza','Lima','Costa','Almeida','Ferreira','Rodrigues','Nunes','Gomes','Dias','Mendes','Rocha','Borges','Reis','Amaral','Melo','Pires','Tavares','Fonseca','Castro','Azevedo','Moura','Barros','Andrade','Cunha','Batista','Nogueira','Miranda'];
const BOT_POSITIONS = ['GOL','ZAG','ZAG','LAT','LAT','VOL','MEI','MEI','MEI','ATA','ATA','ZAG','MEI','ATA','GOL'];

function generateBotSquad(teamOvr: number, clubName: string): any[] {
  const usedNames = new Set<string>();
  return BOT_POSITIONS.map((pos, i) => {
    let name = '';
    for (let attempt = 0; attempt < 20; attempt++) {
      const fn = BOT_FIRST_NAMES[Math.floor(Math.random() * BOT_FIRST_NAMES.length)];
      const ln = BOT_LAST_NAMES[Math.floor(Math.random() * BOT_LAST_NAMES.length)];
      name = `${fn} ${ln}`;
      if (!usedNames.has(name)) break;
    }
    usedNames.add(name);
    const variance = Math.floor(Math.random() * 16) - 8;
    const ovr = Math.max(30, Math.min(99, teamOvr + variance));
    const age = 18 + Math.floor(Math.random() * 17);
    return { id: `bot_${i}_${Math.random().toString(36).slice(2,7)}`, name, position: pos, overall: ovr, age, stamina: 70 + Math.floor(Math.random() * 25), morale: 60 + Math.floor(Math.random() * 30) };
  });
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
  const [formMatchTime, setFormMatchTime] = useState('');
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

  // Knockout customization
  const [formKnockoutStartStage, setFormKnockoutStartStage] = useState<'oitavas' | 'quartas' | 'semi' | 'final'>('oitavas');
  const [formTwoLegs, setFormTwoLegs] = useState(false);

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
  // Parse YYYY-MM-DD as local date (avoids UTC timezone shift)
  const parseLocalDate = (dateStr: string, time: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    return new Date(year, month - 1, day, hours || 0, minutes || 0);
  };

  const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;

  const nextPowerOfTwo = (n: number) => {
    if (n <= 2) return 2;
    let p = 2;
    while (p < n) p *= 2;
    return p;
  };

  const knockoutStageByTeamCount = (teamCount: number) => {
    if (teamCount <= 2) return 'Final';
    if (teamCount === 4) return 'Semi';
    if (teamCount === 8) return 'Quartas';
    if (teamCount === 16) return 'Oitavas';
    return `R${teamCount}`;
  };

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
          const date = parseLocalDate(startDate, matchTime);
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

  const generateKnockoutFixtures = (
    teamIds: string[],
    startDate: string,
    matchTime: string,
    intervalHours: number,
    twoLegs: boolean = false,
  ) => {
    const fixtures: Array<{ home_team_id: string; away_team_id: string; round: number; stage: string; scheduled_at: string; leg?: number }> = [];
    // Fisher-Yates seguro: cada sorteio é uniforme e independente do anterior.
    const shuffled = secureShuffle(teamIds);
    const stageName = knockoutStageByTeamCount(shuffled.length);
    const pairCount = Math.floor(shuffled.length / 2);

    // Leg 1
    for (let i = 0; i < pairCount; i++) {
      const date = parseLocalDate(startDate, matchTime);
      date.setTime(date.getTime() + i * intervalHours * 3600000);
      fixtures.push({
        home_team_id: shuffled[i * 2],
        away_team_id: shuffled[i * 2 + 1],
        round: 1,
        stage: stageName,
        scheduled_at: date.toISOString(),
        leg: 1,
      });
    }

    // Leg 2 (return) — swap home/away, scheduled after all leg-1 games
    if (twoLegs) {
      for (let i = 0; i < pairCount; i++) {
        const date = parseLocalDate(startDate, matchTime);
        date.setTime(date.getTime() + (pairCount + i) * intervalHours * 3600000);
        fixtures.push({
          home_team_id: shuffled[i * 2 + 1],
          away_team_id: shuffled[i * 2],
          round: 2,
          stage: `${stageName} (Volta)`,
          scheduled_at: date.toISOString(),
          leg: 2,
        });
      }
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
          const date = parseLocalDate(startDate, matchTime);
          date.setTime(date.getTime() + matchDay * intervalHours * 3600000);
          fixtures.push({ home_team_id: home, away_team_id: away, round: round + 1, stage: `Grupo ${groupLetter}`, scheduled_at: date.toISOString() });
        }
        matchDay++;
      }
    }
    return fixtures;
  };

  const assignGroups = async (tournamentId: string, teamList: TournamentTeam[]): Promise<Record<string, string[]>> => {
    const shuffled = secureShuffle(teamList);
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

  // ── Fetch ALL existing teams via backend function (bypasses RLS) ──
  const fetchOnlineTeams = async (scope: string): Promise<Array<{ user_id: string; club_name: string; club_logo: string }> | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-all-clubs', {
        body: { scope },
      });

      if (error) {
        console.error('Error fetching clubs:', error);
        toast.error(`Falha ao buscar clubes: ${error.message}`);
        return null;
      }

      if (data?.error) {
        toast.error(`Falha ao buscar clubes: ${data.error}`);
        return null;
      }

      const clubs = Array.isArray(data?.clubs) ? data.clubs : [];
      return clubs;
    } catch (err) {
      console.error('Failed to fetch clubs:', err);
      toast.error('Falha ao buscar clubes do sistema. Tente novamente.');
      return null;
    }
  };

  // ── CREATE WITH AUTO-ENROLLMENT ──────────────────────────────
  const createTournament = async () => {
    if (!formName.trim()) return toast.error('Nome é obrigatório');
    const requestedMaxTeams = Math.max(2, Math.min(64, Number(formMaxTeams) || 20));
    const isKnockoutFormat = formFormat === 'knockout' || formFormat === 'group_knockout';

    // For pure knockout: derive team count from chosen starting stage.
    const startStageTeams: Record<string, number> = { final: 2, semi: 4, quartas: 8, oitavas: 16 };
    let maxTeams = requestedMaxTeams;
    if (formFormat === 'knockout') {
      maxTeams = startStageTeams[formKnockoutStartStage] || nextPowerOfTwo(requestedMaxTeams);
      if (maxTeams !== requestedMaxTeams) {
        toast.info(`⚙️ Mata-mata: ${maxTeams} times (fase ${formKnockoutStartStage}).`);
      }
    } else if (formFormat === 'group_knockout') {
      maxTeams = Math.min(64, nextPowerOfTwo(requestedMaxTeams));
      if (maxTeams !== requestedMaxTeams) {
        toast.info(`⚙️ Grupos+MM ajustado para ${maxTeams} times.`);
      }
    }
    const minOvr = Math.max(20, Math.min(99, Number(batchBotMinOvr) || 50));
    const maxOvr = Math.max(minOvr, Math.min(99, Number(batchBotMaxOvr) || 80));
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const da = String(now.getDate()).padStart(2, '0');
    const startDateStr = formStartDate || `${y}-${mo}-${da}`;
    const matchTime = formMatchTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const scope = formScope === 'world' ? 'Mundial' : formCountry;

    setLoading(true);

    let onlineTeams: Array<{ user_id: string; club_name: string; club_logo: string; last_active?: string }> = [];
    if (teamSource !== 'bots_only') {
      const fetchedTeams = await fetchOnlineTeams(scope);
      if (fetchedTeams === null) {
        setLoading(false);
        return;
      }
      // Prioritize online/active humans
      onlineTeams = (fetchedTeams as any[]).sort((a, b) => {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return dateB - dateA;
      });

      if (teamSource === 'online_only' && onlineTeams.length < 2) {
        toast.error('Não há clubes suficientes para criar campeonato apenas com times online.');
        setLoading(false);
        return;
      }
    }

    // 1. Create tournament — start as draft so we can enroll teams BEFORE
    //    the server-side knockout validation trigger fires on status change.
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
      match_time: matchTime,
      country: scope,
      rules_text: formRules.trim(),
      created_by: userId,
      status: 'draft',
      two_legs: formFormat === 'knockout' ? formTwoLegs : false,
    } as any]).select().single();

    if (error || !tournamentData) {
      toast.error('Erro: ' + (error?.message || 'Falha ao criar'));
      setLoading(false);
      return;
    }

    const tournament = tournamentData as any;
    const allTeamInserts: any[] = [];

    // 2. Enroll online players if applicable (deduplicate by user_id)
    if (teamSource !== 'bots_only') {
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

    // 3. Fill remaining slots with bots (each with 15-player squad)
    const slotsForBots = maxTeams - allTeamInserts.length;
    if (slotsForBots > 0 && teamSource !== 'online_only') {
      const botPool = getBotNamesForScope(scope);
      const usedNames = new Set(allTeamInserts.map(t => t.club_name));
      const availableNames = botPool.filter(n => !usedNames.has(n));
      
      // Shuffle available names — Fisher-Yates uniforme
      const shuffledNames = secureShuffle(availableNames);

      for (let i = 0; i < slotsForBots; i++) {
        let name = shuffledNames[i % shuffledNames.length];
        if (!name || usedNames.has(name)) name = `Bot FC ${i + 1}`;
        usedNames.add(name);
        const ovr = Math.floor(Math.random() * (maxOvr - minOvr + 1)) + minOvr;
        const botSquad = generateBotSquad(ovr, name);
        allTeamInserts.push({
          tournament_id: tournament.id,
          is_bot: true,
          bot_name: name,
          bot_strength: ovr,
          club_name: name,
          club_logo: '🤖',
          user_id: null,
          bot_squad: botSquad,
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
    let fixtures: Array<{ home_team_id: string; away_team_id: string; round: number; stage: string; scheduled_at: string; leg?: number }> = [];

    if (formFormat === 'league') {
      fixtures = generateLeagueFixtures(teamList.map(t => t.id), Number(formTotalRounds) || 1, startDateStr, matchTime, Number(formInterval) || 24);
    } else if (formFormat === 'knockout') {
      if (!isPowerOfTwo(teamList.length)) {
        toast.error(`Mata-mata exige potência de 2 (4, 8, 16, 32, 64). Times atuais: ${teamList.length}`);
        await supabase.from('custom_tournament_teams').delete().eq('tournament_id', tournament.id);
        await supabase.from('custom_tournaments').delete().eq('id', tournament.id);
        setLoading(false);
        return;
      }
      fixtures = generateKnockoutFixtures(teamList.map(t => t.id), startDateStr, matchTime, Number(formInterval) || 24, formTwoLegs);
    } else if (formFormat === 'group_knockout') {
      const groups = await assignGroups(tournament.id, teamList);
      fixtures = generateGroupFixtures(groups, startDateStr, matchTime, Number(formInterval) || 24);
    }

    // 6. Insert fixtures (persist leg for two-legged knockouts)
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
          leg: f.leg ?? 1,
        }));
        await supabase.from('custom_tournament_matches').insert(batch as any);
      }
    }

    const maxRound = fixtures.length > 0 ? Math.max(...fixtures.map(f => f.round)) : 1;

    // 7. Activate tournament — fires server-side knockout validation trigger.
    const { error: activateErr } = await supabase
      .from('custom_tournaments')
      .update({ total_rounds: maxRound, status: 'in_progress' } as any)
      .eq('id', tournament.id);

    if (activateErr) {
      // Validation rejected — roll back the partially created tournament.
      await supabase.from('custom_tournament_matches').delete().eq('tournament_id', tournament.id);
      await supabase.from('custom_tournament_teams').delete().eq('tournament_id', tournament.id);
      await supabase.from('custom_tournaments').delete().eq('id', tournament.id);
      const msg = activateErr.message || 'Falha ao ativar campeonato.';
      toast.error(`❌ ${msg}`);
      setLoading(false);
      return;
    }

    // Send notifications to all enrolled real players
    const formatLabelsNotif: Record<string, string> = { league: 'Liga', knockout: 'Mata-mata', group_knockout: 'Grupos' };
    const enrolledUsers = allTeamInserts.filter(t => !t.is_bot && t.user_id);
    if (enrolledUsers.length > 0) {
      const firstMatchDate = fixtures.length > 0
        ? new Date(fixtures[0].scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : 'em breve';
      
      const notifications = enrolledUsers.map(t => ({
        user_id: t.user_id,
        type: 'info',
        title: `🏆 Novo Campeonato: ${formName.trim()}`,
        message: `Você foi inscrito no campeonato "${formName.trim()}" (${formatLabelsNotif[formFormat] || formFormat})!\n📅 Primeiro jogo: ${firstMatchDate}\n👥 ${allTeamInserts.length} times\n🥇 1º: R$${(Number(formPrize1) / 1e6).toFixed(1)}M\nBoa sorte!`,
        icon: '🏆',
        data: { tournamentId: tournament.id },
      }));

      // Insert in batches
      for (let i = 0; i < notifications.length; i += 50) {
        await supabase.from('user_notifications').insert(notifications.slice(i, i + 50));
      }

      // Add newspaper entry
      await supabase.from('newspaper_entries').insert({
        user_id: userId,
        text: `🏆 NOVO CAMPEONATO: "${formName.trim()}" foi criado com ${allTeamInserts.length} times! Formato: ${formatLabelsNotif[formFormat] || formFormat}. Primeiro jogo: ${firstMatchDate}. Premiação: 🥇 R$${(Number(formPrize1) / 1e6).toFixed(1)}M | 🥈 R$${(Number(formPrize2) / 1e6).toFixed(1)}M | 🥉 R$${(Number(formPrize3) / 1e6).toFixed(1)}M`,
        category: 'CAMPEONATO',
        is_event: true,
      });
    }

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
    const rn = new Date();
    const fallbackDate = `${rn.getFullYear()}-${String(rn.getMonth() + 1).padStart(2, '0')}-${String(rn.getDate()).padStart(2, '0')}`;
    const startDateStr = selectedTournament.start_date?.split('T')[0] || fallbackDate;
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
          <Card className="border-primary/20">
            <CardContent className="p-3 space-y-2.5">
              <p className="text-xs font-bold flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-primary" /> Novo Campeonato
              </p>

              <Input placeholder="Nome do campeonato" value={formName} onChange={e => setFormName(e.target.value)} className="text-xs h-8" maxLength={100} />

              {/* Scope + Country in one row */}
              <div className="flex gap-1.5">
                <Button size="sm" variant={formScope === 'country' ? 'default' : 'outline'} className="h-7 text-[9px] flex-1" onClick={() => setFormScope('country')}>
                  🏴 País
                </Button>
                <Button size="sm" variant={formScope === 'world' ? 'default' : 'outline'} className="h-7 text-[9px] flex-1" onClick={() => setFormScope('world')}>
                  🌍 Mundial
                </Button>
                {formScope === 'country' && (
                  <Select value={formCountry} onValueChange={setFormCountry}>
                    <SelectTrigger className="h-7 text-[9px] flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_COUNTRIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Team source compact */}
              <div className="flex gap-1">
                {(['online_plus_bots', 'online_only', 'bots_only'] as const).map(src => (
                  <Button key={src} size="sm" variant={teamSource === src ? 'default' : 'outline'} className="h-6 text-[8px] flex-1" onClick={() => setTeamSource(src)}>
                    {src === 'online_plus_bots' ? '👤+🤖' : src === 'online_only' ? '👤 Online' : '🤖 Bots'}
                  </Button>
                ))}
              </div>

              {/* Teams + OVR + Format in grid */}
              <div className="grid grid-cols-4 gap-1.5">
                <div>
                  <label className="text-[7px] text-muted-foreground">Times</label>
                  <Input value={formMaxTeams} onChange={e => setFormMaxTeams(e.target.value)} className="text-[10px] h-7" type="number" min="4" max="64" />
                </div>
                {teamSource !== 'online_only' && (
                  <>
                    <div>
                      <label className="text-[7px] text-muted-foreground">OVR Min</label>
                      <Input value={batchBotMinOvr} onChange={e => setBatchBotMinOvr(e.target.value)} className="text-[10px] h-7" type="number" />
                    </div>
                    <div>
                      <label className="text-[7px] text-muted-foreground">OVR Max</label>
                      <Input value={batchBotMaxOvr} onChange={e => setBatchBotMaxOvr(e.target.value)} className="text-[10px] h-7" type="number" />
                    </div>
                  </>
                )}
                <div>
                  <label className="text-[7px] text-muted-foreground">Formato</label>
                  <Select value={formFormat} onValueChange={setFormFormat}>
                    <SelectTrigger className="h-7 text-[9px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="league" className="text-xs">Liga</SelectItem>
                      <SelectItem value="knockout" className="text-xs">Mata-mata</SelectItem>
                      <SelectItem value="group_knockout" className="text-xs">Grupos+MM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Prizes compact */}
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-[7px] text-muted-foreground">🥇 1º</label>
                  <Input value={formPrize1} onChange={e => setFormPrize1(e.target.value)} className="text-[10px] h-7" type="number" />
                </div>
                <div>
                  <label className="text-[7px] text-muted-foreground">🥈 2º</label>
                  <Input value={formPrize2} onChange={e => setFormPrize2(e.target.value)} className="text-[10px] h-7" type="number" />
                </div>
                <div>
                  <label className="text-[7px] text-muted-foreground">🥉 3º</label>
                  <Input value={formPrize3} onChange={e => setFormPrize3(e.target.value)} className="text-[10px] h-7" type="number" />
                </div>
              </div>

              {/* Schedule compact */}
              <div className="grid grid-cols-4 gap-1.5">
                <div>
                  <label className="text-[7px] text-muted-foreground">Início</label>
                  <Input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} className="text-[9px] h-7" />
                </div>
                <div>
                  <label className="text-[7px] text-muted-foreground">Hora</label>
                  <Input type="time" value={formMatchTime} onChange={e => setFormMatchTime(e.target.value)} className="text-[9px] h-7" />
                </div>
                <div>
                  <label className="text-[7px] text-muted-foreground">Intervalo</label>
                  <Select value={formInterval} onValueChange={setFormInterval}>
                    <SelectTrigger className="h-7 text-[9px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="text-xs">1h</SelectItem>
                      <SelectItem value="6" className="text-xs">6h</SelectItem>
                      <SelectItem value="12" className="text-xs">12h</SelectItem>
                      <SelectItem value="24" className="text-xs">24h</SelectItem>
                      <SelectItem value="48" className="text-xs">48h</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[7px] text-muted-foreground">Duração</label>
                  <Select value={formDuration} onValueChange={setFormDuration}>
                    <SelectTrigger className="h-7 text-[9px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="360" className="text-xs">6min</SelectItem>
                      <SelectItem value="720" className="text-xs">12min</SelectItem>
                      <SelectItem value="900" className="text-xs">15min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick start button */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-6 text-[9px] gap-1"
                onClick={() => {
                  const now = new Date();
                  setFormStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
                  if (!formMatchTime) {
                    setFormMatchTime(`${String(now.getHours()).padStart(2, '0')}:${String(Math.min(59, now.getMinutes() + 5)).padStart(2, '0')}`);
                  }
                }}
              >
                <Zap className="h-3 w-3" /> Preencher Data/Hora Atual
              </Button>

              {formFormat !== 'knockout' && (
                <Select value={formTotalRounds} onValueChange={setFormTotalRounds}>
                  <SelectTrigger className="h-7 text-[9px]"><SelectValue placeholder="Turnos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" className="text-xs">Turno único</SelectItem>
                    <SelectItem value="2" className="text-xs">Turno e returno</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Knockout-only options: starting stage + two-legs */}
              {formFormat === 'knockout' && (
                <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <div>
                    <label className="text-[8px] text-amber-300/80 font-semibold">⚔️ Fase Inicial</label>
                    <Select value={formKnockoutStartStage} onValueChange={(v: 'oitavas' | 'quartas' | 'semi' | 'final') => setFormKnockoutStartStage(v)}>
                      <SelectTrigger className="h-7 text-[9px] mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oitavas" className="text-xs">Oitavas (16 times)</SelectItem>
                        <SelectItem value="quartas" className="text-xs">Quartas (8 times)</SelectItem>
                        <SelectItem value="semi" className="text-xs">Semifinal (4 times)</SelectItem>
                        <SelectItem value="final" className="text-xs">Final (2 times)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[8px] text-amber-300/80 font-semibold">🔁 Ida e Volta</label>
                    <Select value={formTwoLegs ? 'yes' : 'no'} onValueChange={v => setFormTwoLegs(v === 'yes')}>
                      <SelectTrigger className="h-7 text-[9px] mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no" className="text-xs">Jogo único</SelectItem>
                        <SelectItem value="yes" className="text-xs">Ida e Volta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Textarea placeholder="Regras (opcional)" value={formRules} onChange={e => setFormRules(e.target.value)} className="text-[10px] min-h-[30px]" maxLength={500} />

              <Button className="w-full h-8 text-xs gap-1" onClick={createTournament} disabled={loading}>
                {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Trophy className="h-3 w-3" />}
                Criar Campeonato
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
