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
import { TrainingWrapper } from '@/components/game/TrainingWrapper';
import { GlobalChatTab } from '@/components/game/GlobalChatTab';
import { NewspaperFullPage } from '@/components/game/NewspaperFullPage';
import { AuctionTab } from '@/components/game/AuctionTab';
import { OnlineFriendliesTab } from '@/components/game/OnlineFriendliesTab';
import { OnlineMarketTab } from '@/components/game/OnlineMarketTab';
import { AdminTab } from '@/components/game/AdminTab';
import { MaintenanceScreen } from '@/components/game/MaintenanceScreen';
import { UpdatePopupWidget } from '@/components/game/UpdatePopupWidget';

import { UniformsTab, UniformsData } from '@/components/game/UniformsTab';
import { AchievementsTab } from '@/components/game/AchievementsTab';
import { ClubProfileTab } from '@/components/game/ClubProfileTab';
import { CTRoomsTab } from '@/components/game/CTRoomsTab';
import { TrophiesTab } from '@/components/game/TrophiesTab';
import { TournamentExpandedView } from '@/components/game/TournamentDashboardCard';
import { SeasonTab } from '@/components/game/SeasonTab';
import { RankingTab } from '@/components/game/RankingTab';
import { SettingsTab } from '@/components/game/SettingsTab';
import { UpdateAnnouncementModal, GAME_VERSION } from '@/components/game/UpdateAnnouncementModal';
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
import { LayoutDashboard, Users, Swords, ShoppingCart, Target, Trophy, DollarSign, Save, LogOut, Building2, GraduationCap, CalendarDays, Handshake, Globe, MoreHorizontal, Settings, Search, Landmark, BookOpen, Sparkles, Heart, Dumbbell, MessageCircle, Newspaper, Gavel, Shirt, Shield, Medal, User, Home, BarChart3, Calendar, Gift, Star, TrendingUp, ChevronRight } from 'lucide-react';
import { NotificationBell } from '@/components/game/NotificationBell';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthPage from './Auth';
import flmLogo from '@/assets/flm26-logo.png';
import { GameLoadingScreen } from '@/components/game/GameLoadingScreen';
import { PlayerSigningModal } from '@/components/game/PlayerSigningModal';

