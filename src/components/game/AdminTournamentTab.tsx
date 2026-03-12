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
  RefreshCw, ChevronRight, Settings, Play, Pause, CheckCircle, XCircle
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

interface Props {
  userId: string;
}

export function AdminTournamentTab({ userId }: Props) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formFormat, setFormFormat] = useState('league');
  const [formMaxTeams, setFormMaxTeams] = useState('8');
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

  // Add team state
  const [addTeamType, setAddTeamType] = useState<'bot' | 'player'>('bot');
  const [botName, setBotName] = useState('');
  const [botStrength, setBotStrength] = useState('60');
  const [playerUserId, setPlayerUserId] = useState('');
  const [playerClubName, setPlayerClubName] = useState('');

  // Available players from profiles
  const [availablePlayers, setAvailablePlayers] = useState<Array<{ user_id: string; display_name: string | null }>>([]);

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

  const loadPlayers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('user_id, display_name').limit(200);
    if (data) setAvailablePlayers(data);
  }, []);

  useEffect(() => {
    loadTournaments();
    loadPlayers();
  }, [loadTournaments, loadPlayers]);

  const createTournament = async () => {
    if (!formName.trim()) return toast.error('Nome é obrigatório');
    setLoading(true);
    const { error } = await supabase.from('custom_tournaments').insert([{
      name: formName.trim(),
      description: formDesc.trim(),
      format: formFormat,
      max_teams: Number(formMaxTeams) || 8,
      total_rounds: formFormat === 'knockout' ? 1 : Number(formTotalRounds) || 1,
      prize_1st: Number(formPrize1) || 0,
      prize_2nd: Number(formPrize2) || 0,
      prize_3rd: Number(formPrize3) || 0,
      match_duration_seconds: Number(formDuration) || 720,
      match_interval_hours: Number(formInterval) || 24,
      start_date: formStartDate || null,
      match_time: formMatchTime || '20:00',
      country: formCountry,
      rules_text: formRules.trim(),
      created_by: userId,
    }]);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('🏆 Campeonato criado!');
      setShowCreate(false);
      setFormName(''); setFormDesc(''); setFormRules('');
      loadTournaments();
    }
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
        tournament_id: selectedTournament.id,
        is_bot: true,
        bot_name: botName.trim(),
        bot_strength: strength,
        club_name: botName.trim(),
        club_logo: '🤖',
        user_id: null,
      }]);
      if (error) toast.error('Erro: ' + error.message);
      else { toast.success(`🤖 Bot "${botName}" (OVR ${strength}) adicionado!`); setBotName(''); }
    } else {
      if (!playerUserId.trim()) { setLoading(false); return toast.error('ID do jogador é obrigatório'); }
      const { error } = await supabase.from('custom_tournament_teams').insert([{
        tournament_id: selectedTournament.id,
        is_bot: false,
        user_id: playerUserId.trim(),
        club_name: playerClubName.trim() || 'Clube do Jogador',
        club_logo: '⚽',
      }]);
      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) toast.error('Jogador já está no campeonato!');
        else toast.error('Erro: ' + error.message);
      } else { toast.success('👤 Jogador adicionado!'); setPlayerUserId(''); setPlayerClubName(''); }
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

  const updateTournamentStatus = async (status: string) => {
    if (!selectedTournament) return;
    const { error } = await supabase.from('custom_tournaments').update({ status }).eq('id', selectedTournament.id);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success(`Status atualizado para: ${status}`);
      setSelectedTournament({ ...selectedTournament, status });
      loadTournaments();
    }
  };

  const deleteTournament = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este campeonato?')) return;
    await supabase.from('custom_tournaments').delete().eq('id', id);
    toast.success('Campeonato excluído!');
    if (selectedTournament?.id === id) setSelectedTournament(null);
    loadTournaments();
  };

  const selectTournament = (t: Tournament) => {
    setSelectedTournament(t);
    loadTeams(t.id);
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
  const formatLabels: Record<string, string> = {
    league: '🏟️ Liga (pontos corridos)',
    knockout: '⚔️ Mata-mata',
    group_knockout: '🏟️⚔️ Grupos + Mata-mata',
  };

  // ── TOURNAMENT LIST VIEW ──────────────────────────────────────
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
                <div>
                  <label className="text-[9px] text-muted-foreground">Máx. Times</label>
                  <Select value={formMaxTeams} onValueChange={setFormMaxTeams}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[4, 8, 12, 16, 20, 24, 32].map(n => (
                        <SelectItem key={n} value={String(n)} className="text-xs">{n} times</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formFormat !== 'knockout' && (
                <div>
                  <label className="text-[9px] text-muted-foreground">Rodadas (turno e returno = 2x)</label>
                  <Select value={formTotalRounds} onValueChange={setFormTotalRounds}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2].map(n => (
                        <SelectItem key={n} value={String(n)} className="text-xs">{n === 1 ? 'Turno único' : 'Turno e returno'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-muted-foreground">🥇 1º Lugar (R$)</label>
                  <Input value={formPrize1} onChange={e => setFormPrize1(e.target.value)} className="text-xs h-8" type="number" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">🥈 2º Lugar (R$)</label>
                  <Input value={formPrize2} onChange={e => setFormPrize2(e.target.value)} className="text-xs h-8" type="number" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">🥉 3º Lugar (R$)</label>
                  <Input value={formPrize3} onChange={e => setFormPrize3(e.target.value)} className="text-xs h-8" type="number" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-muted-foreground">Duração da Partida</label>
                  <Select value={formDuration} onValueChange={setFormDuration}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="360" className="text-xs">6 min (rápido)</SelectItem>
                      <SelectItem value="720" className="text-xs">12 min (normal)</SelectItem>
                      <SelectItem value="900" className="text-xs">15 min (longo)</SelectItem>
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
                      <SelectItem value="24" className="text-xs">24 horas (diário)</SelectItem>
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

              <div>
                <label className="text-[9px] text-muted-foreground">País</label>
                <Select value={formCountry} onValueChange={setFormCountry}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Brasil', 'Argentina', 'Colômbia', 'Chile', 'Uruguai', 'Portugal', 'Espanha', 'Itália', 'França', 'Alemanha', 'Inglaterra', 'México'].map(c => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Textarea placeholder="Regras especiais (opcional)" value={formRules} onChange={e => setFormRules(e.target.value)} className="text-xs min-h-[40px]" maxLength={1000} />

              <Button className="w-full h-9 text-xs gap-1 bg-yellow-600 hover:bg-yellow-700 text-white" onClick={createTournament} disabled={loading}>
                <Trophy className="h-3 w-3" /> Criar Campeonato
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
                          <span>{formatLabels[t.format]?.split(' ')[0]} {t.format === 'league' ? 'Liga' : t.format === 'knockout' ? 'Mata-mata' : 'Grupos+MM'}</span>
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

  // ── TOURNAMENT DETAIL VIEW ────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => setSelectedTournament(null)} className="h-7 px-2 text-[10px]">
          ← Voltar
        </Button>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => loadTeams(selectedTournament.id)} className="h-7 px-2 text-[10px]">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Tournament Info */}
      <Card className="border-yellow-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              {selectedTournament.name}
            </CardTitle>
            <Badge variant="outline" className={`text-[8px] ${statusColors[selectedTournament.status] || ''}`}>
              {statusLabels[selectedTournament.status] || selectedTournament.status}
            </Badge>
          </div>
          {selectedTournament.description && (
            <p className="text-[10px] text-muted-foreground">{selectedTournament.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-muted/20">
              <p className="text-[9px] text-muted-foreground">Formato</p>
              <p className="text-xs font-semibold">{selectedTournament.format === 'league' ? 'Liga' : selectedTournament.format === 'knockout' ? 'Mata-mata' : 'Grupos+MM'}</p>
            </div>
            <div className="p-2 rounded bg-muted/20">
              <p className="text-[9px] text-muted-foreground">Times</p>
              <p className="text-xs font-semibold">{teams.length}/{selectedTournament.max_teams}</p>
            </div>
            <div className="p-2 rounded bg-muted/20">
              <p className="text-[9px] text-muted-foreground">Duração Partida</p>
              <p className="text-xs font-semibold">{selectedTournament.match_duration_seconds / 60} min</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-[9px] text-yellow-400">🥇 1º Lugar</p>
              <p className="text-xs font-bold text-yellow-400">{formatMoney(selectedTournament.prize_1st)}</p>
            </div>
            <div className="p-2 rounded bg-gray-400/10 border border-gray-400/20">
              <p className="text-[9px] text-gray-400">🥈 2º Lugar</p>
              <p className="text-xs font-bold text-gray-400">{formatMoney(selectedTournament.prize_2nd)}</p>
            </div>
            <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20">
              <p className="text-[9px] text-orange-400">🥉 3º Lugar</p>
              <p className="text-xs font-bold text-orange-400">{formatMoney(selectedTournament.prize_3rd)}</p>
            </div>
          </div>

          {selectedTournament.start_date && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Início: {new Date(selectedTournament.start_date).toLocaleDateString('pt-BR')}</span>
              <Clock className="h-3 w-3 ml-2" />
              <span>Horário: {selectedTournament.match_time}</span>
            </div>
          )}

          {selectedTournament.rules_text && (
            <div className="p-2 rounded bg-muted/20 border border-border/50">
              <p className="text-[9px] text-muted-foreground font-semibold mb-1">📋 Regras:</p>
              <p className="text-[10px] text-muted-foreground whitespace-pre-wrap">{selectedTournament.rules_text}</p>
            </div>
          )}

          {/* Status Controls */}
          <div className="flex gap-1 flex-wrap">
            {selectedTournament.status === 'draft' && (
              <Button size="sm" className="h-7 px-2 text-[10px] gap-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => updateTournamentStatus('registration')}>
                <Play className="h-3 w-3" /> Abrir Inscrições
              </Button>
            )}
            {selectedTournament.status === 'registration' && (
              <Button size="sm" className="h-7 px-2 text-[10px] gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => updateTournamentStatus('in_progress')}>
                <Swords className="h-3 w-3" /> Iniciar Campeonato
              </Button>
            )}
            {selectedTournament.status === 'in_progress' && (
              <Button size="sm" className="h-7 px-2 text-[10px] gap-1 bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => updateTournamentStatus('finished')}>
                <Award className="h-3 w-3" /> Finalizar
              </Button>
            )}
            {selectedTournament.status !== 'cancelled' && selectedTournament.status !== 'finished' && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] gap-1 text-red-400 border-red-500/30" onClick={() => updateTournamentStatus('cancelled')}>
                <XCircle className="h-3 w-3" /> Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Team */}
      {(selectedTournament.status === 'draft' || selectedTournament.status === 'registration') && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4 text-green-400" />
              Adicionar Time ({teams.length}/{selectedTournament.max_teams})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-1">
              <Button size="sm" variant={addTeamType === 'bot' ? 'default' : 'outline'} className="h-7 text-[10px] gap-1" onClick={() => setAddTeamType('bot')}>
                <Bot className="h-3 w-3" /> Time Bot
              </Button>
              <Button size="sm" variant={addTeamType === 'player' ? 'default' : 'outline'} className="h-7 text-[10px] gap-1" onClick={() => setAddTeamType('player')}>
                <Users className="h-3 w-3" /> Jogador Real
              </Button>
            </div>

            {addTeamType === 'bot' ? (
              <>
                <Input placeholder="Nome do time bot (ex: Real Madrid)" value={botName} onChange={e => setBotName(e.target.value)} className="text-xs h-8" maxLength={50} />
                <div>
                  <label className="text-[9px] text-muted-foreground">Força do Bot (OVR: {botStrength})</label>
                  <Input type="range" min="20" max="99" value={botStrength} onChange={e => setBotStrength(e.target.value)} className="h-6" />
                  <div className="flex justify-between text-[8px] text-muted-foreground">
                    <span>20 (fraco)</span>
                    <span className="font-bold text-primary">{botStrength}</span>
                    <span>99 (lendário)</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Input placeholder="ID do jogador (UUID)" value={playerUserId} onChange={e => setPlayerUserId(e.target.value)} className="text-xs h-8 font-mono" />
                <Input placeholder="Nome do clube (opcional)" value={playerClubName} onChange={e => setPlayerClubName(e.target.value)} className="text-xs h-8" maxLength={50} />
                {availablePlayers.length > 0 && (
                  <ScrollArea className="max-h-[120px]">
                    <div className="space-y-1">
                      {availablePlayers.slice(0, 20).map(p => (
                        <div key={p.user_id} className="flex items-center justify-between p-1.5 rounded bg-muted/20 text-[10px] cursor-pointer hover:bg-muted/40" onClick={() => setPlayerUserId(p.user_id)}>
                          <span>{p.display_name || 'Sem nome'}</span>
                          <span className="font-mono text-muted-foreground">{p.user_id.slice(0, 8)}...</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </>
            )}

            <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={addTeam} disabled={loading}>
              <Plus className="h-3 w-3" /> Adicionar Time
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Teams List / Standings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            Times ({teams.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum time adicionado ainda.</p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-1.5">
                {teams.map((t, idx) => (
                  <div key={t.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${t.eliminated ? 'border-red-500/20 bg-red-500/5 opacity-60' : 'border-border/50 bg-muted/20'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-muted-foreground w-5 text-center">{idx + 1}.</span>
                      <span className="text-sm">{t.club_logo}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold truncate">{t.club_name}</p>
                          <Badge variant="outline" className={`text-[7px] ${t.is_bot ? 'text-orange-400 border-orange-500/30' : 'text-green-400 border-green-500/30'}`}>
                            {t.is_bot ? `🤖 OVR ${t.bot_strength}` : '👤 Real'}
                          </Badge>
                        </div>
                        {selectedTournament.status === 'in_progress' || selectedTournament.status === 'finished' ? (
                          <p className="text-[9px] text-muted-foreground">
                            {t.played}J {t.wins}V {t.draws}E {t.losses}D | {t.goals_for}:{t.goals_against} | <span className="font-bold">{t.points} pts</span>
                          </p>
                        ) : (
                          <p className="text-[9px] text-muted-foreground">
                            {t.is_bot ? `Força: ${t.bot_strength}` : `ID: ${(t.user_id || '').slice(0, 12)}...`}
                          </p>
                        )}
                      </div>
                    </div>
                    {(selectedTournament.status === 'draft' || selectedTournament.status === 'registration') && (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400" onClick={() => removeTeam(t.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
