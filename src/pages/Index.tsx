import { Tabs } from '@/components/ui/tabs';
import { GameHeader } from '@/components/game/GameHeader';
import { GameMenu } from '@/components/game/GameMenu';
import { GameNavBar } from '@/components/game/GameNavBar';
import { GameTabRouter } from '@/components/game/GameTabRouter';
import { MaintenanceScreen } from '@/components/game/MaintenanceScreen';
import { UpdatePopupWidget } from '@/components/game/UpdatePopupWidget';
import { UpdateAnnouncementModal, GAME_VERSION } from '@/components/game/UpdateAnnouncementModal';
import { TutorialModal } from '@/components/game/TutorialModal';
import { ClubCreation, ClubConfig } from '@/components/game/ClubCreation';
import { PlayerSigningModal } from '@/components/game/PlayerSigningModal';
import { GameLoadingScreen } from '@/components/game/GameLoadingScreen';
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
import { toast } from 'sonner';
import { useEffect, useCallback, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthPage from './Auth';

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
      matches: [],
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
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [signingPlayer, setSigningPlayer] = useState<{ name: string; position: string; overall: number; age: number; eventType?: 'signing' | 'renewal' | 'loan'; extraInfo?: string } | null>(null);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);

  const game = useGame(initialState, userId);
  const mp = useMultiplayer(userId, displayName, game.club.name, game.club.country);
  usePresence(userId);

  // Check maintenance mode
  useEffect(() => {
    const checkMaintenance = async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'maintenance_mode').maybeSingle();
      if (data?.value) {
        const val = data.value as any;
        setIsMaintenanceMode(val.active === true);
      }
      setMaintenanceChecked(true);
    };
    checkMaintenance();
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle match/tournament navigation state
  useEffect(() => {
    const st = location.state as {
      serverMatchResult?: { matchDbId: string; homeGoals: number; awayGoals: number };
      playTournamentMatch?: { matchId: string; tournamentMatchId: string; opponentName: string; opponentStrength: number; isHome: boolean; competition: string };
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
        },
      });
      return;
    }

    if (st?.serverMatchResult) {
      const { matchDbId, homeGoals, awayGoals } = st.serverMatchResult;
      const pendingMatch = game.club.matches.find(m => m.id === matchDbId && !m.played) ?? game.club.matches.find(m => !m.played);
      if (pendingMatch) {
        game.applyServerResult({ matchId: pendingMatch.id, homeGoals, awayGoals, isHome: pendingMatch.isHome ?? true });
      }
      supabase.from('live_matches').delete().eq('id', matchDbId).then(() => {});
      navigate('/', { replace: true, state: {} });
      return;
    }

    // Check for stale finished matches
    if (!st?.serverMatchResult) {
      const checkFinished = async () => {
        const { data: finishedMatches } = await supabase.from('live_matches').select('match_id, home_goals, away_goals, is_home, id, status').eq('status', 'finished').order('created_at', { ascending: false }).limit(1);
        if (!finishedMatches || finishedMatches.length === 0) return;
        const fm = finishedMatches[0];
        await supabase.from('live_matches').delete().eq('id', fm.id);
        const localMatch = game.club.matches.find(m => m.id === fm.match_id && !m.played) ?? game.club.matches.find(m => !m.played);
        if (localMatch) {
          game.applyServerResult({ matchId: localMatch.id, homeGoals: fm.home_goals, awayGoals: fm.away_goals, isHome: fm.is_home ?? localMatch.isHome ?? true });
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
      await supabase.from('newspaper_entries').insert([{ user_id: userId, text: text.trim(), category, is_event: true }]);
    } catch (err) { console.error('Error saving signing news:', err); }
  }, [userId, game.club.name]);

  // Auto-save
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameState = game.getFullState();

  const saveGame = useCallback(async (silent = false) => {
    const state = game.getFullState();
    const jsonState = JSON.parse(JSON.stringify(state));
    const { data: existing } = await supabase.from('game_saves').select('id').eq('user_id', userId).limit(1).maybeSingle();
    if (existing) await supabase.from('game_saves').update({ club_data: jsonState }).eq('id', existing.id);
    else await supabase.from('game_saves').insert([{ user_id: userId, club_data: jsonState }]);
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
  }, [mp.currentLeague?.id, game.club.players.length, game.infrastructure.stadium.level]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show changelog
  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('flm-last-version-seen');
    if (lastSeenVersion !== GAME_VERSION) setShowChangelog(true);
  }, []);

  if (maintenanceChecked && isMaintenanceMode && !isAdminRole) return <MaintenanceScreen />;

  const showAdmin = isAdminRole;

  return (
    <div className="min-h-screen bg-background">
      <UpdatePopupWidget userId={userId} />
      <UpdateAnnouncementModal open={showChangelog} onClose={() => { localStorage.setItem('flm-last-version-seen', GAME_VERSION); setShowChangelog(false); }} />
      <TutorialModal open={showTutorial} onClose={() => setShowTutorial(false)} onNavigateTab={setActiveTab} onComplete={() => { game.addBonus(500000, 'Recompensa por completar o Tutorial'); toast.success('🎉 Tutorial completo! Você ganhou R$500.000!'); }} />
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

      <GameHeader club={game.club} season={game.season} infrastructure={game.infrastructure} listedPlayers={game.listedForSale} userId={userId} isNewClub={isNewClub} onSignOut={onSignOut} />

      <main className="max-w-5xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center gap-1.5 mb-3 sm:mb-4">
            <GameMenu showAdmin={showAdmin} onTabChange={setActiveTab} onShowTutorial={() => setShowTutorial(true)} />
            <GameNavBar />
          </div>
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
          />
        </Tabs>
      </main>
    </div>
  );
}

export default Index;
