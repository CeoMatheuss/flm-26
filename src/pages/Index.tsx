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
import { RulesTab } from '@/components/game/RulesTab';
import { UpdatesTab } from '@/components/game/UpdatesTab';
import { FansTab } from '@/components/game/FansTab';
import { TrainingTab } from '@/components/game/TrainingTab';
import { GlobalChatTab } from '@/components/game/GlobalChatTab';
import { NewspaperFullPage } from '@/components/game/NewspaperFullPage';
import { AuctionTab } from '@/components/game/AuctionTab';
import { AdminTab } from '@/components/game/AdminTab';
import { ClubFeedTab } from '@/components/game/ClubFeedTab';
import { UniformsTab, UniformsData } from '@/components/game/UniformsTab';
import { AchievementsTab } from '@/components/game/AchievementsTab';
import { ClubProfileTab } from '@/components/game/ClubProfileTab';
import { CTRoomsTab } from '@/components/game/CTRoomsTab';
import { TrophiesTab } from '@/components/game/TrophiesTab';
import { RankingTab } from '@/components/game/RankingTab';
import { TutorialModal } from '@/components/game/TutorialModal';
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
import { LayoutDashboard, Users, Swords, ShoppingCart, Target, Trophy, DollarSign, Save, LogOut, Building2, GraduationCap, CalendarDays, Handshake, Globe, MoreHorizontal, Settings, Search, Landmark, BookOpen, Sparkles, Heart, Dumbbell, MessageCircle, Newspaper, Gavel, Shirt, Rss, Shield, Medal, User, Home, BarChart3 } from 'lucide-react';
import { NotificationBell } from '@/components/game/NotificationBell';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useEffect, useCallback, useState, useMemo } from 'react';
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
          const loaded = saveRes.data.club_data as unknown as GameState;
          // Migrate old saves: ensure stadium maxLevel is 15
          if (loaded.infrastructure?.stadium && loaded.infrastructure.stadium.maxLevel < 15) {
            loaded.infrastructure.stadium.maxLevel = 15;
          }
          setLoadedState(loaded);
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
      fans: 200,
      players: generateInitialSquad(config.name),
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

  return <GameUI userId={userId} userEmail={userEmail} displayName={displayName} onSignOut={onSignOut} initialState={loadedState} isNewClub={isNewClub} />;
}

