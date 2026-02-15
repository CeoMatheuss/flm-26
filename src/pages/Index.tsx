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
import { ClubCreation, ClubConfig } from '@/components/game/ClubCreation';
import { initialClub, generateSeasonMatches } from '@/data/initialData';
import { defaultTactics } from '@/types/tactics';
import { initialLeagueTeams } from '@/types/league';
import { defaultInfrastructure, defaultSeason } from '@/types/infrastructure';
import { generateSponsorOffers } from '@/types/sponsor';
import { generateMarketPlayers } from '@/utils/playerGenerator';
import { useGame, GameState } from '@/hooks/useGame';
import { useAuth } from '@/hooks/useAuth';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Swords, ShoppingCart, Target, Trophy, DollarSign, Save, LogOut, Building2, GraduationCap, CalendarDays, Handshake, Globe, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  const [hasSave, setHasSave] = useState(false);
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
          setHasSave(true);
          toast.success('Save carregado!');
        } catch { /* ignore */ }
      }
      setGameReady(true);
    };
    load();
  }, [userId]);

  const handleClubCreated = useCallback((config: ClubConfig) => {
    const customClub = {
      ...initialClub,
      name: config.name,
      matches: generateSeasonMatches(),
    };
    const newState: GameState = {
      club: customClub,
      tactics: defaultTactics,
      leagueTeams: initialLeagueTeams,
      finances: [],
      marketPlayers: generateMarketPlayers(8),
      infrastructure: defaultInfrastructure,
      youthProspects: [],
      youthInvestment: 100000,
      season: defaultSeason,
      sponsors: [],
      sponsorOffers: generateSponsorOffers(65, 4),
      events: [],
    };
    setLoadedState(newState);
    setHasSave(true);
    toast.success(`${config.name} criado com sucesso! 🏆`);
  }, []);

  if (!gameReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img src={fcmLogo} alt="FCM 26" className="w-16 h-16 animate-pulse" />
      </div>
    );
  }

  // Show club creation if no save exists
  if (!hasSave) {
    return <ClubCreation userId={userId} onComplete={handleClubCreated} />;
  }

  return <GameUI userId={userId} displayName={displayName} onSignOut={onSignOut} initialState={loadedState} />;
}

function GameUI({ userId, displayName, onSignOut, initialState }: { userId: string; displayName: string; onSignOut: () => void; initialState?: GameState }) {
  const game = useGame(initialState);
  const mp = useMultiplayer(userId, displayName);
  const [activeTab, setActiveTab] = useState('dashboard');

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
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src={fcmLogo} alt="FCM 26" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold truncate">{game.club.name}</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                T{game.season.currentSeason} • {game.club.stats.points}pts • <span className="text-primary font-semibold">R$ {(game.club.budget / 1000000).toFixed(1)}M</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={saveGame} className="h-7 sm:h-8 px-2 sm:px-3 text-xs">
              <Save className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Salvar</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={onSignOut} className="h-7 sm:h-8 px-2">
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center gap-1 mb-4 sm:mb-6">
            <TabsList className="flex-1 grid grid-cols-6 h-auto gap-0.5 bg-card/50 p-1">
              <TabsTrigger value="dashboard" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><LayoutDashboard className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Painel</span></TabsTrigger>
              <TabsTrigger value="squad" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><Users className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Elenco</span></TabsTrigger>
              <TabsTrigger value="matches" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><Swords className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Jogos</span></TabsTrigger>
              <TabsTrigger value="market" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><ShoppingCart className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Mercado</span></TabsTrigger>
              <TabsTrigger value="tactics" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><Target className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Táticas</span></TabsTrigger>
              <TabsTrigger value="league" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><Trophy className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Liga</span></TabsTrigger>
            </TabsList>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 sm:h-10 px-2 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border-border z-50">
                <DropdownMenuItem onClick={() => setActiveTab('youth')} className="gap-2 text-xs"><GraduationCap className="h-3.5 w-3.5" /> Base / Juvenil</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('sponsors')} className="gap-2 text-xs"><Handshake className="h-3.5 w-3.5" /> Patrocínios</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('infra')} className="gap-2 text-xs"><Building2 className="h-3.5 w-3.5" /> Infraestrutura</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('season')} className="gap-2 text-xs"><CalendarDays className="h-3.5 w-3.5" /> Temporada</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('finance')} className="gap-2 text-xs"><DollarSign className="h-3.5 w-3.5" /> Finanças</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('multiplayer')} className="gap-2 text-xs"><Globe className="h-3.5 w-3.5" /> Multiplayer Online</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="dashboard"><DashboardTab club={game.club} events={game.events} /></TabsContent>
          <TabsContent value="squad"><SquadTab players={game.club.players} budget={game.club.budget} onTrain={game.trainPlayer} onRest={game.restPlayer} /></TabsContent>
          <TabsContent value="matches"><MatchesTab matches={game.club.matches} clubName={game.club.name} onSimulate={game.simulateMatch} /></TabsContent>
          <TabsContent value="market"><MarketTab marketPlayers={game.marketPlayers} clubPlayers={game.club.players} budget={game.club.budget} onBuy={game.buyPlayer} onSell={game.sellPlayer} onRefresh={game.refreshMarket} /></TabsContent>
          <TabsContent value="tactics"><TacticsTab tactics={game.tactics} players={game.club.players} onUpdate={game.setTactics} /></TabsContent>
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
