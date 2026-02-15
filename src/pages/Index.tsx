import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCrest } from '@/components/game/ShieldCrest';
import { DashboardTab } from '@/components/game/DashboardTab';
import { SquadTab } from '@/components/game/SquadTab';
import { MatchesTab } from '@/components/game/MatchesTab';
import { MarketTab } from '@/components/game/MarketTab';
import { TacticsTab } from '@/components/game/TacticsTab';
import { LeagueTab } from '@/components/game/LeagueTab';
import { FinanceTab } from '@/components/game/FinanceTab';
import { InfrastructureTab } from '@/components/game/InfrastructureTab';
import { StadiumTab } from '@/components/game/StadiumTab';
import { YouthAcademyTab } from '@/components/game/YouthAcademyTab';
import { SeasonTab } from '@/components/game/SeasonTab';
import { SponsorsTab } from '@/components/game/SponsorsTab';
import { MultiplayerTab } from '@/components/game/MultiplayerTab';
import { ClubSettingsTab } from '@/components/game/ClubSettingsTab';
import { ScoutsTab } from '@/components/game/ScoutsTab';
import { ClubCreation, ClubConfig } from '@/components/game/ClubCreation';
import { initialClub, generateSeasonMatches } from '@/data/initialData';
import { defaultTactics } from '@/types/tactics';
import { initialLeagueTeams, getLeagueTeams } from '@/types/league';
import { defaultInfrastructure, defaultSeason } from '@/types/infrastructure';
import { generateSponsorOffers } from '@/types/sponsor';
import { generateMarketPlayers, generateFreeAgents, generateInitialSquad } from '@/utils/playerGenerator';
import { useGame, GameState } from '@/hooks/useGame';
import { useAuth } from '@/hooks/useAuth';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Swords, ShoppingCart, Target, Trophy, DollarSign, Save, LogOut, Building2, GraduationCap, CalendarDays, Handshake, Globe, MoreHorizontal, Settings, Search, Landmark } from 'lucide-react';
import { NotificationBell } from '@/components/game/NotificationBell';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useEffect, useCallback, useState } from 'react';
import AuthPage from './Auth';
import flmLogo from '@/assets/flm26-logo.png';

const Index = () => {
  const { session, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={flmLogo} alt="FLM 26" className="w-20 h-20 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando FLM 26...</p>
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
  const [isNewClub, setIsNewClub] = useState(false);
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

  const handleClubCreated = useCallback(async (config: ClubConfig) => {
    const customClub = {
      ...initialClub,
      name: config.name,
      stadiumName: config.stadiumName || 'Arena ' + config.name,
      fans: 1,
      players: generateInitialSquad(),
      matches: generateSeasonMatches(config.country),
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      shieldPattern: config.shieldPattern,
      logoUrl: config.logoUrl,
      country: config.country,
    };
    const newState: GameState = {
      club: customClub,
      tactics: defaultTactics,
      leagueTeams: getLeagueTeams(config.country, config.name),
      finances: [],
      marketPlayers: generateMarketPlayers(8),
      freeAgents: generateFreeAgents(12),
      infrastructure: defaultInfrastructure,
      youthProspects: [],
      youthInvestment: 100000,
      season: defaultSeason,
      sponsors: [],
      sponsorOffers: generateSponsorOffers(65, 4),
      events: [],
    };

    const jsonState = JSON.parse(JSON.stringify(newState));
    await supabase.from('game_saves').insert([{ user_id: userId, club_data: jsonState }]);

    setLoadedState(newState);
    setHasSave(true);
    setIsNewClub(true);
    toast.success(`${config.name} criado com sucesso! 🏆`);
  }, [userId]);

  if (!gameReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img src={flmLogo} alt="FLM 26" className="w-16 h-16 animate-pulse" />
      </div>
    );
  }

  if (!hasSave) {
    return <ClubCreation userId={userId} onComplete={handleClubCreated} />;
  }

  return <GameUI userId={userId} displayName={displayName} onSignOut={onSignOut} initialState={loadedState} isNewClub={isNewClub} />;
}

