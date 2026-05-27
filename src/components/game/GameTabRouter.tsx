import { TabsContent } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent } from '@/components/ui/card';
import { getStadiumCapacity } from '@/types/infrastructure';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useMemo, lazy, Suspense } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import type { useGame } from '@/hooks/useGame';
import type { useMultiplayer } from '@/hooks/useMultiplayer';

// Lazy load heavy components
const DashboardTab = lazy(() => import('@/components/game/DashboardTab').then(m => ({ default: m.DashboardTab })));
const TacticsTab = lazy(() => import('@/components/game/TacticsTab').then(m => ({ default: m.TacticsTab })));
const PhysioTab = lazy(() => import('@/components/game/PhysioTab').then(m => ({ default: m.PhysioTab })));
const MultiplayerTab = lazy(() => import('@/components/game/MultiplayerTab').then(m => ({ default: m.MultiplayerTab })));
const OnlineMarketTab = lazy(() => import('@/components/game/OnlineMarketTab').then(m => ({ default: m.OnlineMarketTab })));
const NewspaperFullPage = lazy(() => import('@/components/game/NewspaperFullPage').then(m => ({ default: m.NewspaperFullPage })));
const ChampionshipsTab = lazy(() => import('@/components/game/ChampionshipsTab').then(m => ({ default: m.ChampionshipsTab })));
const ScoutsTab = lazy(() => import('@/components/game/ScoutsTab').then(m => ({ default: m.ScoutsTab })));
const MatchesTab = lazy(() => import('@/components/game/MatchesTab').then(m => ({ default: m.MatchesTab })));
const FinanceTab = lazy(() => import('@/components/game/FinanceTab').then(m => ({ default: m.FinanceTab })));
const InfrastructureTab = lazy(() => import('@/components/game/InfrastructureTab').then(m => ({ default: m.InfrastructureTab })));
const TrainingCenterTab = lazy(() => import('@/components/game/TrainingCenterTab').then(m => ({ default: m.TrainingCenterTab })));
const StadiumTab = lazy(() => import('@/components/game/StadiumTab').then(m => ({ default: m.StadiumTab })));
const YouthAcademyTab = lazy(() => import('@/components/game/YouthAcademyTab').then(m => ({ default: m.YouthAcademyTab })));
const FansTab = lazy(() => import('@/components/game/FansTab').then(m => ({ default: m.FansTab })));
const MembersTab = lazy(() => import('@/components/game/MembersTab').then(m => ({ default: m.MembersTab })));
const InfrastructureWrapper = lazy(() => import('@/components/game/InfrastructureWrapper').then(m => ({ default: m.InfrastructureWrapper })));
const GlobalChatTab = lazy(() => import('@/components/game/GlobalChatTab').then(m => ({ default: m.GlobalChatTab })));
const AuctionTab = lazy(() => import('@/components/game/AuctionTab').then(m => ({ default: m.AuctionTab })));
const UniformsTab = lazy(() => import('@/components/game/UniformsTab').then(m => ({ default: m.UniformsTab })));
const AchievementsTab = lazy(() => import('@/components/game/AchievementsTab').then(m => ({ default: m.AchievementsTab })));
const ClubProfileTab = lazy(() => import('@/components/game/ClubProfileTab').then(m => ({ default: m.ClubProfileTab })));
const CTRoomsTab = lazy(() => import('@/components/game/CTRoomsTab').then(m => ({ default: m.CTRoomsTab })));
const TrophiesTab = lazy(() => import('@/components/game/TrophiesTab').then(m => ({ default: m.TrophiesTab })));
const RankingTab = lazy(() => import('@/components/game/RankingTab').then(m => ({ default: m.RankingTab })));
const SettingsTab = lazy(() => import('@/components/game/SettingsTab').then(m => ({ default: m.SettingsTab })));
const ClubSettingsTab = lazy(() => import('@/components/game/ClubSettingsTab').then(m => ({ default: m.ClubSettingsTab })));
const RulesTab = lazy(() => import('@/components/game/RulesTab').then(m => ({ default: m.RulesTab })));
const CopasTab = lazy(() => import('./CopasTab').then(m => ({ default: m.CopasTab })));
const WorldLeagues = lazy(() => import('./WorldLeagues').then(m => ({ default: m.WorldLeagues })));
const WorldCupTab = lazy(() => import('./WorldCupTab').then(m => ({ default: m.WorldCupTab })));
const ContinentalTab = lazy(() => import('./ContinentalTab').then(m => ({ default: m.ContinentalTab })));
const AdminTab = lazy(() => import('@/components/game/AdminTab').then(m => ({ default: m.AdminTab })));
const PacotinhosTab = lazy(() => import('@/components/game/PacotinhosTab').then(m => ({ default: m.PacotinhosTab })));
const LojaFLM = lazy(() => import('@/components/game/LojaFLM').then(m => ({ default: m.LojaFLM })));
const SupportTab = lazy(() => import('@/components/game/SupportTab').then(m => ({ default: m.SupportTab })));
const TermsTab = lazy(() => import("@/components/game/TermsTab").then(m => ({ default: m.TermsTab })));
const SquadModernLayout = lazy(() => import("./squad-modern/SquadModernLayout").then(m => ({ default: m.SquadModernLayout })));
const LeagueTab = lazy(() => import('./LeagueTab').then(m => ({ default: m.LeagueTab })));


