import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardTab } from '@/components/game/DashboardTab';
import { SquadTab } from '@/components/game/SquadTab';
import { MatchesTab } from '@/components/game/MatchesTab';
import { MarketTab } from '@/components/game/MarketTab';
import { TacticsTab } from '@/components/game/TacticsTab';
import { LeagueTab } from '@/components/game/LeagueTab';
import { FinanceTab } from '@/components/game/FinanceTab';
import { InfrastructureTab } from '@/components/game/InfrastructureTab';
import { YouthAcademyTab } from '@/components/game/YouthAcademyTab';
import { SeasonTab } from '@/components/game/SeasonTab';
import { SponsorsTab } from '@/components/game/SponsorsTab';
import { MultiplayerTab } from '@/components/game/MultiplayerTab';
import { useGame, GameState } from '@/hooks/useGame';
import { useAuth } from '@/hooks/useAuth';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Swords, ShoppingCart, Target, Trophy, DollarSign, Save, LogOut, Building2, GraduationCap, CalendarDays, Handshake, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useCallback, useState } from 'react';
import AuthPage from './Auth';
import fcmLogo from '@/assets/fcm26-logo.png';

const Index = () => {
  const { session, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={fcmLogo} alt="FCM 26" className="w-20 h-20 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando FCM 26...</p>
        </div>
      </div>
    );
  }

  if (!session) return <AuthPage />;
  return <GameApp userId={session.user.id} userEmail={session.user.email || ''} onSignOut={signOut} />;
};

function GameApp({ userId, userEmail, onSignOut }: { userId: string; userEmail: string; onSignOut: () => void }) {
  const [loadedState, setLoadedState] = useState<GameState | undefined>(undefined);
  const [gameReady, setGameReady] = useState(false);
  const [displayName, setDisplayName] = useState('Manager');

  useEffect(() => {
    const load = async () => {
      const [saveRes, profileRes] = await Promise.all([
        supabase.from('game_saves').select('club_data').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('profiles').select('display_name').eq('user_id', userId).maybeSingle(),
      ]);

      if (profileRes.data?.display_name) setDisplayName(profileRes.data.display_name);
      if (saveRes.data?.club_data) {
        try {
          setLoadedState(saveRes.data.club_data as unknown as GameState);
          toast.success('Save carregado!');
        } catch { /* ignore */ }
      }
      setGameReady(true);
    };
    load();
  }, [userId]);

  if (!gameReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img src={fcmLogo} alt="FCM 26" className="w-16 h-16 animate-pulse" />
      </div>
    );
  }

  return <GameUI userId={userId} displayName={displayName} onSignOut={onSignOut} initialState={loadedState} />;
}