function GameUI({ userId, displayName, onSignOut, initialState, isNewClub }: { userId: string; displayName: string; onSignOut: () => void; initialState?: GameState; isNewClub?: boolean }) {
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
            {game.club.shieldPattern ? (
              <ShieldCrest primaryColor={game.club.primaryColor || '#2563EB'} secondaryColor={game.club.secondaryColor || '#FFF'} pattern={game.club.shieldPattern} size={40} className="shrink-0" />
            ) : game.club.logoUrl ? (
              <img src={game.club.logoUrl} alt={game.club.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shrink-0 object-cover" />
            ) : (
              <img src={flmLogo} alt="FLM 26" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold truncate">{game.club.name}</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                T{game.season.currentSeason} • {game.club.stats.points}pts • <span className="text-primary font-semibold">R$ {(game.club.budget / 1000000).toFixed(1)}M</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <NotificationBell players={game.club.players} budget={game.club.budget} listedPlayers={game.listedForSale} clubName={game.club.name} infrastructure={game.infrastructure} isNewClub={isNewClub} />
            <Button size="sm" variant="outline" onClick={saveGame} className="h-7 sm:h-8 px-2 sm:px-3 text-xs">
              <Save className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Salvar</span>
            </Button>
            <Button size="sm" variant="destructive" onClick={onSignOut} className="h-7 sm:h-8 px-2 sm:px-3 text-xs">
              <LogOut className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Sair</span>
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
                <DropdownMenuItem onClick={() => setActiveTab('stadium')} className="gap-2 text-xs"><Landmark className="h-3.5 w-3.5" /> Estádio</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('scouts')} className="gap-2 text-xs"><Search className="h-3.5 w-3.5" /> Olheiros</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('season')} className="gap-2 text-xs"><CalendarDays className="h-3.5 w-3.5" /> Temporada</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('finance')} className="gap-2 text-xs"><DollarSign className="h-3.5 w-3.5" /> Finanças</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('settings')} className="gap-2 text-xs"><Settings className="h-3.5 w-3.5" /> Config. Clube</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('multiplayer')} className="gap-2 text-xs"><Globe className="h-3.5 w-3.5" /> Multiplayer Online</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="dashboard"><DashboardTab club={game.club} events={game.events} /></TabsContent>
          <TabsContent value="squad"><SquadTab players={game.club.players} budget={game.club.budget} clubName={game.club.name} trainingLevel={game.infrastructure.trainingCenter.level} onRest={game.restPlayer} onRenewContract={game.renewContract} onListForSale={game.listForSale} /></TabsContent>
          <TabsContent value="matches"><MatchesTab matches={game.club.matches} clubName={game.club.name} onSimulate={game.simulateMatch} /></TabsContent>
          <TabsContent value="market">
            <MarketTab
              marketPlayers={game.marketPlayers}
              freeAgents={game.freeAgents}
              clubPlayers={game.club.players}
              budget={game.club.budget}
              clubName={game.club.name}
              listedForSale={game.listedForSale}
              scoutReports={game.club.scoutReports || []}
              onBuy={game.buyPlayer}
              onSell={game.sellPlayer}
              onSignFreeAgent={game.signFreeAgent}
              onRefresh={game.refreshMarket}
              onRefreshFreeAgents={game.refreshFreeAgents}
            />
          </TabsContent>
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
          <TabsContent value="stadium">
            <StadiumTab
              infrastructure={game.infrastructure}
              budget={game.club.budget}
              fans={game.club.fans}
              stadiumName={game.club.stadiumName || 'Arena'}
              ticketPrice={game.club.ticketPrice || 30}
              reputation={game.club.reputation}
              onUpgrade={game.upgradeFacility}
              onSetTicketPrice={game.setTicketPrice}
              onRenameStadium={game.renameStadium}
            />
          </TabsContent>
          <TabsContent value="scouts">
            <ScoutsTab
              scouts={game.club.scouts || []}
              scoutReports={game.club.scoutReports || []}
              matchesSinceLastScout={game.club.matchesSinceLastScout || 0}
              budget={game.club.budget}
              onHireScout={game.hireScout}
              onFireScout={game.fireScout}
            />
          </TabsContent>
          <TabsContent value="season">
            <SeasonTab season={game.season} leagueTeams={game.leagueTeams} clubName={game.club.name} hasUnplayedMatches={game.hasUnplayedMatches} onEndSeason={game.endSeason} />
          </TabsContent>
          <TabsContent value="finance"><FinanceTab budget={game.club.budget} finances={game.finances} totalSalaries={game.totalSalaries} /></TabsContent>
          <TabsContent value="settings">
            <ClubSettingsTab
              clubName={game.club.name}
              stadiumName={game.club.stadiumName || 'Arena'}
              ticketPrice={game.club.ticketPrice || 30}
              onRenameClub={game.renameClub}
              onRenameStadium={game.renameStadium}
              onSetTicketPrice={game.setTicketPrice}
            />
          </TabsContent>
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
