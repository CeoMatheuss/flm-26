import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCrest } from '@/components/game/ShieldCrest';
import { DashboardTab } from '@/components/game/DashboardTab';
import { SquadTab } from '@/components/game/SquadTab';
import { MatchesTab } from '@/components/game/MatchesTab';

import { TacticsTab } from '@/components/game/TacticsTab';
import { LeagueTab } from '@/components/game/LeagueTab';
import { MatchCalendarTab } from '@/components/game/MatchCalendarTab';
import { FinanceTab } from '@/components/game/FinanceTab';
import { InfrastructureTab } from '@/components/game/InfrastructureTab';
import { StadiumTab } from '@/components/game/StadiumTab';
import { YouthAcademyTab } from '@/components/game/YouthAcademyTab';

import { SponsorsTab } from '@/components/game/SponsorsTab';
import { MultiplayerTab } from '@/components/game/MultiplayerTab';

import { ScoutsTab } from '@/components/game/ScoutsTab';
import { RulesTab } from '@/components/game/RulesTab';
import { UpdatesTab } from '@/components/game/UpdatesTab';
import { FansTab } from '@/components/game/FansTab';
import { TrainingTab } from '@/components/game/TrainingTab';
import { GlobalChatTab } from '@/components/game/GlobalChatTab';
import { NewspaperFullPage } from '@/components/game/NewspaperFullPage';
import { AuctionTab } from '@/components/game/AuctionTab';
import { OnlineFriendliesTab } from '@/components/game/OnlineFriendliesTab';
import { OnlineMarketTab } from '@/components/game/OnlineMarketTab';
import { AdminTab } from '@/components/game/AdminTab';
import { ClubFeedTab } from '@/components/game/ClubFeedTab';
import { UniformsTab, UniformsData } from '@/components/game/UniformsTab';
import { AchievementsTab } from '@/components/game/AchievementsTab';
import { ClubProfileTab } from '@/components/game/ClubProfileTab';
import { CTRoomsTab } from '@/components/game/CTRoomsTab';
import { TrophiesTab } from '@/components/game/TrophiesTab';
import { RankingTab } from '@/components/game/RankingTab';
import { PacotinhosTab } from '@/components/game/PacotinhosTab';
import { TutorialModal } from '@/components/game/TutorialModal';
import { ClubCreation, ClubConfig } from '@/components/game/ClubCreation';
import { initialClub } from '@/data/initialData';
import { defaultTactics } from '@/types/tactics';
import { initialLeagueTeams, getLeagueTeams } from '@/types/league';
import { defaultInfrastructure, defaultSeason } from '@/types/infrastructure';
import { generateSponsorOffers } from '@/types/sponsor';
import { generateMarketPlayers, generateFreeAgents, generateInitialSquad } from '@/utils/playerGenerator';
import { getStadiumCapacity } from '@/types/infrastructure';
import { useGame, GameState } from '@/hooks/useGame';
import { useAuth } from '@/hooks/useAuth';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { supabase } from '@/integrations/supabase/client';
import { usePresence } from '@/hooks/usePresence';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Swords, ShoppingCart, Target, Trophy, DollarSign, Save, LogOut, Building2, GraduationCap, CalendarDays, Handshake, Globe, MoreHorizontal, Settings, Search, Landmark, BookOpen, Sparkles, Heart, Dumbbell, MessageCircle, Newspaper, Gavel, Shirt, Rss, Shield, Medal, User, Home, BarChart3, Calendar, Gift } from 'lucide-react';
import { NotificationBell } from '@/components/game/NotificationBell';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
      fans: 500,
      players: generateInitialSquad(config.name),
      matches: [], // friendlies generated on demand only
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      shieldPattern: config.shieldPattern,
      shieldShape: config.shieldShape,
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
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [showTutorial, setShowTutorial] = useState(!!isNewClub);
  const game = useGame(initialState, userId);
  const mp = useMultiplayer(userId, displayName, game.club.name, game.club.country);
  usePresence(userId);

  // Handle match result from MatchResultLocker via navigation state (Bug #1 fix)
  // MatchResultLocker navigates to '/' with serverMatchResult in state after persist().
  // We read the real goals from the server and call applyServerResult() — never simulateMatch().
  useEffect(() => {
    const st = location.state as {
      serverMatchResult?: { matchDbId: string; homeGoals: number; awayGoals: number };
      matchResult?: { matchId: string }; // legacy fallback (offline)
    } | null;

    if (st?.serverMatchResult) {
      // New path: result came from MatchResultLocker with real server goals
      const { matchDbId, homeGoals, awayGoals } = st.serverMatchResult;
      console.log('[Index] serverMatchResult received:', { matchDbId, homeGoals, awayGoals });

      // Find the local match entry that corresponds to this server match
      const pendingMatch = game.club.matches.find(m => m.id === matchDbId && !m.played);
      if (pendingMatch) {
        game.applyServerResult({
          matchId: matchDbId,
          homeGoals,
          awayGoals,
          isHome: pendingMatch.isHome ?? true,
        });
      } else {
        // Fallback: try any unplayed match (matchDbId from Edge Function may differ from local id)
        const anyUnplayed = game.club.matches.find(m => !m.played);
        if (anyUnplayed) {
          console.log('[Index] Applying server result to first unplayed match:', anyUnplayed.id);
          game.applyServerResult({
            matchId: anyUnplayed.id,
            homeGoals,
            awayGoals,
            isHome: anyUnplayed.isHome ?? true,
          });
        }
      }

      // Clean finished live_match from DB to avoid re-processing
      supabase.from('live_matches').delete().eq('match_id', matchDbId).then(() => {
        console.log('[Index] Cleaned up live_match for match_id:', matchDbId);
      });

      navigate('/', { replace: true, state: {} });
      return;
    }

    // Legacy offline path REMOVED — no more simulateMatch() calls

    // Check for stale finished server-side matches (safety net — runs once on mount)
    // Uses applyServerResult() — NEVER simulateMatch()
    // Guard: skip if serverMatchResult was already processed above
    if (!st?.serverMatchResult) {
      const checkFinished = async () => {
        const { data: finishedMatches } = await supabase
          .from('live_matches')
          .select('match_id, home_goals, away_goals, is_home, id, status')
          .eq('status', 'finished')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!finishedMatches || finishedMatches.length === 0) return;

        const fm = finishedMatches[0];
        console.log('[Index] checkFinished: found stale finished match:', fm);

        // Delete FIRST to prevent race condition with double-processing
        await supabase.from('live_matches').delete().eq('id', fm.id);

        // Only process if there is a corresponding unplayed local match
        const localMatch = game.club.matches.find(m => m.id === fm.match_id && !m.played)
          ?? game.club.matches.find(m => !m.played);

        if (!localMatch) {
          console.log('[Index] checkFinished: no unplayed match found, cleaned up stale record');
          return;
        }

        // Apply real server result — no recalculation
        game.applyServerResult({
          matchId: localMatch.id,
          homeGoals: fm.home_goals,
          awayGoals: fm.away_goals,
          isHome: fm.is_home ?? localMatch.isHome ?? true,
        });

        console.log('[Index] checkFinished: applied and cleaned up match:', fm.id);
      };

      checkFinished();
    }
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Server-side admin check only via user_roles table
    supabase.from('user_roles').select('role').eq('user_id', userId).then(({ data }) => {
      const roles = (data || []).map(r => r.role);
      setIsAdminRole(roles.includes('admin'));
      // Founder is still an admin role but we check specifically for the auto-assigned admin
      // The founder detection relies on the server-side auto_assign_admin trigger
      setIsFounder(roles.includes('admin') && userEmail === 'fcmsistemas7@gmail.com');
    });
  }, [userId, userEmail]);

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

  const saveGame = useCallback(async (silent = false) => {
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
    if (!silent) toast.success('Jogo salvo!');
  }, [game, userId]);

  // Auto-save on every state change (debounced 2s) + fallback every 30s
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameState = game.getFullState();

  useEffect(() => {
    // Debounced save: triggers 2s after any state change
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveGame(true);
    }, 2000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [gameState, saveGame]);

  return (
    <div className="min-h-screen bg-background">
      <TutorialModal open={showTutorial} onClose={() => setShowTutorial(false)} onComplete={() => {
        game.addBonus(500000, 'Recompensa por completar o Tutorial');
        toast.success('🎉 Tutorial completo! Você ganhou R$500.000!');
      }} />
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {game.club.shieldPattern ? (
              <ShieldCrest primaryColor={game.club.primaryColor || '#2563EB'} secondaryColor={game.club.secondaryColor || '#FFF'} pattern={game.club.shieldPattern} shape={(game.club as any).shieldShape || 'classic'} size={40} className="shrink-0" />
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
            <NotificationBell players={game.club.players} budget={game.club.budget} listedPlayers={game.listedForSale} clubName={game.club.name} infrastructure={game.infrastructure} isNewClub={isNewClub} userId={userId} />
            <Button size="sm" variant="destructive" onClick={onSignOut} className="h-7 sm:h-8 px-2 sm:px-3 text-xs">
              <LogOut className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
        {/* Live match banner is now handled by MatchDashboardCard in the dashboard tab via DB polling */}
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
              <DropdownMenuContent align="start" className="w-52 bg-card border-border z-50 max-h-[70vh] overflow-y-auto">
                <DropdownMenuItem onClick={() => setActiveTab('calendar')} className="gap-2 text-xs"><Calendar className="h-3.5 w-3.5" /> Calendário</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('training')} className="gap-2 text-xs"><Dumbbell className="h-3.5 w-3.5" /> Treinos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('youth')} className="gap-2 text-xs"><GraduationCap className="h-3.5 w-3.5" /> Base</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('scouts')} className="gap-2 text-xs"><Search className="h-3.5 w-3.5" /> Olheiros</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('finance')} className="gap-2 text-xs"><DollarSign className="h-3.5 w-3.5" /> Finanças</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('stadium')} className="gap-2 text-xs"><Landmark className="h-3.5 w-3.5" /> Estádio</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('infra')} className="gap-2 text-xs"><Building2 className="h-3.5 w-3.5" /> Infraestrutura</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('sponsors')} className="gap-2 text-xs"><Handshake className="h-3.5 w-3.5" /> Patrocínios</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('fans')} className="gap-2 text-xs"><Heart className="h-3.5 w-3.5" /> Torcida</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('ctrooms')} className="gap-2 text-xs"><Home className="h-3.5 w-3.5" /> Salas do CT</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('uniforms')} className="gap-2 text-xs"><Shirt className="h-3.5 w-3.5" /> Uniformes</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('auction')} className="gap-2 text-xs"><Gavel className="h-3.5 w-3.5" /> Leilão</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('pacotinhos')} className="gap-2 text-xs"><Gift className="h-3.5 w-3.5" /> Pacotinhos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('chat')} className="gap-2 text-xs"><MessageCircle className="h-3.5 w-3.5" /> Chat Global</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('matches')} className="gap-2 text-xs"><Swords className="h-3.5 w-3.5" /> Amistoso</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('achievements')} className="gap-2 text-xs"><Medal className="h-3.5 w-3.5" /> Conquistas</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('trophies')} className="gap-2 text-xs"><Trophy className="h-3.5 w-3.5" /> Troféus</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('ranking')} className="gap-2 text-xs"><BarChart3 className="h-3.5 w-3.5" /> Ranking</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('clubprofile')} className="gap-2 text-xs"><User className="h-3.5 w-3.5" /> Perfil do Clube</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('updates')} className="gap-2 text-xs"><Sparkles className="h-3.5 w-3.5" /> Atualizações</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowTutorial(true)} className="gap-2 text-xs"><BookOpen className="h-3.5 w-3.5" /> Tutorial</DropdownMenuItem>
                {showAdmin && <DropdownMenuItem onClick={() => setActiveTab('admin')} className="gap-2 text-xs"><Shield className="h-3.5 w-3.5" /> Admin</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>

            <TabsList className="flex-1 grid grid-cols-6 h-auto gap-0.5 bg-card/50 p-1">
              <TabsTrigger value="dashboard" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><LayoutDashboard className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Painel</span></TabsTrigger>
              <TabsTrigger value="journal" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><Newspaper className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Jornal</span></TabsTrigger>
              <TabsTrigger value="squad" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><Users className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Elenco</span></TabsTrigger>
              <TabsTrigger value="tactics" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><Target className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Táticas</span></TabsTrigger>
              <TabsTrigger value="league" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><Globe className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Liga</span></TabsTrigger>
              <TabsTrigger value="market" className="gap-0.5 text-[10px] sm:text-xs px-1 sm:px-3 flex flex-col sm:flex-row items-center py-1.5"><ShoppingCart className="h-3.5 w-3.5 sm:h-3 sm:w-3" /><span className="text-[8px] sm:text-xs leading-tight">Mercado</span></TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard"><DashboardTab club={game.club} events={game.events} infrastructure={game.infrastructure} onOpenNewspaper={() => setActiveTab('journal')} onGoToFriendly={() => setActiveTab('matches')} userId={userId} /></TabsContent>
          <TabsContent value="calendar"><MatchCalendarTab userId={userId} clubName={game.club.name} /></TabsContent>
          <TabsContent value="squad">
            <SquadTab
              players={game.club.players}
              budget={game.club.budget}
              clubName={game.club.name}
              trainingLevel={game.infrastructure.trainingCenter.level}
              onRest={game.restPlayer}
              onRenewContract={game.renewContract}
              onListForSale={async (playerId: string) => {
                const player = game.club.players.find(p => p.id === playerId);
                if (!player) return;
                if (game.club.players.length <= 11) { toast.error('Elenco muito pequeno para vender!'); return; }
                const askingPrice = (await import('@/utils/playerGenerator')).getPlayerValue(player);
                const res = await supabase.functions.invoke('process-transfer', {
                  body: {
                    action: 'list',
                    playerData: player,
                    playerName: player.name,
                    playerPosition: player.position,
                    playerOverall: player.overall,
                    playerAge: player.age,
                    askingPrice,
                    clubName: game.club.name,
                    sellerShield: game.club.shieldPattern ? { primaryColor: game.club.primaryColor || '#2563EB', secondaryColor: game.club.secondaryColor || '#FFF', pattern: game.club.shieldPattern, shape: (game.club as any).shieldShape || 'classic' } : null,
                  },
                });
                if (res.error || res.data?.error) {
                  toast.error(res.data?.error || 'Erro ao listar jogador');
                } else {
                  toast.success(`${player.name} listado no mercado por R$${(askingPrice / 1000).toFixed(0)}k!`);
                  setActiveTab('market');
                }
              }}
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
          <TabsContent value="league">
            <MultiplayerTab
              userId={userId}
              leagues={mp.leagues}
              currentLeague={mp.currentLeague}
              members={mp.members}
              chatMessages={mp.chatMessages}
              privateMessages={mp.privateMessages}
              proposals={mp.proposals}
              rivalries={mp.rivalries}
              leagueMatches={mp.leagueMatches}
              leagueSquads={mp.leagueSquads}
              loading={mp.loading}
              autoJoining={mp.autoJoining}
              clubPlayers={game.club.players}
              clubTactics={game.tactics}
              clubShield={{
                primaryColor: game.club.primaryColor || '#1a365d',
                secondaryColor: game.club.secondaryColor || '#f6e05e',
                pattern: game.club.shieldPattern || 'classic',
                shape: game.club.shieldShape || 'classic',
              }}
              onEnterLeague={mp.enterLeague}
              onLeaveLeague={mp.leaveLeague}
              onSendChat={mp.sendChat}
              onSendPrivateMessage={mp.sendPrivateMessage}
              onSendProposal={mp.sendProposal}
              onRespondProposal={mp.respondProposal}
              onSyncSquad={mp.syncSquad}
              onStartSeason={mp.startSeason}
              onSimulateRound={mp.simulateRound}
              onEndSeason={mp.endSeason}
            />
          </TabsContent>
          <TabsContent value="market">
            <OnlineMarketTab
              userId={userId}
              clubName={game.club.name}
              players={game.club.players}
              budget={game.club.budget}
              clubShield={game.club.shieldPattern ? { primaryColor: game.club.primaryColor || '#2563EB', secondaryColor: game.club.secondaryColor || '#FFF', pattern: game.club.shieldPattern, shape: (game.club as any).shieldShape || 'classic' } : null}
              onPlayerSold={(playerId, price) => {
                game.sellPlayer(game.club.players.find(p => p.id === playerId)!);
              }}
              onPlayerBought={(playerData, price, salary, contractYears) => {
                game.buyPlayer({ ...playerData, salary, contract: contractYears });
              }}
              loanedPlayers={game.loanedPlayers}
              onLoanOut={async (playerId: string) => {
                const player = game.club.players.find(p => p.id === playerId);
                if (!player) return;
                if (game.club.players.length <= 11) { toast.error('Elenco muito pequeno para emprestar!'); return; }
                const res = await supabase.functions.invoke('process-transfer', {
                  body: {
                    action: 'loan-list',
                    playerData: player,
                    playerName: player.name,
                    playerPosition: player.position,
                    playerOverall: player.overall,
                    playerAge: player.age,
                    salary: player.salary || 0,
                    clubName: game.club.name,
                    sellerShield: game.club.shieldPattern ? { primaryColor: game.club.primaryColor || '#2563EB', secondaryColor: game.club.secondaryColor || '#FFF', pattern: game.club.shieldPattern, shape: (game.club as any).shieldShape || 'classic' } : null,
                  },
                });
                if (res.error || res.data?.error) {
                  toast.error(res.data?.error || 'Erro ao listar para empréstimo');
                } else {
                  toast.success(`${player.name} listado no mercado de empréstimos!`);
                }
              }}
              onLoanIn={game.loanInPlayer}
              onListedPlayer={() => setActiveTab('market')}
            />
          </TabsContent>
          <TabsContent value="tactics"><TacticsTab tactics={game.tactics} players={game.club.players} onUpdate={game.setTactics} /></TabsContent>
          
          <TabsContent value="youth">
            <YouthAcademyTab
              prospects={game.youthProspects}
              academyLevel={game.infrastructure.youthAcademy.level}
              monthlyInvestment={game.youthInvestment}
              budget={game.club.budget}
              hasScouts={(game.club.scouts?.length ?? 0) > 0}
              onPromote={game.promoteYouth}
              onSetInvestment={game.setYouthInvestment}
              onGenerateYouth={() => {}}
              onUpgradeAcademy={() => game.upgradeFacility('youthAcademy')}
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
              tactics={game.tactics}
              onPlayersUpdate={game.updatePlayers}
              currentWeek={game.season.currentWeek}
            />
          </TabsContent>
          <TabsContent value="matches">
            <MatchesTab 
              matches={game.club.matches} 
              clubName={game.club.name} 
              stadiumName={game.club.stadiumName} 
              alreadyPlayedToday={game.alreadyPlayedToday}
              lastFriendlyDate={game.lastFriendlyDate}
              players={game.club.players}
              teamStrength={Math.round(game.club.players.reduce((s, p) => s + p.overall, 0) / Math.max(1, game.club.players.length))}
              tactics={game.tactics}
              onGenerateFriendly={game.generateFriendly}
              userId={userId}
              stadiumCapacity={getStadiumCapacity(game.infrastructure.stadium.level)}
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
          <TabsContent value="finance"><FinanceTab budget={game.club.budget} finances={game.finances} totalSalaries={game.totalSalaries} players={game.club.players} scouts={game.club.scouts} sponsors={game.sponsors} infrastructure={game.infrastructure} fans={game.club.fans} ticketPrice={game.club.ticketPrice} youthInvestment={game.youthInvestment} /></TabsContent>
          <TabsContent value="rules"><RulesTab /></TabsContent>
          <TabsContent value="updates"><UpdatesTab /></TabsContent>
          <TabsContent value="chat">
            <GlobalChatTab userId={userId} displayName={displayName} clubName={game.club.name} />
          </TabsContent>
          <TabsContent value="journal">
            <Tabs defaultValue="news" className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="news" className="text-xs gap-1"><Newspaper className="h-3 w-3" /> Notícias</TabsTrigger>
                <TabsTrigger value="feed" className="text-xs gap-1"><Rss className="h-3 w-3" /> Feed do Clube</TabsTrigger>
              </TabsList>
              <TabsContent value="news">
                <NewspaperFullPage club={game.club} events={game.events} infrastructure={game.infrastructure} onBack={() => setActiveTab('dashboard')} />
              </TabsContent>
              <TabsContent value="feed">
                <ClubFeedTab feedItems={game.feedItems} onReact={game.reactToFeed} />
              </TabsContent>
            </Tabs>
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
          <TabsContent value="pacotinhos">
            <PacotinhosTab
              budget={game.club.budget}
              userId={userId}
              onBuyPack={(newPlayers, cost) => {
                game.addPackPlayers(newPlayers, cost);
              }}
            />
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
              <AdminTab userId={userId} isFounder={isFounder} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

export default Index;