const Index = () => {
  const { session, loading, signOut } = useAuth();

  if (loading) {
    return <GameLoadingScreen message="Conectando ao servidor" subMessage="Verificando sua sessão" />;
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
      detailColor: config.detailColor,
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
    return <GameLoadingScreen message="Carregando seu clube" subMessage="Preparando dados do jogo" />;
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
  const [showChangelog, setShowChangelog] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const game = useGame(initialState, userId);
  const mp = useMultiplayer(userId, displayName, game.club.name, game.club.country);
  usePresence(userId);

  // Check maintenance mode
  useEffect(() => {
    const checkMaintenance = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle();
      if (data?.value) {
        const val = data.value as any;
        setIsMaintenanceMode(val.active === true);
      }
      setMaintenanceChecked(true);
    };
    checkMaintenance();
    // Poll every 30s
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle match result from MatchResultLocker via navigation state (Bug #1 fix)
  // MatchResultLocker navigates to '/' with serverMatchResult in state after persist().
  // We read the real goals from the server and call applyServerResult() — never simulateMatch().
  useEffect(() => {
    const st = location.state as {
      serverMatchResult?: { matchDbId: string; homeGoals: number; awayGoals: number };
      matchResult?: { matchId: string }; // legacy fallback (offline)
      playTournamentMatch?: {
        matchId: string;
        tournamentMatchId: string;
        opponentName: string;
        opponentStrength: number;
        isHome: boolean;
        competition: string;
      };
    } | null;

    // Handle tournament match play request
    if (st?.playTournamentMatch) {
      const tm = st.playTournamentMatch;
      navigate('/match', {
        replace: true,
        state: {
          homeTeam: tm.isHome ? game.club.name : tm.opponentName,
          awayTeam: tm.isHome ? tm.opponentName : game.club.name,
          homePlayers: game.club.players,
          homeStrength: Math.round(game.club.players.reduce((s, p) => s + p.overall, 0) / Math.max(1, game.club.players.length)),
          awayStrength: tm.opponentStrength,
          matchId: tm.matchId,
          tactics: game.tactics || defaultTactics,
          stadiumName: tm.isHome ? game.club.stadiumName : 'Estádio Adversário',
          stadiumCapacity: tm.isHome ? 10000 : 10000,
          isHome: tm.isHome,
          competition: tm.competition,
          tournamentMatchId: tm.tournamentMatchId,
        },
      });
      return;
    }

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

      // Clean finished live_match from DB (tournament persistence is handled server-side)
      supabase.from('live_matches').delete().eq('id', matchDbId).then(() => {
        console.log('[Index] Cleaned up live_match:', matchDbId);
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
  const [signingPlayer, setSigningPlayer] = useState<{ name: string; position: string; overall: number; age: number; eventType?: 'signing' | 'renewal' | 'loan'; extraInfo?: string } | null>(null);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);

  // Save signing news to newspaper
  const saveSigningNews = useCallback(async (playerName: string, position: string, overall: number, age: number, eventType: 'signing' | 'renewal' | 'loan' = 'signing', extraInfo?: string) => {
    try {
      const typeLabels: Record<string, string> = { signing: 'CONTRATAÇÃO', renewal: 'RENOVAÇÃO', loan: 'EMPRÉSTIMO' };
      const typeEmojis: Record<string, string> = { signing: '✍️', renewal: '🔄', loan: '🤝' };
      const category = typeLabels[eventType] || 'MERCADO';
      const emoji = typeEmojis[eventType] || '⚽';
      let text = '';
      if (eventType === 'signing') {
        text = `${emoji} ${playerName} (${position}, OVR ${overall}, ${age} anos) é o novo reforço do ${game.club.name}!`;
      } else if (eventType === 'renewal') {
        text = `${emoji} ${playerName} (${position}, OVR ${overall}) renovou com o ${game.club.name}. ${extraInfo || ''}`;
      } else {
        text = `${emoji} ${playerName} (${position}, OVR ${overall}) foi emprestado pelo ${game.club.name}. ${extraInfo || ''}`;
      }
      await supabase.from('newspaper_entries').insert([{
        user_id: userId,
        text: text.trim(),
        category,
        is_event: true,
      }]);
    } catch (err) {
      console.error('Error saving signing news:', err);
    }
  }, [userId, game.club.name]);

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

  // Auto-sync squad + infrastructure to league every 10 seconds
  useEffect(() => {
    if (!mp.currentLeague) return;
    const clubMeta = {
      stadiumName: game.club.stadiumName,
      stadiumLevel: game.infrastructure.stadium.level,
      trainingCenterLevel: game.infrastructure.trainingCenter.level,
      physiotherapyLevel: game.infrastructure.physiotherapy.level,
      youthAcademyLevel: game.infrastructure.youthAcademy.level,
      primaryColor: game.club.primaryColor,
      secondaryColor: game.club.secondaryColor,
      shieldPattern: game.club.shieldPattern,
      shieldShape: game.club.shieldShape,
      country: game.club.country,
      reputation: game.club.reputation,
      fans: game.club.fans,
      foundedSeason: game.clubProfile.foundedSeason,
      ownerName: game.clubProfile.ownerName,
      motto: game.clubProfile.motto,
      trophies: game.clubProfile.trophies || [],
    };
    // Sync immediately on mount and then every 10 seconds
    mp.syncSquad(game.club.players, game.tactics, clubMeta);
    const interval = setInterval(() => {
      mp.syncSquad(game.club.players, game.tactics, clubMeta);
    }, 10000);
    return () => clearInterval(interval);
  }, [mp.currentLeague?.id, game.club.players.length, game.infrastructure.stadium.level, game.infrastructure.trainingCenter.level, game.infrastructure.physiotherapy.level, game.infrastructure.youthAcademy.level]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show changelog when game version changes
  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('flm-last-version-seen');
    if (lastSeenVersion !== GAME_VERSION) {
      setShowChangelog(true);
    }
  }, []);

  // Show maintenance screen for non-admins
  if (maintenanceChecked && isMaintenanceMode && !isAdminRole) {
    return <MaintenanceScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      <UpdatePopupWidget userId={userId} />
      <UpdateAnnouncementModal
        open={showChangelog}
        onClose={() => {
          localStorage.setItem('flm-last-version-seen', GAME_VERSION);
          setShowChangelog(false);
        }}
      />
      <TutorialModal open={showTutorial} onClose={() => setShowTutorial(false)} onNavigateTab={setActiveTab} onComplete={() => {
        game.addBonus(500000, 'Recompensa por completar o Tutorial');
        toast.success('🎉 Tutorial completo! Você ganhou R$500.000!');
      }} />
      <PlayerSigningModal
        open={!!signingPlayer}
        onClose={() => setSigningPlayer(null)}
        playerName={signingPlayer?.name || ''}
        playerPosition={signingPlayer?.position || ''}
        playerOverall={signingPlayer?.overall || 0}
        playerAge={signingPlayer?.age || 0}
        primaryColor={game.club.primaryColor || '#2563EB'}
        secondaryColor={game.club.secondaryColor || '#FFF'}
        clubName={game.club.name}
        eventType={signingPlayer?.eventType || 'signing'}
        extraInfo={signingPlayer?.extraInfo}
      />
      <header className="border-b border-border/30 bg-gradient-to-r from-card/95 via-card/80 to-card/95 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
          {/* Club Identity */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="relative">
              {game.club.shieldPattern ? (
                <ShieldCrest primaryColor={game.club.primaryColor || '#2563EB'} secondaryColor={game.club.secondaryColor || '#FFF'} pattern={game.club.shieldPattern} shape={(game.club as any).shieldShape || 'classic'} size={36} className="shrink-0" />
              ) : game.club.logoUrl ? (
                <img src={game.club.logoUrl} alt={game.club.name} className="w-9 h-9 rounded-lg shrink-0 object-cover" />
              ) : (
                <img src={flmLogo} alt="FLM 26" className="w-9 h-9 rounded-lg shrink-0" />
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-card" title="Online" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold truncate leading-tight">{game.club.name}</h1>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                <span className="game-badge bg-accent text-foreground">T{game.season.currentSeason}</span>
                <span className="game-badge bg-primary/15 text-primary">📅 Dia {game.season.currentWeek}/30</span>
                <span>{game.club.stats.points}pts</span>
                <span className="text-primary font-bold">R${(game.club.budget / 1000000).toFixed(1)}M</span>
              </div>
            </div>
          </div>

          {/* Quick Stats - Hidden on very small screens */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px]">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{game.club.players.length}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <Star className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">{game.club.reputation}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <Trophy className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">{game.club.stats.wins}V</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <NotificationBell players={game.club.players} budget={game.club.budget} listedPlayers={game.listedForSale} clubName={game.club.name} infrastructure={game.infrastructure} isNewClub={isNewClub} userId={userId} />
            <Button size="sm" variant="ghost" onClick={onSignOut} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center gap-1.5 mb-3 sm:mb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 w-10 p-0 shrink-0 border-border/30 bg-card/60 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60 bg-card/95 backdrop-blur-md border-border/30 z-50 max-h-[75vh] overflow-y-auto smooth-scroll p-2 rounded-xl shadow-xl shadow-black/20">
                <p className="menu-category">⚽ Clube</p>
                <DropdownMenuItem onClick={() => setActiveTab('calendar')} className="menu-item"><Calendar className="h-3.5 w-3.5 text-primary/70" /> Calendário <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('season')} className="menu-item"><CalendarDays className="h-3.5 w-3.5 text-primary/70" /> Temporada <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('training')} className="menu-item"><Dumbbell className="h-3.5 w-3.5 text-primary/70" /> Treinos <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('youth')} className="menu-item"><GraduationCap className="h-3.5 w-3.5 text-primary/70" /> Categorias de Base <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('scouts')} className="menu-item"><Search className="h-3.5 w-3.5 text-primary/70" /> Olheiros <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('uniforms')} className="menu-item"><Shirt className="h-3.5 w-3.5 text-primary/70" /> Uniformes <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('clubprofile')} className="menu-item"><User className="h-3.5 w-3.5 text-primary/70" /> Perfil do Clube <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

                <div className="my-1.5 border-t border-border/20" />
                <p className="menu-category">🏗️ Infraestrutura</p>
                <DropdownMenuItem onClick={() => setActiveTab('stadium')} className="menu-item"><Landmark className="h-3.5 w-3.5 text-primary/70" /> Estádio <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('infra')} className="menu-item"><Building2 className="h-3.5 w-3.5 text-primary/70" /> CT & Fisioterapia <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('ctrooms')} className="menu-item"><Home className="h-3.5 w-3.5 text-primary/70" /> Salas do CT <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

                <div className="my-1.5 border-t border-border/20" />
                <p className="menu-category">💰 Finanças</p>
                <DropdownMenuItem onClick={() => setActiveTab('finance')} className="menu-item"><DollarSign className="h-3.5 w-3.5 text-primary/70" /> Relatório Financeiro <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('sponsors')} className="menu-item"><Handshake className="h-3.5 w-3.5 text-primary/70" /> Patrocínios <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('auction')} className="menu-item"><Gavel className="h-3.5 w-3.5 text-primary/70" /> Leilão de Jogadores <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

                <div className="my-1.5 border-t border-border/20" />
                <p className="menu-category">🌍 Comunidade</p>
                <DropdownMenuItem onClick={() => setActiveTab('fans')} className="menu-item"><Heart className="h-3.5 w-3.5 text-primary/70" /> Torcida <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('chat')} className="menu-item"><MessageCircle className="h-3.5 w-3.5 text-primary/70" /> Chat Global <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('matches')} className="menu-item"><Swords className="h-3.5 w-3.5 text-primary/70" /> Amistosos Online <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('pacotinhos')} className="menu-item"><Gift className="h-3.5 w-3.5 text-primary/70" /> Pacotinhos <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

                <div className="my-1.5 border-t border-border/20" />
                <p className="menu-category">🏆 Conquistas</p>
                <DropdownMenuItem onClick={() => setActiveTab('achievements')} className="menu-item"><Medal className="h-3.5 w-3.5 text-primary/70" /> Conquistas <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('trophies')} className="menu-item"><Trophy className="h-3.5 w-3.5 text-primary/70" /> Troféus <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('ranking')} className="menu-item"><BarChart3 className="h-3.5 w-3.5 text-primary/70" /> Ranking Global <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

                <div className="my-1.5 border-t border-border/20" />
                <p className="menu-category">⚙️ Sistema</p>
                <DropdownMenuItem onClick={() => setActiveTab('settings')} className="menu-item"><Settings className="h-3.5 w-3.5 text-primary/70" /> Configurações <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                {showAdmin && <DropdownMenuItem onClick={() => setActiveTab('updates')} className="menu-item"><Sparkles className="h-3.5 w-3.5 text-primary/70" /> Atualizações <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>}
                <DropdownMenuItem onClick={() => setShowTutorial(true)} className="menu-item"><BookOpen className="h-3.5 w-3.5 text-primary/70" /> Tutorial Interativo <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
                {showAdmin && <DropdownMenuItem onClick={() => setActiveTab('admin')} className="menu-item"><Shield className="h-3.5 w-3.5 text-destructive/70" /> Painel Admin <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>

            <TabsList className="flex-1 grid grid-cols-6 h-auto gap-0.5 bg-card/60 backdrop-blur-sm p-1 border border-border/20 rounded-xl">
              <TabsTrigger value="dashboard" className="nav-tab"><LayoutDashboard className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" /><span className="text-[8px] sm:text-xs leading-tight">Início</span></TabsTrigger>
              <TabsTrigger value="journal" className="nav-tab"><Newspaper className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" /><span className="text-[8px] sm:text-xs leading-tight">Jornal</span></TabsTrigger>
              <TabsTrigger value="squad" className="nav-tab"><Users className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" /><span className="text-[8px] sm:text-xs leading-tight">Elenco</span></TabsTrigger>
              <TabsTrigger value="tactics" className="nav-tab"><Target className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" /><span className="text-[8px] sm:text-xs leading-tight">Táticas</span></TabsTrigger>
              <TabsTrigger value="league" className="nav-tab"><Globe className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" /><span className="text-[8px] sm:text-xs leading-tight">Liga</span></TabsTrigger>
              <TabsTrigger value="market" className="nav-tab"><ShoppingCart className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" /><span className="text-[8px] sm:text-xs leading-tight">Mercado</span></TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard"><DashboardTab club={game.club} events={game.events} infrastructure={game.infrastructure} onOpenNewspaper={() => setActiveTab('journal')} onGoToFriendly={() => setActiveTab('matches')} userId={userId} onOpenTournament={(id: string) => { setActiveTournamentId(id); setActiveTab('tournament'); }} clubProfile={game.clubProfile} season={game.season?.currentSeason} onViewClub={(name) => { /* TODO: navigate to club profile */ toast.info(`Perfil de ${name}`); }} /></TabsContent>
          <TabsContent value="tournament">
            {activeTournamentId ? (
              <TournamentExpandedView tournamentId={activeTournamentId} onClose={() => { setActiveTournamentId(null); setActiveTab('dashboard'); }} />
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhum campeonato selecionado</p>
            )}
          </TabsContent>
          <TabsContent value="season">
            <SeasonTab
              season={game.season}
              leagueTeams={game.leagueTeams}
              clubName={game.club.name}
              hasUnplayedMatches={game.club.matches.some(m => !m.played)}
              onEndSeason={game.endSeason}
            />
          </TabsContent>
          <TabsContent value="calendar"><MatchCalendarTab userId={userId} clubName={game.club.name} /></TabsContent>
          <TabsContent value="squad">
            <SquadTab
              players={game.club.players}
              budget={game.club.budget}
              clubName={game.club.name}
              trainingLevel={game.infrastructure.trainingCenter.level}
              onRest={game.restPlayer}
              onRenewContract={(playerId, newSalary, newDuration) => {
                const player = game.club.players.find(p => p.id === playerId);
                game.renewContract(playerId, newSalary, newDuration);
                if (player) {
                  const extra = `${newDuration} ano(s) • R$${(newSalary / 1000).toFixed(0)}k/mês`;
                  setSigningPlayer({ name: player.name, position: player.position, overall: player.overall, age: player.age, eventType: 'renewal', extraInfo: extra });
                  saveSigningNews(player.name, player.position, player.overall, player.age, 'renewal', extra);
                }
              }}
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
                  toast.success(`${player.name} listado no mercado por R$${(askingPrice / 1000).toFixed(0)}k! 🏷️`);
                }
              }}
              onLoanOut={(playerId) => {
                const player = game.club.players.find(p => p.id === playerId);
                game.loanOutPlayer(playerId);
                if (player) {
                  const extra = 'Emprestado por 1 temporada';
                  setSigningPlayer({ name: player.name, position: player.position, overall: player.overall, age: player.age, eventType: 'loan', extraInfo: extra });
                  saveSigningNews(player.name, player.position, player.overall, player.age, 'loan', extra);
                }
              }}
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
                pattern: game.club.shieldPattern || 'solid',
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
                setSigningPlayer({ name: playerData.name, position: playerData.position, overall: playerData.overall, age: playerData.age });
                saveSigningNews(playerData.name, playerData.position, playerData.overall, playerData.age, 'signing');
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
            <TrainingWrapper
              players={game.club.players}
              infrastructure={game.infrastructure}
              trainingFocus={game.trainingFocus}
              onSetTrainingFocus={game.setPlayerTrainingFocus}
              tactics={game.tactics}
              onPlayersUpdate={game.updatePlayers}
              currentWeek={game.season.currentWeek}
              clubName={game.club.name}
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
          <TabsContent value="settings"><SettingsTab /></TabsContent>
          <TabsContent value="chat">
            <GlobalChatTab userId={userId} displayName={displayName} clubName={game.club.name} />
          </TabsContent>
          <TabsContent value="journal">
            <NewspaperFullPage onBack={() => setActiveTab('dashboard')} />
          </TabsContent>
          <TabsContent value="newspaper">
            <NewspaperFullPage onBack={() => setActiveTab('dashboard')} />
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
