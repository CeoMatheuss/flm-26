import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardTab } from '@/components/game/DashboardTab';
import { SquadTab } from '@/components/game/SquadTab';
import { MatchesTab } from '@/components/game/MatchesTab';
import { MarketTab } from '@/components/game/MarketTab';
import { TacticsTab } from '@/components/game/TacticsTab';
import { LeagueTab } from '@/components/game/LeagueTab';
import { FinanceTab } from '@/components/game/FinanceTab';
import { useGame } from '@/hooks/useGame';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Swords, ShoppingCart, Target, Trophy, DollarSign, Save, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useCallback } from 'react';
import AuthPage from './Auth';

const Index = () => {
  const { session, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">⚽</div>
          <p className="text-muted-foreground">Carregando FCM 26...</p>
        </div>
      </div>
    );
  }

  if (!session) return <AuthPage />;

  return <GameApp userId={session.user.id} onSignOut={signOut} />;
};

function GameApp({ userId, onSignOut }: { userId: string; onSignOut: () => void }) {
  const game = useGame();

  // Load save on mount
  useEffect(() => {
    const loadSave = async () => {
      const { data } = await supabase
        .from('game_saves')
        .select('club_data')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.club_data) {
        // We have a save - but since useGame manages state internally,
        // we'd need to reload. For now, saves work on explicit save/load.
        toast.info('Save encontrado! Use o botão salvar para manter seu progresso.');
      }
    };
    loadSave();
  }, [userId]);

  const saveGame = useCallback(async () => {
    const state = game.getFullState();
    const { data: existing } = await supabase
      .from('game_saves')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase.from('game_saves').update({ club_data: JSON.parse(JSON.stringify(state)) }).eq('id', existing.id);
    } else {
      await supabase.from('game_saves').insert([{ user_id: userId, club_data: JSON.parse(JSON.stringify(state)) }]);
    }
    toast.success('Jogo salvo!');
  }, [game, userId]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-r from-primary/10 via-background to-primary/10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">⚽</div>
            <div>
              <h1 className="text-xl font-bold">{game.club.name}</h1>
              <p className="text-xs text-muted-foreground">Football Club Manager 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-emerald-400 mr-2">R$ {(game.club.budget / 1000000).toFixed(2)}M</p>
            <Button size="sm" variant="outline" onClick={saveGame}>
              <Save className="h-3 w-3 mr-1" /> Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={onSignOut}>
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard">
          <TabsList className="w-full mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="gap-1 text-xs">
              <LayoutDashboard className="h-3 w-3" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="squad" className="gap-1 text-xs">
              <Users className="h-3 w-3" /> Elenco
            </TabsTrigger>
            <TabsTrigger value="matches" className="gap-1 text-xs">
              <Swords className="h-3 w-3" /> Partidas
            </TabsTrigger>
            <TabsTrigger value="market" className="gap-1 text-xs">
              <ShoppingCart className="h-3 w-3" /> Mercado
            </TabsTrigger>
            <TabsTrigger value="tactics" className="gap-1 text-xs">
              <Target className="h-3 w-3" /> Táticas
            </TabsTrigger>
            <TabsTrigger value="league" className="gap-1 text-xs">
              <Trophy className="h-3 w-3" /> Liga
            </TabsTrigger>
            <TabsTrigger value="finance" className="gap-1 text-xs">
              <DollarSign className="h-3 w-3" /> Finanças
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab club={game.club} />
          </TabsContent>
          <TabsContent value="squad">
            <SquadTab players={game.club.players} budget={game.club.budget} onTrain={game.trainPlayer} onRest={game.restPlayer} />
          </TabsContent>
          <TabsContent value="matches">
            <MatchesTab matches={game.club.matches} clubName={game.club.name} onSimulate={game.simulateMatch} />
          </TabsContent>
          <TabsContent value="market">
            <MarketTab marketPlayers={game.marketPlayers} clubPlayers={game.club.players} budget={game.club.budget} onBuy={game.buyPlayer} onSell={game.sellPlayer} onRefresh={game.refreshMarket} />
          </TabsContent>
          <TabsContent value="tactics">
            <TacticsTab tactics={game.tactics} onUpdate={game.setTactics} />
          </TabsContent>
          <TabsContent value="league">
            <LeagueTab teams={game.leagueTeams} clubName={game.club.name} />
          </TabsContent>
          <TabsContent value="finance">
            <FinanceTab budget={game.club.budget} finances={game.finances} totalSalaries={game.totalSalaries} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default Index;
