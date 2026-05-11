import { Match, Player } from '@/types/game';
import { TacticsConfig } from '@/types/tactics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Play, Check, Home, Swords, Clock, Calendar, Plane, Globe, Trophy, LogIn, Shuffle, Scale, Users, DollarSign } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ClubShield } from './ClubShield';
import { OnlineFriendliesTab } from './OnlineFriendliesTab';
import { MatchCalendarTab } from './MatchCalendarTab';
import { MatchLobbyScreen } from './MatchLobbyScreen';
import { simulateInstantFriendly, type InstantFriendlyResult } from '@/match/instantFriendly';
import { updateGlobalRanking } from '@/match/rankingUpdater';
import { toast } from 'sonner';

interface Props {
  matches: Match[];
  clubName: string;
  stadiumName: string;
  alreadyPlayedToday: boolean;
  lastFriendlyDate: string;
  players: Player[];
  teamStrength: number;
  tactics: TacticsConfig;
  onGenerateFriendly: () => void;
  userId: string;
  stadiumCapacity: number;
  fans: number;
  applyFanChange: (delta: number, sourceLabel?: string) => void;
}

export function MatchesTab({
  clubName, stadiumName,
  players, teamStrength, tactics, userId, stadiumCapacity, fans, applyFanChange,
}: Props) {
  const navigate = useNavigate();
  const [tournamentMatches, setTournamentMatches] = useState<any[]>([]);
  const [lobbyMatch, setLobbyMatch] = useState<any | null>(null);
  const [simulating, setSimulating] = useState<null | 'bot_balanced' | 'bot_random'>(null);
  const [lastResult, setLastResult] = useState<(InstantFriendlyResult & { mode: 'bot_balanced' | 'bot_random'; moneyReward?: number }) | null>(null);

  useEffect(() => {
    if (!userId) return;
    const loadMatches = async () => {
      const allCompetitionsMatches: any[] = [];

      // 1. National Cup Matches (New System)
      const { data: cupEntry } = await supabase
        .from('national_cup_teams')
        .select('cup_id')
        .eq('user_id', userId)
        .eq('eliminated', false)
        .maybeSingle();

      if (cupEntry) {
        const { data: cupMatches } = await supabase
          .from('national_cup_matches')
          .select(`
            *,
            cup:national_cups(name),
            home:national_cup_teams!home_team_id(club_name, club_logo, user_id),
            away:national_cup_teams!away_team_id(club_name, club_logo, user_id)
          `)
          .eq('cup_id', cupEntry.cup_id)
          .in('status', ['scheduled', 'live'])
          .order('scheduled_at', { ascending: true })
          .limit(5);

        if (cupMatches) {
          allCompetitionsMatches.push(...cupMatches.map(m => ({
            ...m,
            homeName: m.home?.club_name,
            awayName: m.away?.club_name,
            homeLogo: m.home?.club_logo,
            awayLogo: m.away?.club_logo,
            isHome: m.home?.user_id === userId,
            competition: m.cup?.name || 'Copa Nacional',
            stage: `Fase ${m.round}`
          })));
        }
      }

      setTournamentMatches(allCompetitionsMatches);
    };
    loadMatches();
    const channel = supabase.channel('cup-matches-tab')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'national_cup_matches' }, () => loadMatches())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const runInstantBot = async (mode: 'bot_balanced' | 'bot_random') => {
    if (simulating) return;
    setSimulating(mode);
    await new Promise(r => setTimeout(r, 800));
    const result = simulateInstantFriendly({
      mode,
      myClubName: clubName,
      myPlayers: players,
      currentFans: fans,
      isHome: Math.random() > 0.4,
    });

    applyFanChange(result.fanChange, `Amistoso vs BOT (${mode})`);
    const moneyReward = mode === 'bot_balanced' ? 10000 : (Math.floor(Math.random() * 20000) + 5000);
    
    setLastResult({ ...result, mode, moneyReward: result.outcome === 'win' ? moneyReward : (result.outcome === 'draw' ? Math.floor(moneyReward/2) : 0) });
    setSimulating(null);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="bot" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="bot">Amistosos vs BOT</TabsTrigger>
          <TabsTrigger value="tournaments">Copas & Torneios</TabsTrigger>
        </TabsList>

        <TabsContent value="bot" className="space-y-4 mt-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Swords className="h-5 w-5 text-primary" />
                <h3 className="font-bold">Treino de Luxo (vs BOT)</h3>
              </div>
              <p className="text-xs text-muted-foreground">Jogue instantaneamente para ganhar torcida e bônus financeiros.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button onClick={() => runInstantBot('bot_balanced')} disabled={!!simulating} className="h-16 flex flex-col gap-1">
                  <span className="font-bold">Modo Equilibrado</span>
                  <span className="text-[10px] opacity-70">BOT de nível similar</span>
                </Button>
                <Button onClick={() => runInstantBot('bot_random')} disabled={!!simulating} variant="secondary" className="h-16 flex flex-col gap-1">
                  <span className="font-bold">Modo Aleatório</span>
                  <span className="text-[10px] opacity-70">BOT de nível variado</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tournaments" className="mt-4">
          <div className="space-y-3">
            {tournamentMatches.length > 0 ? tournamentMatches.map(m => (
              <Card key={m.id} className="bg-card/40 border-border/50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex-1 text-xs font-bold truncate">{m.homeName}</div>
                  <div className="flex flex-col items-center px-4">
                     <Badge variant="outline" className="text-[8px] mb-1">{m.competition}</Badge>
                     {m.status === 'live' ? (
                       <Badge variant="default" className="bg-red-500 animate-pulse text-[8px] h-4 mb-1">AO VIVO</Badge>
                     ) : (
                       <div className="text-sm font-black">VS</div>
                     )}
                     <span className="text-[8px] text-muted-foreground uppercase">{m.stage}</span>
                     <span className="text-[7px] text-muted-foreground font-bold mt-0.5">{new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex-1 text-xs font-bold text-right truncate">{m.awayName}</div>
                </CardContent>
              </Card>
            )) : (
              <div className="py-10 text-center text-xs text-muted-foreground italic border border-dashed rounded-lg">
                Nenhum jogo oficial de copa agendado no momento.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Resultado Simples */}
      <Dialog open={!!lastResult} onOpenChange={() => setLastResult(null)}>
        <DialogContent className="sm:max-w-md">
           {lastResult && (
             <div className="text-center space-y-4 py-4">
               <h2 className="text-2xl font-black">{lastResult.myGoals} x {lastResult.oppGoals}</h2>
               <p className="text-xs uppercase font-bold text-primary">{lastResult.headline}</p>
               <div className="grid grid-cols-2 gap-2">
                 <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                    <p className="text-[10px] text-muted-foreground uppercase">Torcida</p>
                    <p className="text-lg font-bold text-emerald-400">+{lastResult.fanChange}</p>
                 </div>
                 <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                    <p className="text-[10px] text-muted-foreground uppercase">Prêmio</p>
                    <p className="text-lg font-bold text-primary">R$ {((lastResult.moneyReward || 0)/1000).toFixed(0)}k</p>
                 </div>
               </div>
               <Button onClick={() => setLastResult(null)} className="w-full">Fechar</Button>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