function GameUI({ userId, userEmail, displayName, onSignOut, initialState, isNewClub }: { userId: string; userEmail: string; displayName: string; onSignOut: () => void; initialState?: GameState; isNewClub?: boolean }) {
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [showTutorial, setShowTutorial] = useState(!!isNewClub);
  const game = useGame(initialState);
  const mp = useMultiplayer(userId, displayName);

  useEffect(() => {
    supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle().then(({ data }) => {
      setIsAdminRole(!!data);
    });
  }, [userId]);

  const showAdmin = isAdminRole;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uniforms, setUniforms] = useState<UniformsData | undefined>(undefined);

  // Calculate streaks for FansTab
  const { winStreak, loseStreak } = useMemo(() => {
    const playedMatches = game.club.matches.filter(m => m.played);
    let ws = 0, ls = 0;
    for (let i = playedMatches.length - 1; i >= 0; i--) {
      const r = playedMatches[i].result;
      if (!r) break;
      if (r.home > r.away) { if (ls > 0) break; ws++; }
      else if (r.home < r.away) { if (ws > 0) break; ls++; }
      else break;
    }
    return { winStreak: ws, loseStreak: ls };
  }, [game.club.matches]);

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
      <TutorialModal open={showTutorial} onClose={() => setShowTutorial(false)} />
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
              <h1 className="text-sm sm:text-lg font-bold truncate">
                {game.club.name}
              </h1>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 sm:h-10 px-2 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-card border-border z-50 max-h-[70vh] overflow-y-auto">
                {/* Clube */}
                <DropdownMenuItem onClick={() => setActiveTab('fans')} className="gap-2 text-xs"><Heart className="h-3.5 w-3.5" /> Torcida</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('training')} className="gap-2 text-xs"><Dumbbell className="h-3.5 w-3.5" /> Treinos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('youth')} className="gap-2 text-xs"><GraduationCap className="h-3.5 w-3.5" /> Base</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('scouts')} className="gap-2 text-xs"><Search className="h-3.5 w-3.5" /> Olheiros</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('sponsors')} className="gap-2 text-xs"><Handshake className="h-3.5 w-3.5" /> Patrocínios</DropdownMenuItem>
                {/* Estrutura */}
                <DropdownMenuItem onClick={() => setActiveTab('infra')} className="gap-2 text-xs"><Building2 className="h-3.5 w-3.5" /> Infraestrutura</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('stadium')} className="gap-2 text-xs"><Landmark className="h-3.5 w-3.5" /> Estádio</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('finance')} className="gap-2 text-xs"><DollarSign className="h-3.5 w-3.5" /> Finanças</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('season')} className="gap-2 text-xs"><CalendarDays className="h-3.5 w-3.5" /> Temporada</DropdownMenuItem>
                {/* Social */}
                <DropdownMenuItem onClick={() => setActiveTab('chat')} className="gap-2 text-xs"><MessageCircle className="h-3.5 w-3.5" /> Chat Global</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('newspaper')} className="gap-2 text-xs"><Newspaper className="h-3.5 w-3.5" /> Jornal</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('feed')} className="gap-2 text-xs"><Rss className="h-3.5 w-3.5" /> Feed do Clube</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('auction')} className="gap-2 text-xs"><Gavel className="h-3.5 w-3.5" /> Leilão</DropdownMenuItem>
                {/* Sistema */}
                <DropdownMenuItem onClick={() => setActiveTab('uniforms')} className="gap-2 text-xs"><Shirt className="h-3.5 w-3.5" /> Uniformes</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('achievements')} className="gap-2 text-xs"><Medal className="h-3.5 w-3.5" /> Conquistas</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('clubprofile')} className="gap-2 text-xs"><User className="h-3.5 w-3.5" /> Perfil do Clube</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('trophies')} className="gap-2 text-xs"><Trophy className="h-3.5 w-3.5" /> Troféus</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('ranking')} className="gap-2 text-xs"><BarChart3 className="h-3.5 w-3.5" /> Ranking</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('ctrooms')} className="gap-2 text-xs"><Home className="h-3.5 w-3.5" /> Salas do CT</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('settings')} className="gap-2 text-xs"><Settings className="h-3.5 w-3.5" /> Config. Clube</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('updates')} className="gap-2 text-xs"><Sparkles className="h-3.5 w-3.5" /> Atualizações</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowTutorial(true)} className="gap-2 text-xs"><BookOpen className="h-3.5 w-3.5" /> Tutorial</DropdownMenuItem>
                {showAdmin && <DropdownMenuItem onClick={() => setActiveTab('admin')} className="gap-2 text-xs"><Shield className="h-3.5 w-3.5" /> Admin</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>

            <TabsList className="flex-1 grid grid-cols-6 h-auto gap-0.5 bg-card/50 p-1">
              <TabsTrigger value="dashboard" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><LayoutDashboard className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Painel</span></TabsTrigger>
              <TabsTrigger value="squad" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><Users className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Elenco</span></TabsTrigger>
              <TabsTrigger value="matches" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><Swords className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Jogos</span></TabsTrigger>
              <TabsTrigger value="market" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><ShoppingCart className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Mercado</span></TabsTrigger>
              <TabsTrigger value="tactics" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><Target className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Táticas</span></TabsTrigger>
              <TabsTrigger value="league" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><Trophy className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Liga</span></TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard"><DashboardTab club={game.club} events={game.events} infrastructure={game.infrastructure} onOpenNewspaper={() => setActiveTab('newspaper')} /></TabsContent>
          <TabsContent value="squad">
            <SquadTab
              players={game.club.players}
              budget={game.club.budget}
              clubName={game.club.name}
              trainingLevel={game.infrastructure.trainingCenter.level}
              onRest={game.restPlayer}
              onRenewContract={game.renewContract}
              onListForSale={game.listForSale}
              onLoanOut={game.loanOutPlayer}
              onChangeNumber={game.changeShirtNumber}
              canLoanOut={game.loanedPlayers.filter(l => l.direction === 'out').length < 3}
              userId={userId}
              onAuction={async (player) => {
                const halfValue = Math.floor((player.overall * 15000 * (player.age < 25 ? 1.3 : player.age > 30 ? 0.7 : 1)) / 2);
                const { error } = await (await import('@/integrations/supabase/client')).supabase.from('player_auctions').insert([{
                  seller_id: userId,
                  seller_club_name: game.club.name,
                  player_data: player as any,
                  player_name: player.name,
                  player_overall: player.overall,
                  player_age: player.age,
                  min_price: halfValue,
                  current_bid: halfValue,
                }]);
                if (error) {
                  (await import('sonner')).toast.error('Erro ao criar leilão');
                } else {
                  (await import('sonner')).toast.success(`${player.name} colocado em leilão!`);
                }
              }}
            />
          </TabsContent>
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
              loanedPlayers={game.loanedPlayers}
              onBuy={game.buyPlayer}
              onSell={game.sellPlayer}
              onSignFreeAgent={game.signFreeAgent}
              onRefresh={game.refreshMarket}
              onRefreshFreeAgents={game.refreshFreeAgents}
              onLoanOut={game.loanOutPlayer}
              onLoanIn={game.loanInPlayer}
            />
          </TabsContent>
          <TabsContent value="tactics"><TacticsTab tactics={game.tactics} players={game.club.players} onUpdate={game.setTactics} /></TabsContent>
          <TabsContent value="league"><LeagueTab teams={game.leagueTeams} clubName={game.club.name} country={game.club.country} clubPlayers={game.club.players} /></TabsContent>
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
          <TabsContent value="fans">
            <FansTab
              club={game.club}
              winStreak={winStreak}
              loseStreak={loseStreak}
              stadiumLevel={game.infrastructure.stadium.level}
              ticketPrice={game.club.ticketPrice || 30}
            />
          </TabsContent>
          <TabsContent value="training">
            <TrainingTab
              players={game.club.players}
              infrastructure={game.infrastructure}
              trainingFocus={game.trainingFocus}
              onSetTrainingFocus={game.setPlayerTrainingFocus}
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
              onRenameClub={game.renameClub}
              onRenameStadium={game.renameStadium}
            />
          </TabsContent>
          <TabsContent value="rules"><RulesTab /></TabsContent>
          <TabsContent value="updates"><UpdatesTab /></TabsContent>
          <TabsContent value="chat">
            <GlobalChatTab userId={userId} displayName={displayName} clubName={game.club.name} />
          </TabsContent>
          <TabsContent value="newspaper">
            <NewspaperFullPage club={game.club} events={game.events} infrastructure={game.infrastructure} onBack={() => setActiveTab('dashboard')} />
          </TabsContent>
          <TabsContent value="uniforms">
            <UniformsTab primaryColor={game.club.primaryColor} secondaryColor={game.club.secondaryColor} uniforms={uniforms} onSave={setUniforms} sponsors={game.sponsors} players={game.club.players} clubReputation={game.club.reputation} />
          </TabsContent>
          <TabsContent value="auction">
            <AuctionTab userId={userId} clubName={game.club.name} players={game.club.players} budget={game.club.budget} isPremium={true} />
          </TabsContent>
          <TabsContent value="feed">
            <ClubFeedTab feedItems={game.feedItems} onReact={game.reactToFeed} />
          </TabsContent>
          <TabsContent value="achievements">
            <AchievementsTab achievements={game.achievements} />
          </TabsContent>
          <TabsContent value="clubprofile">
            <ClubProfileTab club={game.club} season={game.season.currentSeason} profile={game.clubProfile} onSave={game.updateClubProfile} />
          </TabsContent>
          <TabsContent value="ctrooms">
            <CTRoomsTab rooms={game.ctRooms} budget={game.club.budget} trainingCenterLevel={game.infrastructure.trainingCenter.level} onUpgradeRoom={game.upgradeCTRoom} />
          </TabsContent>
          <TabsContent value="trophies">
            <TrophiesTab trophies={game.clubProfile.trophies || []} />
          </TabsContent>
          <TabsContent value="ranking">
            <RankingTab rating={game.ranking} rankingHistory={game.rankingHistory} clubName={game.club.name} stats={game.club.stats} season={game.season.currentSeason} />
          </TabsContent>
          {showAdmin && (
            <TabsContent value="admin">
              <AdminTab userId={userId} isFounder={isAdminRole} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

export default Index;
