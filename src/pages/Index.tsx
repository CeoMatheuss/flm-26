import { Tabs } from '@/components/ui/tabs';
import { PlayerHighlightProvider, usePlayerHighlight } from '@/contexts/PlayerHighlightContext';
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
import { BankruptcyScreen } from '@/components/game/BankruptcyScreen';
import { PlayerSigningModal } from '@/components/game/PlayerSigningModal';
import { GameLoadingScreen } from '@/components/game/GameLoadingScreen';
import { SeasonAwardsModal } from '@/components/game/SeasonAwardsModal';
import { VersionUpdateOverlay } from '@/components/game/VersionUpdateOverlay';
import { PromotionManager } from '@/components/game/promotion/PromotionManager';
import { useVersionGuard } from '@/hooks/useVersionGuard';
import { useAutoUpdate } from '@/hooks/useAutoUpdate';
import { initialClub } from '@/data/initialData';
import { defaultTactics } from '@/types/tactics';
import { getLeagueTeams, countryNames } from '@/types/league';
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
import { syncEngine } from '@/hooks/useWorldSync';
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
  const { session, loading, signOut, refreshSession } = useAuth();
  
  if (loading) {
    return (
      <GameLoadingScreen 
        message="Conectando ao servidor" 
        subMessage="Verificando sua sessão ativa..." 
        onRetry={() => {
          console.log('[Index] Forçando recarregamento da sessão...');
          refreshSession?.();
        }}
      />
    );
  }

  if (!session) return <AuthPage />;
  

  return (
    <PlayerHighlightProvider>
      <GameApp userId={session.user.id} userEmail={session.user.email || ''} onSignOut={signOut} />
    </PlayerHighlightProvider>
  );
};

