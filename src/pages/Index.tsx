import { Tabs } from '@/components/ui/tabs';
import { GameHeader } from '@/components/game/GameHeader';
import { GameMenu } from '@/components/game/GameMenu';
import { GameNavBar } from '@/components/game/GameNavBar';
import { GameTabRouter } from '@/components/game/GameTabRouter';
import { MaintenanceScreen } from '@/components/game/MaintenanceScreen';
import { UpdatePopupWidget } from '@/components/game/UpdatePopupWidget';
import { UpdateAnnouncementModal, GAME_VERSION } from '@/components/game/UpdateAnnouncementModal';
import { DatabaseResetWidget } from '@/components/game/DatabaseResetWidget';
import { TutorialModal } from '@/components/game/TutorialModal';
import { ClubCreation, ClubConfig } from '@/components/game/ClubCreation';
import { PlayerSigningModal } from '@/components/game/PlayerSigningModal';
import { GameLoadingScreen } from '@/components/game/GameLoadingScreen';
import { SeasonAwardsModal } from '@/components/game/SeasonAwardsModal';
import { VersionUpdateOverlay } from '@/components/game/VersionUpdateOverlay';
import { PromotionManager } from '@/components/game/promotion/PromotionManager';
import { useVersionGuard } from '@/hooks/useVersionGuard';
import { initialClub } from '@/data/initialData';
import { defaultTactics } from '@/types/tactics';
import { getLeagueTeams } from '@/types/league';
import { defaultInfrastructure, defaultSeason } from '@/types/infrastructure';
import { generateSponsorOffers } from '@/types/sponsor';
import { generateMarketPlayers, generateFreeAgents, generateInitialSquad } from '@/utils/playerGenerator';
import { useGame, GameState } from '@/hooks/useGame';
import { useAuth } from '@/hooks/useAuth';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { supabase } from '@/integrations/supabase/client';
import { usePresence } from '@/hooks/usePresence';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { usePendingMatchFlush } from '@/hooks/usePendingMatchFlush';
import { useAutoSimulator } from '@/hooks/useAutoSimulator';
import { useDismissibleWidget } from '@/hooks/useDismissibleWidget';
import { useLeagueFixer } from '@/hooks/useLeagueFixer';
import { toast } from 'sonner';
import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AuthPage from './Auth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';
import { ClubProfilePage } from '@/components/game/ClubProfilePage';
import { QuickClubProfile } from '@/components/game/QuickClubProfile';
import { PurchaseSuccessOverlay } from '@/components/game/PurchaseSuccessOverlay';