interface GameTabRouterProps {
  game: ReturnType<typeof useGame>;
  mp: ReturnType<typeof useMultiplayer>;
  userId: string;
  displayName: string;
  showAdmin: boolean;
  isFounder: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeTournamentId: string | null;
  setActiveTournamentId: (id: string | null) => void;
  onSigningPlayer: (data: any) => void;
  saveSigningNews: (playerName: string, position: string, overall: number, age: number, eventType?: string, extraInfo?: string) => void;
  blockedTabs?: string[];
  isAdmin?: boolean;
  isPremium?: boolean;
  marketSubTab?: string;
  setMarketSubTab?: (tab: string) => void;
}

export function GameTabRouter({ game, mp, userId, displayName, showAdmin, isFounder, activeTab, setActiveTab, activeTournamentId, setActiveTournamentId, onSigningPlayer, saveSigningNews, blockedTabs = [], isAdmin = false, isPremium = false, marketSubTab, setMarketSubTab }: GameTabRouterProps) {
  
  const { winStreak } = useMemo(() => {
    const playedMatches = game.club.matches.filter(m => m.played);
    let ws = 0;
    for (let i = playedMatches.length - 1; i >= 0; i--) {
      const r = playedMatches[i].result;
      if (!r) break;
      if (r.home > r.away) { ws++; }
      else break;
    }
    return { winStreak: ws };
  }, [game.club.matches]);

  const safeBlockedTabs = Array.isArray(blockedTabs) ? blockedTabs : [];
  const isTabBlocked = (tab: string) => !isAdmin && safeBlockedTabs.includes(tab);

  const BlockedMessage = () => (
    <Card className="border-orange-500/30 bg-gradient-to-br from-card to-orange-500/5">
      <CardContent className="p-8 text-center space-y-3">
        <Lock className="h-8 w-8 mx-auto text-orange-400" />
        <h3 className="text-sm font-bold text-orange-400">Seção em Manutenção</h3>
        <p className="text-xs text-muted-foreground">Esta área está temporariamente indisponível. Tente novamente mais tarde.</p>
      </CardContent>
    </Card>
  );

  const TabLoading = () => (
    <div className="flex h-[400px] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </div>
  );

  return (
    <Suspense fallback={<TabLoading />}>
      <TabsContent value="dashboard">
        {isTabBlocked('dashboard') ? <BlockedMessage /> : (
          <DashboardTab 
            club={game.club} 
            events={game.events} 
            infrastructure={game.infrastructure} 
            onOpenNewspaper={() => setActiveTab('journal')} 
            onGoToFriendly={() => setActiveTab('matches')} 
            userId={userId} 
            onOpenTournament={(id: string) => { setActiveTournamentId(id); setActiveTab('tournament'); }} 
            onExploreOtherModes={() => setActiveTab('copas')}
            clubProfile={game.clubProfile} 
            season={game.season?.currentSeason} 
            currentWeek={game.season?.currentWeek} 
            totalWeeks={game.season?.totalWeeks} 
            onViewClub={(name) => { toast.info(`Perfil de ${name}`); }} 
            onGoToSquad={() => setActiveTab('squad')}
            onRestAll={(game as any).restAllPlayers}
          />
        )}
      </TabsContent>
      
      

      <TabsContent value="matches">
        {isTabBlocked('matches') ? <BlockedMessage /> : (
          <MatchesTab
            clubName={game.club.name}
            stadiumName={game.club.stadiumName}
            players={game.club.players}
            teamStrength={game.club.reputation}
            tactics={game.tactics}
            userId={userId}
            stadiumCapacity={getStadiumCapacity(game.infrastructure.stadium.level)}
            fans={game.club.fans}
          />
        )}
      </TabsContent>

      <TabsContent value="squad" className="m-0 h-full">
        {isTabBlocked('squad') ? <BlockedMessage /> : (
          <SquadModernLayout
            club={game.club}
            season={game.season}
            players={game.club.players}
            budget={game.club.budget}
            clubName={game.club.name}
            userId={userId}
            tactics={game.tactics}
            onUpdateTactics={game.setTactics}
            onRest={game.restPlayer}
            onUpdatePlayers={game.updatePlayers}
            youthProspects={game.youthProspects}
            onPromoteYouth={game.promoteYouth}
            onSellYouth={game.sellYouth}
            onEnrollCopinha={game.enrollCopinha}
            onUpgradeAcademy={() => game.upgradeFacility('youthAcademy')}
             youthInvestment={game.youthInvestment}
            onSetYouthInvestment={game.setYouthInvestment}
            infrastructure={game.infrastructure}
            lastYouthGenAt={game.lastYouthGenAt}
            isPremium={isPremium}
            onSpendBudget={(cost, category, description) => {
              game.setClub(prev => ({ ...prev, budget: (prev.budget || 0) - cost }));
              game.addFinance('despesa', category, cost, description);
            }}
          />
        )}
      </TabsContent>

      <TabsContent value="league">
        {isTabBlocked('leagues') ? <BlockedMessage /> : <LeagueTab clubName={game.club.name} country={game.club.country} clubPlayers={game.club.players} />}
      </TabsContent>

      <TabsContent value="championships">
        {isTabBlocked('championships') ? <BlockedMessage /> : <ChampionshipsTab />}
      </TabsContent>
      <TabsContent value="copas">
        {isTabBlocked('copas') ? <BlockedMessage /> : <CopasTab userId={userId} />}
      </TabsContent>
      <TabsContent value="worldcup">
        {isTabBlocked('worldcup') ? <BlockedMessage /> : <WorldCupTab userId={userId} />}
      </TabsContent>

      <TabsContent value="continental">
        {isTabBlocked('continental') ? <BlockedMessage /> : <ContinentalTab club={game.club} />}
      </TabsContent>

      <TabsContent value="world">
        {isTabBlocked('world') ? <BlockedMessage /> : (
          <WorldLeagues 
            userId={userId}
            rating={game.ranking} 
            rankingHistory={game.rankingHistory} 
            clubName={game.club.name} 
            stats={game.club.stats} 
            season={game.season?.currentSeason ?? 1} 
          />
        )}
      </TabsContent>
      <TabsContent value="scouts">{isTabBlocked('scouts') ? <BlockedMessage /> : <ScoutsTab userId={userId} budget={game.club.budget} />}</TabsContent>
      <TabsContent value="pacotinhos">
        {isTabBlocked('pacotinhos') ? <BlockedMessage /> : (
          <PacotinhosTab 
            budget={game.club.budget} 
            onBuyPack={game.addPackPlayers} 
            userId={userId} 
          />
        )}
      </TabsContent>
      
      <TabsContent value="market">
        {isTabBlocked('market') ? <BlockedMessage /> : (
        <OnlineMarketTab
          activeMarketTab={marketSubTab}
          onMarketTabChange={setMarketSubTab}
          isPremium={isPremium}
          userId={userId}
          clubName={game.club.name}
          players={game.club.players}
          budget={game.club.budget}
          transferBudget={(game as any).transferBudget}
          salaryBudget={(game as any).salaryBudget}
          currentMonthlyPayroll={game.club.players.reduce((sum, p) => sum + (p.salary || 0), 0)}
          clubShield={game.club.shieldPattern ? { primaryColor: game.club.primaryColor || '#2563EB', secondaryColor: game.club.secondaryColor || '#FFF', pattern: game.club.shieldPattern, shape: (game.club as any).shieldShape || 'classic' } : null}
          onPlayerSold={(playerId) => {
            game.sellPlayer(game.club.players.find(p => p.id === playerId)!);
          }}
          onPlayerBought={(playerData, price, salary, contractYears) => {
            game.buyPlayer({ ...playerData, salary, contract: contractYears });
            onSigningPlayer({ name: playerData.name, position: playerData.position, overall: playerData.overall, age: playerData.age });
            saveSigningNews(playerData.name, playerData.position, playerData.overall, playerData.age, 'signing');
          }}
          loanedPlayers={game.loanedPlayers}
          onLoanOut={async (playerId: string) => {
            const player = game.club.players.find(p => p.id === playerId);
            if (!player) return;
            if (game.club.players.length <= 11) { toast.error('Elenco muito pequeno para vender!'); return; }
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
              toast.success(`${player.name} anunciado no mercado de empréstimos!`);
            }
          }}
          onLoanIn={game.loanInPlayer}
          onLoanFinalizeOut={game.finalizeLoanOut}
          onLoanFinalizeIn={game.finalizeLoanIn}
          onListedPlayer={() => setActiveTab('market')}
        />
        )}
      </TabsContent>
      
      <TabsContent value="tactics">
        {isTabBlocked('tactics') ? <BlockedMessage /> : (
          <ErrorBoundary label="TacticsTab" fallback={(err, reset) => (
            <div className="p-6 text-center">
              <p className="text-sm font-bold text-white mb-2">Não foi possível abrir o Centro Tático</p>
              <p className="text-xs text-white/50 mb-4">{err.message}</p>
              <button onClick={reset} className="h-10 px-4 rounded-xl bg-emerald-500 text-zinc-950 font-black text-xs uppercase tracking-widest">Recarregar</button>
            </div>
          )}>
            <TacticsTab 
              tactics={game.tactics} 
              players={game.club.players} 
              onUpdate={game.setTactics} 
              onUpdatePlayers={game.updatePlayers}
              onChangePosition={game.changePlayerPosition} 
              season={game.season?.currentSeason ?? 1} 
              userId={userId} 
              hideSwapButton
            />
          </ErrorBoundary>
        )}
      </TabsContent>

      <TabsContent value="physio">
        {isTabBlocked('physio') ? <BlockedMessage /> : <PhysioTab players={game.club.players} />}
      </TabsContent>
      
      
      <TabsContent value="fans">
        {isTabBlocked('fans') ? <BlockedMessage /> : <FansTab club={game.club} winStreak={winStreak} loseStreak={0} stadiumLevel={game.infrastructure.stadium.level} ticketPrice={game.club.ticketPrice || 30} />}
      </TabsContent>
      
      <TabsContent value="members">
        {isTabBlocked('members') ? <BlockedMessage /> : (
          <MembersTab 
            totalFans={game.club.fans || 1000} 
            reputation={game.club.reputation || 50} 
            totalMembersFromDB={game.club.total_members}
            wins={game.club.stats?.wins ?? 0} 
            draws={game.club.stats?.draws ?? 0} 
            losses={game.club.stats?.losses ?? 0} 
          />
        )}
      </TabsContent>

      <TabsContent value="training">
        {isTabBlocked('training') ? <BlockedMessage /> : (
          <InfrastructureWrapper
            initialSubTab="training"
            players={game.club.players}
            infrastructure={game.infrastructure}
            trainingFocus={game.trainingFocus || {}}
            onSetTrainingFocus={game.setPlayerTrainingFocus}
            trainingIntensity={game.trainingIntensity}
            onSetTrainingIntensity={game.setPlayerTrainingIntensity}
            tactics={game.tactics}
            onPlayersUpdate={game.updatePlayers}
            currentWeek={game.season.currentWeek}
            clubName={game.club.name}
            userId={userId}
            budget={game.club.budget}
            onUpgradeCT={() => game.upgradeFacility('trainingCenter')}
            onUpgradeFacility={game.upgradeFacility}
            ctRooms={game.ctRooms}
            onUpgradeCTRoom={game.upgradeCTRoom}
            trainingInvestment={game.trainingInvestment}
            onSetTrainingInvestment={game.setTrainingInvestment}
          />
        )}
      </TabsContent>

      <TabsContent value="stadium">
        {isTabBlocked('stadium') ? <BlockedMessage /> : (
          <InfrastructureWrapper
            initialSubTab="stadium"
            players={game.club.players}
            infrastructure={game.infrastructure}
            trainingFocus={game.trainingFocus || {}}
            onSetTrainingFocus={game.setPlayerTrainingFocus}
            tactics={game.tactics}
            onPlayersUpdate={game.updatePlayers}
            currentWeek={game.season.currentWeek}
            clubName={game.club.name}
            userId={userId}
            budget={game.club.budget}
            onUpgradeCT={() => game.upgradeFacility('trainingCenter')}
            onUpgradeFacility={game.upgradeFacility}
            onUpgradeCTRoom={game.upgradeCTRoom}
            stadiumProps={{
               stadiumName: game.club.stadiumName,
               infrastructure: game.infrastructure,
               onUpgrade: (f: any) => game.upgradeFacility(f),
               budget: game.club.budget,
               clubName: game.club.name,
               fans: game.club.fans,
               reputation: game.club.reputation,
               ticketPrice: game.club.ticketPrice,
               winStreak: winStreak,
               loseStreak: 0,

               userId,
               onRenameStadium: game.renameStadium,
               onSetTicketPrice: game.setTicketPrice,
               onBuildVipBox: game.buildVipBox,
               stadiumOps: game.club.stadiumOps,
               onAcceptStadiumEvent: game.acceptStadiumEvent,
               onRejectStadiumEvent: game.rejectStadiumEvent,
               onStartStadiumRepair: game.startStadiumRepair,
               onBuyStadiumInsurance: game.buyStadiumInsurance,
               onCancelStadiumInsurance: game.cancelStadiumInsurance,
               onAcceptStadiumSponsor: game.acceptStadiumSponsor,
               onRejectStadiumSponsor: game.rejectStadiumSponsor,
               onBuyModularUpgrade: game.buyModularUpgrade,
               onToggleMembershipTier: game.toggleMembershipTier
            }}
          />
        )}
      </TabsContent>

      <TabsContent value="ctrooms">
        {isTabBlocked('ctrooms') ? <BlockedMessage /> : (
          <InfrastructureWrapper
            initialSubTab="ctrooms"
            players={game.club.players}
            infrastructure={game.infrastructure}
            trainingFocus={game.trainingFocus || {}}
            onSetTrainingFocus={game.setPlayerTrainingFocus}
            tactics={game.tactics}
            onPlayersUpdate={game.updatePlayers}
            currentWeek={game.season.currentWeek}
            clubName={game.club.name}
            userId={userId}
            budget={game.club.budget}
            onUpgradeCT={() => game.upgradeFacility('trainingCenter')}
            onUpgradeFacility={game.upgradeFacility}
            onUpgradeCTRoom={game.upgradeCTRoom}
            ctRooms={game.ctRooms}
          />
        )}
      </TabsContent>


      <TabsContent value="youth">
        {isTabBlocked('youth') ? <BlockedMessage /> : (
          <InfrastructureWrapper
            initialSubTab="youth"
            players={game.club.players}
            infrastructure={game.infrastructure}
            trainingFocus={game.trainingFocus || {}}
            onSetTrainingFocus={game.setPlayerTrainingFocus}
            tactics={game.tactics}
            onPlayersUpdate={game.updatePlayers}
            currentWeek={game.season.currentWeek}
            clubName={game.club.name}
            userId={userId}
            budget={game.club.budget}
            onUpgradeCT={() => game.upgradeFacility('trainingCenter')}
            onUpgradeFacility={game.upgradeFacility}
            onUpgradeCTRoom={game.upgradeCTRoom}
            youthProps={{
              prospects: game.youthProspects,
              academyLevel: game.infrastructure.youthAcademy.level,
              academyUpgradeCompletesAt: game.infrastructure.youthAcademy.upgradeCompletesAt,
              isPremium,
              monthlyInvestment: game.youthInvestment,
              budget: game.club.budget,
              hasScouts: (game.club.scouts || []).length > 0,
              currentSeason: game.season.currentSeason,
              onPromote: game.promoteYouth,
              onSell: game.sellYouth,
              onEnrollCopinha: game.enrollCopinha,
              onSetInvestment: game.setYouthInvestment,
              onUpgradeAcademy: () => game.upgradeFacility('youthAcademy'),
              lastYouthGenAt: game.lastYouthGenAt
            }}
          />
        )}
      </TabsContent>


      <TabsContent value="journal">
        {isTabBlocked('newspaper') ? <BlockedMessage /> : <NewspaperFullPage onBack={() => setActiveTab('dashboard')} />}
      </TabsContent>
      
      <TabsContent value="staff">
        {isTabBlocked('staff') ? <BlockedMessage /> : (
          <InfrastructureWrapper
            initialSubTab="training"
            players={game.club.players}
            infrastructure={game.infrastructure}
            trainingFocus={game.trainingFocus || {}}
            onSetTrainingFocus={game.setPlayerTrainingFocus}
            tactics={game.tactics}
            onPlayersUpdate={game.updatePlayers}
            currentWeek={game.season.currentWeek}
            clubName={game.club.name}
            userId={userId}
            budget={game.club.budget}
            onUpgradeCT={() => game.upgradeFacility('trainingCenter')}
            onUpgradeFacility={game.upgradeFacility}
            onUpgradeCTRoom={game.upgradeCTRoom}
          />
        )}
      </TabsContent>
      
      <TabsContent value="finance">
        {isTabBlocked('finances') ? <BlockedMessage /> : (
          <FinanceTab 
            budget={game.club.budget} 
            finances={game.finances} 
            totalSalaries={game.totalSalaries} 
            players={game.club.players} 
            scouts={game.club.scouts || []} 
            sponsors={game.sponsors}
            infrastructure={game.infrastructure} 
            fans={game.club.fans}
            ticketPrice={game.club.ticketPrice || 30}
            youthInvestment={game.youthInvestment}
          />
        )}
      </TabsContent>
      
      <TabsContent value="settings">{isTabBlocked('settings') ? <BlockedMessage /> : <SettingsTab />}</TabsContent>
      <TabsContent value="uniforms">{isTabBlocked('uniforms') ? <BlockedMessage /> : <UniformsTab primaryColor={game.club.primaryColor} secondaryColor={game.club.secondaryColor} onSave={() => {}} uniformsUnlocked={!!game.clubProfile?.uniformsUnlocked} />}</TabsContent>
      
      
      
      <TabsContent value="achievements">{isTabBlocked('achievements') ? <BlockedMessage /> : <AchievementsTab achievements={game.achievements} />}</TabsContent>
      
      <TabsContent value="clubprofile">
        {isTabBlocked('clubprofile') ? <BlockedMessage /> : (
          <ClubProfileTab
            club={game.club}
            season={game.season.currentSeason}
            profile={game.clubProfile}
            onSave={game.updateClubProfile}
            onRenameClub={game.renameClub}
            onRenameStadium={game.renameStadium}
            onUpdateShield={game.updateShield}
          />
        )}
      </TabsContent>
      
      <TabsContent value="trophies">{isTabBlocked('trophies') ? <BlockedMessage /> : <TrophiesTab trophies={game.clubProfile?.trophies || []} />}</TabsContent>
      <TabsContent value="ranking">{isTabBlocked('ranking') ? <BlockedMessage /> : <RankingTab rating={game.ranking} rankingHistory={game.rankingHistory} clubName={game.club.name} stats={game.club.stats} season={game.season.currentSeason} />}</TabsContent>
      <TabsContent value="support">{isTabBlocked('support') ? <BlockedMessage /> : <SupportTab userId={userId} displayName={displayName} />}</TabsContent>
      <TabsContent value="terms">{isTabBlocked('terms') ? <BlockedMessage /> : <TermsTab />}</TabsContent>
      <TabsContent value="shop">
        {isTabBlocked('shop') ? <BlockedMessage /> : (
          <LojaFLM 
            club={game.club} 
            infrastructure={game.infrastructure} 
            userId={userId}
            isPremium={isPremium}
            onBuyPack={game.addPackPlayers}
          />
        )}
      </TabsContent>
      {showAdmin && (
        <TabsContent value="admin"><AdminTab userId={userId} isFounder={isFounder} /></TabsContent>
      )}
    </Suspense>
  );
}