function GameApp({ userId, userEmail, onSignOut }: { userId: string; userEmail: string; onSignOut: () => void }) {
  const { addHighlight } = usePlayerHighlight();
  const [loadedState, setLoadedState] = useState<GameState | undefined>(undefined);
  const [gameReady, setGameReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [hasSave, setHasSave] = useState(false);
  const [isNewClub, setIsNewClub] = useState(false);
  const [isBankrupt, setIsBankrupt] = useState(false);
  const [bankruptClubData, setBankruptClubData] = useState<{ name: string; shield_config: any } | null>(null);
  const [displayName, setDisplayName] = useState('Manager');
  const [loadStage, setLoadStage] = useState<string>('Iniciando');
  const [loadSubStage, setLoadSubStage] = useState<string>('');
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const CACHE_KEY = `flm:club-cache:${userId}`;

    const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = 25000, label = 'requisição'): Promise<T> => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          promise,
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(`Tempo limite ao executar: ${label}`)), timeoutMs);
          }),
        ]);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    const fetchSaveWithRetry = async (maxRetries = 3): Promise<any> => {
      let lastErr: any = null;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 1) {
            setLoadStage(`Reconectando aos servidores (tentativa ${attempt}/${maxRetries})`);
            console.warn(`[GameApp] Tentativa ${attempt}/${maxRetries} de carregar save...`);
            await new Promise(r => setTimeout(r, 800 * (attempt - 1)));
          }
          const t0 = performance.now();
          const res: any = await withTimeout(
            Promise.resolve(
              supabase.from('game_saves').select('club_data').eq('user_id', userId)
                .order('updated_at', { ascending: false }).limit(1).maybeSingle()
            ),
            25000,
            'carregar save do clube',
          );
          const ms = Math.round(performance.now() - t0);
          console.log(`[GameApp] Save carregado em ${ms}ms (tentativa ${attempt})`);
          if (res.error) throw res.error;
          return res;
        } catch (err: any) {
          lastErr = err;
          console.error(`[GameApp] Falha na tentativa ${attempt}:`, err?.message || err);
        }
      }
      throw lastErr || new Error('Falha desconhecida ao carregar o clube.');
    };

    const load = async () => {
      const startedAt = performance.now();
      setGameReady(false);
      setLoadError(null);
      setLoadedState(undefined);
      setHasSave(false);
      setIsOfflineFallback(false);
      setLoadStage('Verificando autenticação');
      setLoadSubStage('');

      try {
        // 1) Validar sessão
        const { data: sessionRes } = await supabase.auth.getSession();
        if (!sessionRes.session) {
          // Tentar refresh
          const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
          if (refreshErr || !refreshed.session) {
            throw new Error('Sua sessão expirou. Faça login novamente.');
          }
          console.log('[GameApp] Sessão renovada automaticamente.');
        }
        if (cancelled) return;

        // 2) Buscar save com retry
        setLoadStage('Carregando dados do clube');
        setLoadSubStage('Buscando o último save no servidor');
        const saveRes = await fetchSaveWithRetry(3);
        if (cancelled) return;

        if (saveRes.data?.club_data) {
          setLoadStage('Buscando elenco e infraestrutura');
          try {
            const loaded = saveRes.data.club_data as unknown as GameState;
            if (loaded.infrastructure?.stadium && loaded.infrastructure.stadium.maxLevel < 15) {
              loaded.infrastructure.stadium.maxLevel = 15;
            }
            if (loaded.club && (loaded.club.fans ?? 0) < 1000) {
              loaded.club.fans = 1000;
            }
            setLoadedState(loaded);
            setHasSave(true);
            // Cache local para fallback offline
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), state: loaded }));
            } catch (e) {
              console.warn('[GameApp] Falha ao cachear save local:', e);
            }
            toast.success('Save carregado!');
          } catch (parseErr) {
            console.error('[GameApp] Erro ao preparar save:', parseErr);
            throw new Error('Seu save foi encontrado, mas os dados não puderam ser preparados.');
          }
        }

        // 3) Dados secundários — paralelos, não bloqueantes
        setLoadStage('Finalizando dados do clube');
        setLoadSubStage('Sincronizando perfil e identidade');
        Promise.allSettled([
          supabase.from('profiles').select('display_name').eq('user_id', userId).maybeSingle(),
          supabase.from('clubs').select('name, shield_config, bankrupt_at').eq('user_id', userId).maybeSingle(),
        ]).then(([profileResult, clubResult]) => {
          if (cancelled) return;
          if (profileResult.status === 'fulfilled' && profileResult.value.data?.display_name) {
            setDisplayName(profileResult.value.data.display_name);
          }
          if (clubResult.status === 'fulfilled' && clubResult.value.data?.bankrupt_at) {
            setIsBankrupt(true);
            setBankruptClubData({ name: clubResult.value.data.name, shield_config: clubResult.value.data.shield_config });
          }
        }).catch((err) => {
          console.warn('[GameApp] Dados secundários falharam (não crítico):', err);
        });

        const total = Math.round(performance.now() - startedAt);
        console.log(`[GameApp] ✅ Carregamento concluído em ${total}ms`);
      } catch (err: any) {
        if (cancelled) return;
        console.error('[GameApp] ❌ Erro ao carregar save:', err);

        // Tentar fallback offline com cache local
        try {
          const cachedRaw = localStorage.getItem(CACHE_KEY);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if (cached?.state) {
              console.warn('[GameApp] Usando cache local como fallback offline.');
              setLoadedState(cached.state as GameState);
              setHasSave(true);
              setIsOfflineFallback(true);
              toast.warning('Modo offline temporário — exibindo último save local.');
              return; // segue para gameReady=true no finally
            }
          }
        } catch (cacheErr) {
          console.error('[GameApp] Cache local corrompido:', cacheErr);
          try { localStorage.removeItem(CACHE_KEY); } catch {}
        }

        setLoadError(err?.message || 'Erro ao carregar seus dados.');
      } finally {
        if (!cancelled) setGameReady(true);
      }
    };
    load();

    // Inicializar o World Sync Engine
    syncEngine.setUserId(userId);

    // Sincronização Realtime para recarregar o estado se mudar no servidor
    const channel = supabase.channel(`sync-app-${userId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'game_saves', 
        filter: `user_id=eq.${userId}` 
      }, (payload) => {
        console.log('[Realtime] Mudança detectada no save do servidor:', payload);
        if (payload.new && (payload.new as any).club_data) {
          setLoadedState((payload.new as any).club_data as GameState);
          setIsOfflineFallback(false);
        }
      })
      .subscribe();

    // 🔄 World Sync Engine: Force Resync handler
    const handleForceResync = async () => {
      console.log('[Index] Forçando resincronização total com o servidor...');
      const loadingToast = toast.loading('Sincronizando estado oficial...');
      
      const { data: saveRes } = await supabase
        .from('game_saves')
        .select('club_data')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (saveRes?.club_data) {
        setLoadedState(saveRes.club_data as unknown as GameState);
        toast.dismiss(loadingToast);
        toast.success('Estado sincronizado com o servidor!');
      } else {
        toast.dismiss(loadingToast);
        toast.error('Falha ao obter estado oficial.');
      }
    };

    window.addEventListener('flm:force-resync', handleForceResync);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel); 
      window.removeEventListener('flm:force-resync', handleForceResync);
    };
  }, [userId, loadAttempt]);

  const handleClubCreated = useCallback(async (config: ClubConfig) => {
    const countryName = countryNames[config.country] || config.country;
    console.log(`[club-creation] 🚀 Iniciando processo de criação/substituição para: ${config.name} (${countryName})`);
    
    // 0. Geração inicial de elenco
    const initialPlayers = generateInitialSquad(config.name, 'starter');
    console.log(`[club-creation] 👥 ${initialPlayers.length} jogadores gerados para o elenco inicial.`);

    // 1. Procurar vaga disponível (BOT) para assumir
    console.log(`[club-creation] 🔍 Procurando BOT disponível em ${countryName}...`);
    
    // Tenta encontrar um BOT no país selecionado, preferindo menor força (reputação)
    const { data: botTeam, error: botSearchErr } = await supabase
      .from('world_teams')
      .select('id, name, league_id, strength')
      .eq('is_bot', true)
      .eq('country', countryName)
      .order('strength', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (botSearchErr) {
      console.error('[club-creation] ❌ Erro ao buscar bot:', botSearchErr);
    }

    let finalWorldTeamId: string;
    let replacementId = 'NEW';

    if (botTeam) {
      finalWorldTeamId = botTeam.id;
      replacementId = botTeam.id;
      console.log(`[club-creation] ✅ BOT encontrado para substituição: ${botTeam.name} (ID: ${botTeam.id}, Força: ${botTeam.strength})`);
      
      // Assume a vaga do BOT
      const { error: hijackErr } = await supabase
        .from('world_teams')
        .update({
          user_id: userId,
          name: config.name,
          is_bot: false,
          logo: config.logoUrl,
          strength: 65,
          updated_at: new Date().toISOString()
        })
        .eq('id', botTeam.id);

      if (hijackErr) {
        console.error('[club-creation] ❌ Erro ao sequestrar vaga do bot:', hijackErr);
        toast.error('Erro ao assumir vaga do bot. Criando novo registro...');
        // Fallback: create new if hijack fails (shouldn't happen with correct RLS)
        const { data: newWT } = await supabase.from('world_teams').insert({
          user_id: userId, name: config.name, country: countryName, is_bot: false, logo: config.logoUrl, strength: 65
        }).select().single();
        finalWorldTeamId = newWT?.id || '';
      }
    } else {
      console.log(`[club-creation] ℹ️ Nenhum BOT disponível em ${countryName}. Criando novo registro no mundo...`);
      // Verifica se o usuário já tem um world_team (limpeza de segurança)
      const { data: existingWT } = await supabase.from('world_teams').select('id').eq('user_id', userId).maybeSingle();
      
      if (existingWT) {
        finalWorldTeamId = existingWT.id;
        await supabase.from('world_teams').update({ name: config.name, logo: config.logoUrl, country: countryName, is_bot: false }).eq('id', finalWorldTeamId);
      } else {
        const { data: newWT, error: nwtErr } = await supabase.from('world_teams').insert({
          user_id: userId, name: config.name, country: countryName, is_bot: false, logo: config.logoUrl, strength: 65
        }).select().single();
        
        if (nwtErr) {
          console.error('[club-creation] ❌ Erro fatal ao criar registro mundial:', nwtErr);
          toast.error('Erro ao registrar clube no mundo.');
          return;
        }
        finalWorldTeamId = newWT.id;
      }
    }

    // 2. Salvar metadados do clube (UI/Config)
    console.log('[club-creation] 💾 Salvando configurações do clube...');
    const clubsPayload = {
      user_id: userId,
      name: config.name,
      country: countryName, // Usar nome completo para consistência
      stadium_name: config.stadiumName || 'Estádio Municipal',
      primary_color: config.primaryColor,
      secondary_color: config.secondaryColor,
      detail_color: config.detailColor,
      logo_url: config.logoUrl,
      fans: 1000,
      reputation: 65,
      budget: 1000000,
      cash: 1000000,
      shield_config: (config as any).shieldConfig,
    };

    const { data: clubData, error: clubErr } = await supabase
      .from('clubs')
      .upsert(clubsPayload, { onConflict: 'user_id' })
      .select()
      .single();

    if (clubErr) {
      console.error('[club-creation] ❌ ERRO ao salvar metadados do clube:', clubErr);
      toast.error(`Erro ao registrar clube: ${clubErr.message}`);
      return;
    }

    // 3. Vincular jogadores ao worldTeamId (ID real da liga)
    console.log('[club-creation] ⚽ Vinculando elenco ao ID oficial:', finalWorldTeamId);
    
    // Limpar jogadores antigos do BOT ou do usuário
    await supabase.from('world_players').delete().eq('team_id', finalWorldTeamId);

    const worldPlayersPayload = initialPlayers.map(p => ({
      team_id: finalWorldTeamId,
      name: p.name,
      position: p.position,
      overall: p.overall,
      age: p.age,
      market_value: p.marketValue || 0,
      potential: p.potential || p.overall + 5,
      salary: p.salary || 500,
      attributes: p.attributes as any,
      stamina: p.stamina || 100,
      stamina_max: p.stamina_max || 100,
      morale: p.morale || 70,
      nationality: p.nationality || countryName,
      resistance: p.resistance || 50,
      squad_status: (p.squadRole === 'titular' ? 'starter' : (p.squadRole === 'reserva' ? 'bench' : 'reserve')) as any
    }));

    const { error: playersErr } = await supabase.from('world_players').insert(worldPlayersPayload);
    if (playersErr) console.error('[club-creation] ❌ Erro ao salvar jogadores:', playersErr);

    // 4. Preparar estado final do app
    const customClub = {
      ...initialClub,
      id: finalWorldTeamId, // Usar o ID oficial do mundo
      name: config.name,
      stadiumName: config.stadiumName || 'Arena ' + config.name,
      fans: 1000,
      players: initialPlayers,
      matches: [],
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      detailColor: config.detailColor,
      shieldPattern: config.shieldPattern,
      shieldShape: config.shieldShape,
      shieldIcon: (config as any).shieldIcon,
      shieldConfig: (config as any).shieldConfig,
      logoUrl: config.logoUrl,
      country: countryName,
    };

    const initialClubProfile = {
      ownerName: displayName || 'Manager',
      instagram: '',
      bio: '',
      foundedSeason: defaultSeason.currentSeason ?? 1,
      foundedDate: new Date().toLocaleDateString('pt-BR'),
      motto: '',
      trophies: [],
    };

    const newState: GameState = {
      club: customClub,
      tactics: defaultTactics,
      leagueTeams: [], // Será populado pelo sync real-time ou navegação
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

    // Salvar estado completo no game_saves
    const jsonState = JSON.parse(JSON.stringify(newState));
    await supabase.from('game_saves').upsert({ user_id: userId, club_data: jsonState }, { onConflict: 'user_id' });

    // 5. Notificação e Log Final
    console.log(`[club-creation] ✨ Sucesso! Substituição concluída. ID: ${replacementId}`);
    
    await supabase.from('user_notifications').insert([{
      user_id: userId,
      icon: '🏆',
      title: 'Vaga Assumida!',
      message: botTeam 
        ? `Você assumiu a vaga do ${botTeam.name} na liga! Seu novo elenco já está pronto.`
        : `Seu clube ${config.name} foi criado com sucesso no mundo do FLM!`,
      type: 'success',
    }]);

    setLoadedState(newState);
    setHasSave(true);
    setIsNewClub(true);
    toast.success(`${config.name} criado com sucesso! 🏆`);
  }, [userId, displayName]);

  if (!gameReady) {
    return (
      <GameLoadingScreen 
        message={loadStage || 'Carregando seu clube'} 
        subMessage={loadSubStage || 'Preparando dados do jogo'} 
        onRetry={() => {
          console.log('[GameApp] Reiniciando carregamento do clube...');
          setLoadAttempt(prev => prev + 1);
        }}
      />
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 text-center">
          <h2 className="text-lg font-bold text-foreground">Não foi possível carregar o clube</h2>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <p className="text-[11px] text-muted-foreground/70">
            Verifique sua conexão. Vamos tentar novamente automaticamente até 3 vezes ao clicar abaixo.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setLoadAttempt((n) => n + 1)}>Tentar novamente</Button>
            <Button variant="outline" onClick={onSignOut}>Sair</Button>
          </div>
        </div>
      </div>
    );
  }

  // Banner discreto quando estamos exibindo dados do cache local
  const offlineBanner = isOfflineFallback ? (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[200] px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold backdrop-blur-sm">
      ⚠️ Modo offline temporário — exibindo último save local
    </div>
  ) : null;
  
  if (isBankrupt) {
    return (
      <BankruptcyScreen 
        clubName={bankruptClubData?.name || 'Seu Clube'} 
        shieldConfig={bankruptClubData?.shield_config}
        onSignOut={onSignOut}
        onReactivate={async () => {
          const loadingToast = toast.loading('Reativando clube...');
          try {
            // Limpar data de falência e resetar game_save
            await supabase.from('clubs').update({ 
              bankrupt_at: null,
              budget: 1000000,
              cash: 1000000,
              fans: 1000,
              reputation: 65,
              consecutive_negative_days: 0
            }).eq('user_id', userId);
            
            // Re-executar criação (sem mudar nome)
            if (bankruptClubData) {
              const config: ClubConfig = {
                name: bankruptClubData.name,
                country: 'Brasil', // Default or fetch
                primaryColor: '#444',
                secondaryColor: '#fff',
                detailColor: '#000',
                shieldPattern: 'solid',
                shieldShape: 'classic',
                stadiumName: 'Arena ' + bankruptClubData.name,
                shieldConfig: bankruptClubData.shield_config,
                logoUrl: '',
              };
              await handleClubCreated(config);
              setIsBankrupt(false);
            }
          } catch (e) {
            toast.error('Erro ao reativar clube');
          } finally {
            toast.dismiss(loadingToast);
          }
        }}
        onCreateNew={async () => {
          // Deletar clube antigo para permitir criação de novo
          await supabase.from('clubs').delete().eq('user_id', userId);
          setHasSave(false);
          setIsBankrupt(false);
        }}
      />
    );
  }

  if (!hasSave) return <ClubCreation userId={userId} onComplete={handleClubCreated} />;
  return <GameUI userId={userId} userEmail={userEmail} displayName={displayName} onSignOut={onSignOut} initialState={loadedState} isNewClub={isNewClub} />;
}

function GameUI({ userId, userEmail, displayName, onSignOut, initialState, isNewClub }: { userId: string; userEmail: string; displayName: string; onSignOut: () => void; initialState?: GameState; isNewClub?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { addHighlight } = usePlayerHighlight();
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
  const [signingPlayer, setSigningPlayer] = useState<{ id?: string; name: string; position: string; overall: number; age: number; signingType?: string; eventType?: 'signing' | 'renewal' | 'loan'; extraInfo?: string } | null>(null);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [pendingAwardsSeason, setPendingAwardsSeason] = useState<number | null>(null);
  const [viewingClubName, setViewedClubName] = useState<string | null>(searchParams.get('name'));

  // Listen for tab change events
  useEffect(() => {
    const handleTabChange = (event: any) => {
      if (event.detail) {
        setActiveTab(event.detail);
      }
    };

    window.addEventListener('flm:change-tab', handleTabChange);
    return () => window.removeEventListener('flm:change-tab', handleTabChange);
  }, []);

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
  
  // Auto update: verifica novas versões do app (frontend) no servidor
  const { updateAvailable, updateNow } = useAutoUpdate();

  const { isPremium } = usePremiumStatus(userId);
  const game = useGame(initialState, userId, isPremium);
  const mp = useMultiplayer(userId, displayName, game.club.name, game.club.country);
  const rosterSyncKey = useMemo(() => (
    game.club.players.map((p: any, index: number) => `${index}:${p.id}:${p.position}:${p.overall}:${p.stamina}:${p.squadRole}:${p.contractStatus}:${!!p.injury}`).join('|')
  ), [game.club.players]);
  usePresence(userId);
  usePendingMatchFlush(userId);
  useAutoSimulator(userId);

  // Auto-fix and Initialize league + NATIONAL CUPS for current month (CRITICAL SYNC)
  useEffect(() => {
    if (!userId) return;
    
    const today = new Date();
    const day = today.getDate();

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

        
        // 1. Geração automática no Dia 10
        if (day === 10) {
          const lastDraw = localStorage.getItem(`cup_draw_${today.getMonth()}_${today.getFullYear()}`);
          if (!lastDraw) {
            console.log('[CupManager] Official Draw Day detected (10th). Running Global Draw...');
            supabase.functions.invoke('national-cup-manager', { body: { action: 'generate_all_national_cups' } }).catch(() => {});
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
              supabase.functions.invoke('national-cup-manager', { body: { action: 'advance_phase' } }).catch(() => {});
              localStorage.setItem(`cup_sim_${day}_${today.getMonth()}_${today.getFullYear()}`, 'done');
            }
          }
        }
      } catch (e) {
        console.error('Failed to sync competitions:', e);
      }
    };
    initCompetitions();
    // Process shop bonuses daily (now with catch-up logic for offline days)
    supabase.rpc('process_daily_shop_bonuses', { p_user_id: userId }).then(({ data }) => {
      const result = data as any;
      if (result && result.success) {
        console.log('[Shop] Daily bonuses processed:', result);
        if (result.days_processed > 0) {
          // If we caught up multiple days, show a nice toast and refresh UI
          if (result.days_processed > 1) {
            toast.info(`📅 Bem-vindo de volta! Recebemos seus bônus de ${result.days_processed} dias offline.`);
          }
          window.dispatchEvent(new CustomEvent('flm:refresh-club-data'));
        }
      }
    });

    // Process monthly finance on the first of the month
    if (day === 1) {
      const lastMonthProcessed = localStorage.getItem(`finance_month_${today.getMonth()}_${today.getFullYear()}`);
      if (!lastMonthProcessed) {
        console.log('[FinanceManager] First day of the month. Processing monthly salaries and maintenance...');
        game.processMonthlyFinance();
        localStorage.setItem(`finance_month_${today.getMonth()}_${today.getFullYear()}`, 'done');
      }
    }
  }, [userId, game.enrollWorldLeague, game.processMonthlyFinance]);


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
    if (signingPlayer?.id) {
      addHighlight(signingPlayer.id, signingPlayer.signingType === 'loan_in' ? 'listed_loan' : 'new_signing');
    }
  }, [signingPlayer?.id, addHighlight]);

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
    const handleNavigateToMatch = (e: any) => {
      const match = e.detail;
      if (!match?.matchId) return;
      
      navigate('/match', {
        replace: true,
        state: {
          homeTeam: match.isHome ? game.club.name : match.opponentName,
          awayTeam: match.isHome ? match.opponentName : game.club.name,
          homePlayers: game.club.players,
          homeStrength: Math.round(game.club.players.reduce((s, p) => s + p.overall, 0) / Math.max(1, game.club.players.length)),
          awayStrength: match.opponentStrength || 70,
          matchId: match.matchId,
          tactics: game.tactics || defaultTactics,
          stadiumName: match.isHome ? game.club.stadiumName : 'Estádio do Mundial',
          stadiumCapacity: 50000, // Mundial stadium
          isHome: match.isHome,
          competition: match.competition || 'Super Mundial',
          tieBreaker: 'both',
        },
      });
    };

    window.addEventListener('flm:navigate-to-match', handleNavigateToMatch);
    return () => window.removeEventListener('flm:navigate-to-match', handleNavigateToMatch);
  }, [game.club.name, game.club.players, game.tactics, game.club.stadiumName, navigate]);

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
            // Advance league round and sync standings if needed
            supabase.rpc('sync_league_integrity', { _user_id: userId } as any).then(() => {
               window.dispatchEvent(new CustomEvent('flm:match-finalized'));
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
              const fansChange = fmStats.fansChange || 0;
              const fanMessage = fmStats.fanMessage || '';

              // Inserir fansChange no reportData se disponível
              if (fansChange !== 0 && reportData.impacts) {
                reportData.impacts.fansChange = fansChange;
                reportData.impacts.fanMessage = fanMessage;
              }

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
                message: `${fm.competition || 'Amistoso'}\nPosse: ${possession}% | Finalizações: ${shots} (${shotsOnTarget} no gol)\nRanking: ${rankingChange > 0 ? '+' : ''}${rankingChange} pts${fansChange !== 0 ? ` | Torcida: ${fansChange > 0 ? '+' : ''}${fansChange}` : ''}`,
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
    // Aumentado para 10 segundos para reduzir pressão no banco de dados
    saveTimeoutRef.current = setTimeout(() => saveGame(true), 10000);
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
  }, [mp.currentLeague?.id, rosterSyncKey, game.tactics, game.infrastructure.stadium.level, (game.club as any).shieldConfig]); // eslint-disable-line react-hooks/exhaustive-deps

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
          category: 'Clube',
          actions: [
            { label: 'Ir para Elenco', type: 'navigate', payload: { tab: 'squad' } },
            { label: 'Melhorar CT', type: 'navigate', payload: { tab: 'training' } }
          ]
        });
      }
    };
    sendWelcome();
  }, [userId]);

  // Season awards trigger — opens the modal once per new season
  useEffect(() => {
    const checkAwards = async () => {
      const [{ data: latestAward }, { data: profile }] = await Promise.all([
        supabase.from('season_awards').select('season, created_at').order('season', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('profiles').select('viewed_awards_season').eq('user_id', userId).maybeSingle(),
      ]);
      if (!latestAward) return;
      // Só exibe no MESMO DIA em que as premiações foram geradas.
      const createdAt = (latestAward as any).created_at ? new Date((latestAward as any).created_at) : null;
      if (!createdAt) return;
      const now = new Date();
      const sameDay =
        createdAt.getFullYear() === now.getFullYear() &&
        createdAt.getMonth() === now.getMonth() &&
        createdAt.getDate() === now.getDate();
      if (!sameDay) return;
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
      {/* Widget de atualização removido a pedido */}
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
      {/* Celebratory Modal — Modificado para disparar o Destaque Visual */}
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
          <div className="flex items-center gap-1.5 mb-3 sm:mb-4">
            <GameMenu 
              showAdmin={showAdmin} 
              onTabChange={setActiveTab} 
              onShowTutorial={() => setShowTutorial(true)} 
              onMarketSubTabChange={setMarketSubTab} 
              tutorialCompleted={tutorialCompleted}
              updateAvailable={updateAvailable}
              onUpdateNow={updateNow}
            />
            <GameNavBar />
          </div>
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