const Index = () => {
  const { session, loading, signOut } = useAuth();
  if (loading) return <GameLoadingScreen message="Conectando ao servidor" subMessage="Verificando sua sessão" />;
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
          if (loaded.infrastructure?.stadium && loaded.infrastructure.stadium.maxLevel < 15) {
            loaded.infrastructure.stadium.maxLevel = 15;
          }
          // Piso mínimo de 1000 torcedores (sem rebaixar quem já cresceu)
          if (loaded.club && (loaded.club.fans ?? 0) < 1000) {
            loaded.club.fans = 1000;
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
      fans: 1000,
      players: generateInitialSquad(config.name),
      matches: [],
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      detailColor: config.detailColor,
      shieldPattern: config.shieldPattern,
      shieldShape: config.shieldShape,
      shieldIcon: (config as any).shieldIcon,
      shieldConfig: (config as any).shieldConfig,
      logoUrl: config.logoUrl,
      country: config.country,
    };
    // Auto-populate clubProfile with foundation data
    const today = new Date();
    const foundedDate = today.toLocaleDateString('pt-BR'); // DD/MM/AAAA
    const initialClubProfile = {
      ownerName: displayName || 'Manager',
      instagram: '',
      bio: '',
      foundedSeason: defaultSeason.currentSeason ?? 1,
      foundedDate,
      motto: '',
      trophies: [],
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
      clubProfile: initialClubProfile,
    };
    const jsonState = JSON.parse(JSON.stringify(newState));
    console.log('[club-save] Saving table: game_saves');
    const gameSavePayload = { user_id: userId, club_data: jsonState };
    console.log('[club-save] Payload:', gameSavePayload);
    
    // Save to game_saves (full state)
    const { error: insertErr } = await supabase
      .from('game_saves')
      .upsert(gameSavePayload, { onConflict: 'user_id' });
    
    if (insertErr) {
      console.error('[club-save] FAILED to persist club in game_saves:', insertErr);
      console.log('[club-save] Error details:', insertErr.message, insertErr.details, insertErr.hint);
      toast.error(`Erro ao salvar save do jogo: ${insertErr.message}`);
      return;
    }

    console.log('[club-save] Saving table: clubs');
    const clubsPayload = {
      user_id: userId,
      name: config.name,
      country: config.country,
      stadium_name: config.stadiumName || 'Estádio Municipal',
      primary_color: config.primaryColor,
      secondary_color: config.secondaryColor,
      detail_color: config.detailColor,
      logo_url: config.logoUrl,
      fans: 1000,
      reputation: 65,
      budget: 1000000,
    };
    console.log('[club-save] Payload:', clubsPayload);

    // Save to clubs table (metadata/searchable)
    const { error: clubErr } = await supabase
      .from('clubs')
      .upsert(clubsPayload, { onConflict: 'user_id' });

    if (clubErr) {
      console.error('[club-save] FAILED to persist club in clubs table:', clubErr);
      console.log('[club-save] Error details:', clubErr.message, clubErr.details, clubErr.hint);
      toast.error(`Erro ao registrar metadados do clube: ${clubErr.message}`);
    }

    console.log('[club-save] club persisted successfully');
    
    // Welcome notification
    await supabase.from('user_notifications').insert([{
      user_id: userId,
      icon: '👋',
      title: 'Bem-vindo ao FLM 26!',
      message: `Parabéns pela criação do ${config.name}! Dicas: treine seus jogadores diariamente, melhore o CT e entre em ligas para competir online. Boa sorte, Manager!`,
      type: 'success',
    }]);

    setLoadedState(newState);
    setHasSave(true);
    setIsNewClub(true);
    toast.success(`${config.name} criado com sucesso! 🏆`);
  }, [userId, displayName]);

  if (!gameReady) return <GameLoadingScreen message="Carregando seu clube" subMessage="Preparando dados do jogo" />;
  if (!hasSave) return <ClubCreation userId={userId} onComplete={handleClubCreated} />;
  return <GameUI userId={userId} userEmail={userEmail} displayName={displayName} onSignOut={onSignOut} initialState={loadedState} isNewClub={isNewClub} />;
}