function GameUI({ userId, displayName, onSignOut, initialState }: { userId: string; displayName: string; onSignOut: () => void; initialState?: GameState }) {
  const game = useGame(initialState);
  const mp = useMultiplayer(userId, displayName);

  const saveGame = useCallback(async () => {
    const state = game.getFullState();
    const jsonState = JSON.parse(JSON.stringify(state));
    const { data: existing } = await supabase
      .from('game_saves')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase.from('game_saves').update({ club_data: jsonState }).eq('id', existing.id);
    } else {
      await supabase.from('game_saves').insert([{ user_id: userId, club_data: jsonState }]);
    }
    toast.success('Jogo salvo!');
  }, [game, userId]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={fcmLogo} alt="FCM 26" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-lg font-bold">{game.club.name}</h1>
              <p className="text-xs text-muted-foreground">T{game.season.currentSeason} • {game.club.stats.points}pts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-primary mr-2 hidden sm:block">R$ {(game.club.budget / 1000000).toFixed(2)}M</p>
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
          <TabsList className="w-full mb-6 flex-wrap h-auto gap-1 bg-card/50">
            <TabsTrigger value="dashboard" className="gap-1 text-xs"><LayoutDashboard className="h-3 w-3" /> Painel</TabsTrigger>
            <TabsTrigger value="squad" className="gap-1 text-xs"><Users className="h-3 w-3" /> Elenco</TabsTrigger>
            <TabsTrigger value="matches" className="gap-1 text-xs"><Swords className="h-3 w-3" /> Jogos</TabsTrigger>
            <TabsTrigger value="market" className="gap-1 text-xs"><ShoppingCart className="h-3 w-3" /> Mercado</TabsTrigger>
            <TabsTrigger value="tactics" className="gap-1 text-xs"><Target className="h-3 w-3" /> Táticas</TabsTrigger>
            <TabsTrigger value="league" className="gap-1 text-xs"><Trophy className="h-3 w-3" /> Liga</TabsTrigger>
            <TabsTrigger value="youth" className="gap-1 text-xs"><GraduationCap className="h-3 w-3" /> Base</TabsTrigger>
            <TabsTrigger value="sponsors" className="gap-1 text-xs"><Handshake className="h-3 w-3" /> Patrocínio</TabsTrigger>
            <TabsTrigger value="infra" className="gap-1 text-xs"><Building2 className="h-3 w-3" /> Estrutura</TabsTrigger>
            <TabsTrigger value="season" className="gap-1 text-xs"><CalendarDays className="h-3 w-3" /> Temporada</TabsTrigger>
            <TabsTrigger value="finance" className="gap-1 text-xs"><DollarSign className="h-3 w-3" /> Finanças</TabsTrigger>
            <TabsTrigger value="multiplayer" className="gap-1 text-xs"><Globe className="h-3 w-3" /> Online</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><DashboardTab club={game.club} /></TabsContent>
          <TabsContent value="squad"><SquadTab players={game.club.players} budget={game.club.budget} onTrain={game.trainPlayer} onRest={game.restPlayer} /></TabsContent>
          <TabsContent value="matches"><MatchesTab matches={game.club.matches} clubName={game.club.name} onSimulate={game.simulateMatch} /></TabsContent>
          <TabsContent value="market"><MarketTab marketPlayers={game.marketPlayers} clubPlayers={game.club.players} budget={game.club.budget} onBuy={game.buyPlayer} onSell={game.sellPlayer} onRefresh={game.refreshMarket} /></TabsContent>
          <TabsContent value="tactics"><TacticsTab tactics={game.tactics} onUpdate={game.setTactics} /></TabsContent>
          <TabsContent value="league"><LeagueTab teams={game.leagueTeams} clubName={game.club.name} /></TabsContent>
          <TabsContent value="youth">
            <YouthAcademyTab
              prospects={game.youthProspects}
              academyLevel={game.infrastructure.youthAcademy.level}
              monthlyInvestment={game.youthInvestment}
              budget={game.club.budget}
              onPromote={game.promoteYouth}
              onSetInvestment={game.setYouthInvestment}
              onGenerateYouth={() => {}}
            />
          </TabsContent>
          <TabsContent value="sponsors">
            <SponsorsTab
              sponsors={game.sponsors}
              offers={game.sponsorOffers}
              reputation={game.club.reputation}
              onAccept={game.acceptSponsor}
              onRefreshOffers={game.refreshSponsorOffers}
            />
          </TabsContent>
          <TabsContent value="infra"><InfrastructureTab infrastructure={game.infrastructure} budget={game.club.budget} onUpgrade={game.upgradeFacility} /></TabsContent>
          <TabsContent value="season">
            <SeasonTab season={game.season} leagueTeams={game.leagueTeams} clubName={game.club.name} hasUnplayedMatches={game.hasUnplayedMatches} onEndSeason={game.endSeason} />
          </TabsContent>
          <TabsContent value="finance"><FinanceTab budget={game.club.budget} finances={game.finances} totalSalaries={game.totalSalaries} /></TabsContent>
          <TabsContent value="multiplayer">
            <MultiplayerTab
              userId={userId}
              leagues={mp.leagues}
              currentLeague={mp.currentLeague}
              members={mp.members}
              chatMessages={mp.chatMessages}
              privateMessages={mp.privateMessages}
              proposals={mp.proposals}
              rivalries={mp.rivalries}
              loading={mp.loading}
              onCreateLeague={mp.createLeague}
              onJoinLeague={mp.joinLeague}
              onEnterLeague={mp.enterLeague}
              onLeaveLeague={mp.leaveLeague}
              onSendChat={mp.sendChat}
              onSendPrivateMessage={mp.sendPrivateMessage}
              onSendProposal={mp.sendProposal}
              onRespondProposal={mp.respondProposal}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default Index;