function GameUI({ userId, userEmail, displayName, onSignOut, initialState, isNewClub }: { userId: string; userEmail: string; displayName: string; onSignOut: () => void; initialState?: GameState; isNewClub?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(true); // default true to prevent flash
  const [showTutorial, setShowTutorial] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [blockedTabs, setBlockedTabs] = useState<string[]>([]);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [marketSubTab, setMarketSubTab] = useState('browse');
  const [signingPlayer, setSigningPlayer] = useState<{ name: string; position: string; overall: number; age: number; eventType?: 'signing' | 'renewal' | 'loan'; extraInfo?: string } | null>(null);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [pendingAwardsSeason, setPendingAwardsSeason] = useState<number | null>(null);
  const [viewingClubName, setViewedClubName] = useState<string | null>(searchParams.get('name'));

  // Sync URL with viewingClubName
  useEffect(() => {
    const nameFromUrl = searchParams.get('name');
    if (nameFromUrl && nameFromUrl !== viewingClubName) {
      setViewedClubName(nameFromUrl);
    } else if (!nameFromUrl && viewingClubName) {
      // If no name in URL but we have a viewed club, it might be from a local state change
      // or we just closed it.
    }
  }, [searchParams]);

  const handleSetViewedClubName = useCallback((name: string | null) => {
    setViewedClubName(name);
    if (name) {
      setSearchParams({ name });
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('name');
      setSearchParams(newParams);
    }
  }, [searchParams, setSearchParams]);

  // Version guard: bloqueia o jogo durante atualizações de dados
  const versionGuard = useVersionGuard(userId, initialState ?? null);

  const { isPremium } = usePremiumStatus(userId);
  const game = useGame(initialState, userId, isPremium);
  const mp = useMultiplayer(userId, displayName, game.club.name, game.club.country);
  usePresence(userId);
  usePendingMatchFlush(userId);
  useAutoSimulator(userId);

  // Auto-fix and Initialize league + NATIONAL CUPS for current month (CRITICAL SYNC)
  useEffect(() => {
    if (!userId) return;
    const initCompetitions = async () => {
      try {
        const { data: team } = await supabase.from('world_teams').select('id, league_id').eq('user_id', userId).maybeSingle();
        if (team) {
          if (!team.league_id) {
            const countryCode = initialState?.club?.country || 'BR';
            const { data: country } = await supabase.from('countries').select('id').eq('code', countryCode).maybeSingle();
            if (country) {
              await game.enrollWorldLeague(team.id, country.id);
            }
          }
          await supabase.rpc('initialize_player_league', { p_player_team_id: team.id });
        }

        // NATIONAL CUP AUTOMATION (DAY 10 DRAW / DAILY SIM)
        const today = new Date();
        const day = today.getDate();
        
        // 1. Geração automática no Dia 10
        if (day === 10) {
          const lastDraw = localStorage.getItem(`cup_draw_${today.getMonth()}_${today.getFullYear()}`);
          if (!lastDraw) {
            console.log('[CupManager] Official Draw Day detected (10th). Running Global Draw...');
            supabase.functions.invoke('national-cup-manager', { body: { action: 'generate_all_national_cups' } });
            localStorage.setItem(`cup_draw_${today.getMonth()}_${today.getFullYear()}`, 'done');
          }
        }

        // 2. Simulação diária automática (Dia 11 ao fim)
        if (day >= 11) {
          const lastSim = localStorage.getItem(`cup_sim_${day}_${today.getMonth()}_${today.getFullYear()}`);
          if (!lastSim) {
            const currentHour = today.getHours();
            // Simular se passou das 12:05 (janela de 5 min para humanos entrarem)
            if (currentHour >= 12) {
              console.log('[CupManager] Daily Simulation window open. Checking for matches...');
              supabase.functions.invoke('national-cup-manager', { body: { action: 'advance_phase' } });
              localStorage.setItem(`cup_sim_${day}_${today.getMonth()}_${today.getFullYear()}`, 'done');
            }
          }
        }
      } catch (e) {
        console.error('Failed to sync competitions:', e);
      }
    };
    initCompetitions();
    // Process shop bonuses daily
    supabase.rpc('process_daily_shop_bonuses', { p_user_id: userId }).then(({ data }) => {
      if (data && (data as any).success) {
        console.log('[Shop] Daily bonuses processed:', data);
      }
    });
  }, [userId, game.enrollWorldLeague]);

  // Check maintenance mode + tutorial status
  useEffect(() => {
    const checkMaintenance = async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'maintenance_mode').maybeSingle();
      if (data?.value) {
        const val = data.value as any;
        setIsMaintenanceMode(val.active === true);
        setBlockedTabs(Array.isArray(val.blocked_tabs) ? val.blocked_tabs : []);
      }
      setMaintenanceChecked(true);
    };
    checkMaintenance();
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check tutorial completed status — auto-show ONLY if user definitely hasn't finished it.
  // Default state is `true` (tutorialCompleted) to prevent flashing while loading.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const checkTutorial = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('tutorial_completed')
          .eq('user_id', userId)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.warn('[tutorial] check failed, assuming completed to avoid blocking UI:', error.message);
          setTutorialCompleted(true);
          return;
        }
        // No profile row yet (edge case): create one with tutorial_completed=false
        if (!data) {
          console.log('[tutorial] no profile row found, creating one');
          await supabase.from('profiles').upsert({
            user_id: userId,
            display_name: displayName || 'Manager',
            tutorial_completed: false,
          } as any, { onConflict: 'user_id' });
          setTutorialCompleted(false);
          setTimeout(() => { if (!cancelled) setShowTutorial(true); }, 600);
          return;
        }
        const completed = !!(data as any)?.tutorial_completed;
        console.log('[tutorial] status loaded:', { completed });
        setTutorialCompleted(completed);
        if (!completed) {
          setTimeout(() => { if (!cancelled) setShowTutorial(true); }, 600);
        }
      } catch (e) {
        console.warn('[tutorial] unexpected error, defaulting to completed:', e);
        setTutorialCompleted(true);
      }
    };
    checkTutorial();
    return () => { cancelled = true; };
  }, [userId, displayName]);

  // Allow re-opening the tutorial manually (from Settings tab) via custom event — only if not yet completed.
  useEffect(() => {
    const handler = () => {
      if (!tutorialCompleted) setShowTutorial(true);
    };
    window.addEventListener('flm:open-tutorial', handler);
    return () => window.removeEventListener('flm:open-tutorial', handler);
  }, [tutorialCompleted]);

  // Handle external data updates (Realtime or Cloud Functions)
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.club_data) {
        console.log('[Index] Sincronizando dados externos em tempo real...');
        const incoming = e.detail.club_data as GameState;
        // Merge logic or direct set
        setLoadedState(prev => {
          if (!prev) return incoming;
          // Prevenção de loop: só atualiza se o timestamp de atualização for maior
          // mas como o save_game é disparado aqui também, o merge deve ser cuidadoso
          return { ...incoming };
        });
      }
    };
    window.addEventListener('flm:external-data-update', handler);
    return () => window.removeEventListener('flm:external-data-update', handler);
  }, []);

  // Handle club profile viewing via events
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.club_name) handleSetViewedClubName(e.detail.club_name);
    };
    window.addEventListener('flm:open-club-profile', handler);
    return () => window.removeEventListener('flm:open-club-profile', handler);
  }, [handleSetViewedClubName]);

  // Handle generic navigation via events
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
        if (e.detail.tournamentId) setActiveTournamentId(e.detail.tournamentId);
      }
    };
    window.addEventListener('flm:navigate-to-tab', handler);
    return () => window.removeEventListener('flm:navigate-to-tab', handler);
  }, []);


  // Sync state between saves
  const handleClubViewClose = useCallback(() => {
    handleSetViewedClubName(null);
  }, [handleSetViewedClubName]);

  useEffect(() => {
    const st = location.state as {
      serverMatchResult?: { matchDbId: string; homeGoals: number; awayGoals: number; competition?: string };
      playTournamentMatch?: { matchId: string; tournamentMatchId: string; opponentName: string; opponentStrength: number; isHome: boolean; competition: string; tieBreaker?: 'none' | 'extra_time' | 'penalties' | 'both' };
    } | null;

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
          stadiumCapacity: 10000,
          isHome: tm.isHome,
          competition: tm.competition,
          tournamentMatchId: tm.tournamentMatchId,
          tieBreaker: tm.tieBreaker || 'none',
        },
      });
      return;
    }

    if (st?.serverMatchResult) {
      const { matchDbId, homeGoals, awayGoals, competition } = st.serverMatchResult;
      
      const processResult = async () => {
        // 🛡️ Lock Anti-Duplicação: Tenta deletar a partida live antes de processar.
        // Se já foi deletada (por outra aba ou refresh), não processamos novamente.
        const { data: deleted } = await supabase.from('live_matches').delete().eq('id', matchDbId).select();
        
        if (deleted && deleted.length > 0) {
          const pendingMatch = game.club.matches.find(m => m.id === matchDbId && !m.played);
          if (pendingMatch) {
            game.applyServerResult({ 
              matchId: pendingMatch.id, 
              homeGoals, 
              awayGoals, 
              isHome: pendingMatch.isHome ?? true, 
              competition 
            });
          }
        }
        navigate('/', { replace: true, state: {} });
      };
      
      processResult();
      return;
    }

    // Check for stale finished matches — strict match_id validation only
    if (!st?.serverMatchResult) {
      const checkFinished = async () => {
        const { data: finishedMatches } = await supabase.from('live_matches').select('match_id, home_goals, away_goals, is_home, id, status, created_at, stats, home_team, away_team, competition').eq('status', 'finished').order('created_at', { ascending: false }).limit(5);
        if (!finishedMatches || finishedMatches.length === 0) return;
        for (const fm of finishedMatches) {
          // Skip matches older than 2 hours (stale)
          const matchAge = Date.now() - new Date(fm.created_at).getTime();
          if (matchAge > 2 * 60 * 60 * 1000) {
            await supabase.from('live_matches').delete().eq('id', fm.id);
            continue;
          }

          // 🛡️ Lock Anti-Duplicação: Somente a aba que conseguir deletar a linha processa a recompensa.
          const { data: deleted } = await supabase.from('live_matches').delete().eq('id', fm.id).select();
          if (!deleted || deleted.length === 0) continue;

          // Only apply if match_id matches exactly a local unplayed match
          const localMatch = game.club.matches.find(m => m.id === fm.match_id && !m.played);
          if (localMatch) {
            game.applyServerResult({ 
              matchId: localMatch.id, 
              homeGoals: fm.home_goals, 
              awayGoals: fm.away_goals, 
              isHome: fm.is_home ?? localMatch.isHome ?? true, 
              competition: fm.competition || 'Amistoso' 
            });
          }
          
          // Create report + notification NOW (post-game)
          const fmStats = fm.stats as any;
          if (fmStats?.reportData && fmStats?.matchHistoryId) {
            try {
              const reportData = fmStats.reportData;
              const reportResult = fmStats.reportResult || 'draw';
              const rankingChange = fmStats.rankingChange || 0;

              await supabase.from('match_reports').insert({
                user_id: userId,
                match_history_id: fmStats.matchHistoryId,
                competition: fm.competition || 'Amistoso',
                home_team: fm.home_team,
                away_team: fm.away_team,
                home_goals: fm.home_goals,
                away_goals: fm.away_goals,
                result: reportResult,
                report_data: reportData,
                ranking_impact: rankingChange,
              });

              const resultEmoji = reportResult === 'win' ? '🏆' : reportResult === 'loss' ? '😞' : '🤝';
              const userTeam = fm.is_home ? fm.home_team : fm.away_team;
              const oppTeam = fm.is_home ? fm.away_team : fm.home_team;
              const userGoals = fm.is_home ? fm.home_goals : fm.away_goals;
              const oppGoals = fm.is_home ? fm.away_goals : fm.home_goals;
              const statIdx = fm.is_home ? 0 : 1;
              const possession = Array.isArray(fmStats.possession) ? (fmStats.possession[statIdx] ?? 50) : 50;
              const shots = Array.isArray(fmStats.shots) ? (fmStats.shots[statIdx] ?? 0) : 0;
              const shotsOnTarget = Array.isArray(fmStats.shotsOnTarget) ? (fmStats.shotsOnTarget[statIdx] ?? 0) : 0;

              await supabase.from('user_notifications').insert({
                user_id: userId,
                type: reportResult === 'win' ? 'success' : reportResult === 'loss' ? 'danger' : 'info',
                title: `${resultEmoji} ${userTeam} ${userGoals} x ${oppGoals} ${oppTeam}`,
                message: `${fm.competition || 'Amistoso'}\nPosse: ${possession}% | Finalizações: ${shots} (${shotsOnTarget} no gol)\nRanking: ${rankingChange > 0 ? '+' : ''}${rankingChange} pts`,
                icon: resultEmoji,
                data: { matchHistoryId: fmStats.matchHistoryId, reportData },
              });
            } catch (err) { console.error('Post-game report error:', err); }

            // Automatic News Generation for significant matches
            try {
              const userGoals = fm.is_home ? fm.home_goals : fm.away_goals;
              const oppGoals = fm.is_home ? fm.away_goals : fm.home_goals;
              const userTeam = fm.is_home ? fm.home_team : fm.away_team;
              const oppTeam = fm.is_home ? fm.away_team : fm.home_team;
              
              const isWin = userGoals > oppGoals;
              const isDraw = userGoals === oppGoals;
              
              const template = isDraw ? 'league_draw' : (isWin ? 'league_win' : 'league_loss');
              const headline = isDraw ? `Empate heróico! ${userTeam} e ${oppTeam} ficam no ${userGoals}x${oppGoals}.` 
                : isWin ? `Vitória espetacular do ${userTeam} contra o ${oppTeam}!` 
                : `Duro golpe! ${userTeam} é derrotado pelo ${oppTeam} em casa.`;

              await supabase.from('newspaper_entries').insert([{
                user_id: userId,
                text: headline,
                category: isWin ? 'RESULTADO' : (isDraw ? 'CAMPEONATO' : 'CRISE'),
                is_event: true,
                template_key: template,
                metadata: { team_name: userTeam, opponent_name: oppTeam, score: `${userGoals}x${oppGoals}`, competition: fm.competition || 'Liga', club: { shieldConfig: initialState?.club?.shieldConfig } },
                importance: (Math.abs(userGoals - oppGoals) >= 3) ? 3 : 1
              }]);
            } catch (e) { console.warn('News generation skipped:', e); }
          }
          
          await supabase.from('live_matches').delete().eq('id', fm.id);
        }
      };
      checkFinished();
    }
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Admin role check
  useEffect(() => {
    supabase.from('user_roles').select('role').eq('user_id', userId).then(({ data }) => {
      const roles = (data || []).map(r => r.role);
      setIsAdminRole(roles.includes('admin'));
      setIsFounder(roles.includes('admin') && userEmail === 'fcmsistemas7@gmail.com');
    });
  }, [userId, userEmail]);

  // Save signing news
  const saveSigningNews = useCallback(async (playerName: string, position: string, overall: number, age: number, eventType: 'signing' | 'renewal' | 'loan' = 'signing', extraInfo?: string) => {
    try {
      const typeLabels: Record<string, string> = { signing: 'CONTRATAÇÃO', renewal: 'RENOVAÇÃO', loan: 'EMPRÉSTIMO' };
      const typeEmojis: Record<string, string> = { signing: '✍️', renewal: '🔄', loan: '🤝' };
      const category = typeLabels[eventType] || 'MERCADO';
      const emoji = typeEmojis[eventType] || '⚽';
      let text = '';
      if (eventType === 'signing') text = `${emoji} ${playerName} (${position}, OVR ${overall}, ${age} anos) é o novo reforço do ${game.club.name}!`;
      else if (eventType === 'renewal') text = `${emoji} ${playerName} (${position}, OVR ${overall}) renovou com o ${game.club.name}. ${extraInfo || ''}`;
      else text = `${emoji} ${playerName} (${position}, OVR ${overall}) foi emprestado pelo ${game.club.name}. ${extraInfo || ''}`;
      
      await supabase.from('newspaper_entries').insert([{ 
        user_id: userId, 
        text: text.trim(), 
        category, 
        is_event: true,
        template_key: eventType === 'signing' ? 'transfer' : null,
        metadata: eventType === 'signing' ? { playerName, team_name: game.club.name, club: { shieldConfig: game.club.shieldConfig } } : null,
        importance: eventType === 'signing' ? 2 : 1
      }]);
    } catch (err) { console.error('Error saving signing news:', err); }
  }, [userId, game.club.name]);

  // Auto-save
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameState = game.getFullState();

  const saveGame = useCallback(async (silent = false) => {
    const state = game.getFullState();
    const jsonState = JSON.parse(JSON.stringify(state));
    
    if (!silent) console.log('[auto-save] Saving table: game_saves');
    const payload = { user_id: userId, club_data: jsonState };
    if (!silent) console.log('[auto-save] Payload:', payload);

    const { error: saveErr } = await supabase
      .from('game_saves')
      .upsert(payload, { onConflict: 'user_id' });
    
    if (saveErr) {
      console.error('[auto-save] failed in game_saves:', saveErr);
      console.log('[auto-save] Error details:', saveErr.message, saveErr.details, saveErr.hint);
      if (!silent) toast.error(`Falha ao salvar jogo: ${saveErr.message}`);
      return;
    }

    // Also sync key stats to clubs table for ranking/visibility
    if (state.club) {
      const syncPayload = {
        fans: state.club.fans ?? 1000,
        reputation: state.club.reputation ?? 50,
        budget: state.club.budget ?? 1000000,
      };
      if (!silent) console.log('[auto-save] Syncing to table: clubs');
      if (!silent) console.log('[auto-save] Sync Payload:', syncPayload);

      const { error: syncErr } = await supabase
        .from('clubs')
        .update(syncPayload)
        .eq('user_id', userId);
      
      if (syncErr) {
        console.warn('[auto-save] metadata sync failed:', syncErr.message);
        console.log('[auto-save] Sync error details:', syncErr.details, syncErr.hint);
      }
    }

    if (!silent) toast.success('Jogo salvo!');
  }, [game, userId]);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveGame(true), 2000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [gameState, saveGame]);

  // Auto-sync squad to league
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
      shieldIcon: (game.club as any).shieldIcon,
      shieldConfig: (game.club as any).shieldConfig,
      country: game.club.country,
      reputation: game.club.reputation,
      fans: game.club.fans,
      foundedSeason: game.clubProfile.foundedSeason,
      ownerName: game.clubProfile.ownerName,
      motto: game.clubProfile.motto,
      trophies: game.clubProfile.trophies || [],
    };
    mp.syncSquad(game.club.players, game.tactics, clubMeta);
    const interval = setInterval(() => mp.syncSquad(game.club.players, game.tactics, clubMeta), 10000);
    return () => clearInterval(interval);
  }, [mp.currentLeague?.id, game.club.players.length, game.infrastructure.stadium.level, (game.club as any).shieldConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show changelog
  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('flm-last-version-seen');
    if (lastSeenVersion !== GAME_VERSION) setShowChangelog(true);
  }, []);

  // Welcome notification for ALL players (including existing ones)
  useEffect(() => {
    const sendWelcome = async () => {
      const { data: existing } = await supabase.from('user_notifications').select('id').eq('user_id', userId).eq('title', 'Bem-vindo ao FLM 26!').limit(1).maybeSingle();
      if (!existing) {
        await supabase.from('user_notifications').insert({
          user_id: userId,
          icon: '👋',
          title: 'Bem-vindo ao FLM 26!',
          message: `Olá, Manager! Dicas: treine seus jogadores diariamente, melhore o CT e entre em ligas para competir online. Boa sorte! ⚽`,
          type: 'success',
        });
      }
    };
    sendWelcome();
  }, [userId]);

  // Season awards trigger — opens the modal once per new season
  useEffect(() => {
    const checkAwards = async () => {
      const [{ data: latestAward }, { data: profile }] = await Promise.all([
        supabase.from('season_awards').select('season').order('season', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('profiles').select('viewed_awards_season').eq('user_id', userId).maybeSingle(),
      ]);
      if (!latestAward) return;
      const lastSeen = (profile as any)?.viewed_awards_season ?? 0;
      if (latestAward.season > lastSeen) {
        setPendingAwardsSeason(latestAward.season);
      }
    };
    checkAwards();
  }, [userId]);

  if (maintenanceChecked && isMaintenanceMode && !isAdminRole) return <MaintenanceScreen />;

  const showAdmin = isAdminRole;

  return (
    <div className="min-h-screen bg-background">
      {/* Club Profile Detail Modal — instantâneo via QuickClubProfile (clubs + world_teams) */}
      <Dialog open={!!viewingClubName} onOpenChange={(open) => !open && handleClubViewClose()}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background border-border max-h-[90vh] flex flex-col">
          <div className="p-3 border-b bg-muted/20 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
            <DialogTitle className="text-base font-black flex items-center gap-2">
              ⚽ Perfil do Clube
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClubViewClose} className="h-7 w-7 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 sm:p-4 pb-20">
              {viewingClubName && <QuickClubProfile clubName={viewingClubName} />}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <PurchaseSuccessOverlay />
      <VersionUpdateOverlay state={versionGuard} onRollback={versionGuard.rollback} />
      <DatabaseResetWidget userId={userId} />
      <UpdatePopupWidget userId={userId} />
      <UpdateAnnouncementModal open={showChangelog} onClose={() => { localStorage.setItem('flm-last-version-seen', GAME_VERSION); setShowChangelog(false); }} />
      <PromotionManager 
        youthProspects={game.youthProspects} 
        onDecision={(game as any).handlePromotionDecision}
        clubBudget={game.club.budget}
      />
      <TutorialModal open={showTutorial} onClose={() => setShowTutorial(false)} onNavigateTab={setActiveTab} onComplete={async () => {
        try {
          // Marca local imediatamente para nunca travar a UI
          setTutorialCompleted(true);
          setShowTutorial(false);

          // Anti-exploit: verifica no servidor se já recebeu antes de creditar
          const { data: prof } = await supabase
            .from('profiles')
            .select('tutorial_completed')
            .eq('user_id', userId)
            .maybeSingle();

          const alreadyDone = !!(prof as any)?.tutorial_completed;

          // Upsert garantido (cria profile se não existir)
          const { error: upErr } = await supabase
            .from('profiles')
            .upsert({
              user_id: userId,
              display_name: displayName || 'Manager',
              tutorial_completed: true,
            } as any, { onConflict: 'user_id' });

          if (upErr) {
            console.warn('[tutorial] persist err:', upErr.message);
            toast.error('Tutorial concluído localmente, mas falhou ao salvar no servidor.');
            return;
          }

          if (!alreadyDone) {
            game.addBonus(200000, 'Recompensa por completar o Tutorial');
            toast.success('🎉 Parabéns! Você recebeu R$ 200K por completar o tutorial.');
          }
          console.log('[tutorial] completed and persisted');
        } catch (e) {
          console.warn('[tutorial] complete failed:', e);
          // Não trava a UI mesmo em erro
          setTutorialCompleted(true);
          setShowTutorial(false);
        }
      }} />
      {pendingAwardsSeason !== null && (
        <PersistentSeasonAwards
          season={pendingAwardsSeason}
          userId={userId}
          onClose={() => setPendingAwardsSeason(null)}
        />
      )}
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

      {activeTab !== 'shop' && <GameHeader club={game.club} season={game.season} infrastructure={game.infrastructure} listedPlayers={game.listedForSale} userId={userId} isNewClub={isNewClub} onSignOut={onSignOut} />}

      <main className={`${activeTab === 'shop' ? 'w-full' : 'max-w-5xl mx-auto px-2 sm:px-4 py-3 sm:py-4'}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {activeTab !== 'shop' && (
            <div className="flex items-center gap-1.5 mb-3 sm:mb-4">
              <GameMenu showAdmin={showAdmin} onTabChange={setActiveTab} onShowTutorial={() => setShowTutorial(true)} onMarketSubTabChange={setMarketSubTab} tutorialCompleted={tutorialCompleted} />
              <GameNavBar />
            </div>
          )}
          <ErrorBoundary label={`tab:${activeTab}`}>
            <GameTabRouter
              game={game}
              mp={mp}
              userId={userId}
              displayName={displayName}
              showAdmin={showAdmin}
              isFounder={isFounder}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              activeTournamentId={activeTournamentId}
              setActiveTournamentId={setActiveTournamentId}
              onSigningPlayer={setSigningPlayer}
              saveSigningNews={saveSigningNews}
              blockedTabs={blockedTabs}
              isAdmin={isAdminRole}
              isPremium={isPremium}
              marketSubTab={marketSubTab}
              setMarketSubTab={setMarketSubTab}
            />
          </ErrorBoundary>
        </Tabs>
      </main>
    </div>
  );
}

/**
 * Wrapper persistente do modal "Bola de Ouro / Fim de Temporada".
 * Garante que, uma vez fechado pelo jogador, NUNCA mais reapareça
 * para aquela temporada (mesmo após F5 ou re-login).
 */
function PersistentSeasonAwards({
  season,
  userId,
  onClose,
}: { season: number; userId?: string; onClose: () => void }) {
  const { isVisible, dismiss } = useDismissibleWidget(
    `season_awards_${season}`,
    userId,
    { type: 'season_end' },
  );
  if (!isVisible) {
    // Já dispensado/expirado — também limpa o gate no Index para não rechecar.
    Promise.resolve().then(onClose);
    return null;
  }
  return (
    <SeasonAwardsModal
      open
      season={season}
      onClose={() => { dismiss(); onClose(); }}
    />
  );
}

export default Index;
