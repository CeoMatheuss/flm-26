import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardTab } from '@/components/game/DashboardTab';
import { SquadTab } from '@/components/game/SquadTab';
import { TacticsTab } from '@/components/game/TacticsTab';
import { MultiplayerTab } from '@/components/game/MultiplayerTab';
import { OnlineMarketTab } from '@/components/game/OnlineMarketTab';
import { NewspaperFullPage } from '@/components/game/NewspaperFullPage';

import { MatchCalendarTab } from '@/components/game/MatchCalendarTab';
import { MatchesTab } from '@/components/game/MatchesTab';
import { FinanceTab } from '@/components/game/FinanceTab';
import { InfrastructureTab } from '@/components/game/InfrastructureTab';
import { TrainingCenterTab } from '@/components/game/TrainingCenterTab';
import { StadiumTab } from '@/components/game/StadiumTab';
import { YouthAcademyTab } from '@/components/game/YouthAcademyTab';
import { SponsorsTab } from '@/components/game/SponsorsTab';
import { ScoutsTab } from '@/components/game/ScoutsTab';
import { FansTab } from '@/components/game/FansTab';
import { MembersTab } from '@/components/game/MembersTab';
import { InfrastructureWrapper } from '@/components/game/InfrastructureWrapper';
import { GlobalChatTab } from '@/components/game/GlobalChatTab';
import { AuctionTab } from '@/components/game/AuctionTab';
import { UniformsTab, UniformsData } from '@/components/game/UniformsTab';
import { AchievementsTab } from '@/components/game/AchievementsTab';
import { ClubProfileTab } from '@/components/game/ClubProfileTab';
import { CTRoomsTab } from '@/components/game/CTRoomsTab';
import { TrophiesTab } from '@/components/game/TrophiesTab';
import { TournamentExpandedView } from '@/components/game/TournamentDashboardCard';
import { RankingTab } from '@/components/game/RankingTab';
import { SettingsTab } from '@/components/game/SettingsTab';
import { ClubSettingsTab } from '@/components/game/ClubSettingsTab';
import { RulesTab } from '@/components/game/RulesTab';

// StaffTab removido (sistema de equipe técnica desativado)
import { AdminTab } from '@/components/game/AdminTab';
import { PacotinhosTab } from '@/components/game/PacotinhosTab';
import { SupportTab } from '@/components/game/SupportTab';
import { TermsTab } from '@/components/game/TermsTab';
import { getStadiumCapacity } from '@/types/infrastructure';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useCallback, useMemo } from 'react';
import { Lock } from 'lucide-react';
import type { useGame } from '@/hooks/useGame';
import type { useMultiplayer } from '@/hooks/useMultiplayer';

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
  onSigningPlayer: (data: { name: string; position: string; overall: number; age: number; eventType?: 'signing' | 'renewal' | 'loan'; extraInfo?: string }) => void;
  saveSigningNews: (playerName: string, position: string, overall: number, age: number, eventType?: 'signing' | 'renewal' | 'loan', extraInfo?: string) => void;
  blockedTabs?: string[];
  isAdmin?: boolean;
  isPremium?: boolean;
  marketSubTab?: string;
  setMarketSubTab?: (tab: string) => void;
}

export function GameTabRouter({ game, mp, userId, displayName, showAdmin, isFounder, activeTab, setActiveTab, activeTournamentId, setActiveTournamentId, onSigningPlayer, saveSigningNews, blockedTabs = [], isAdmin = false, isPremium = false, marketSubTab, setMarketSubTab }: GameTabRouterProps) {
  const [uniforms, setUniforms] = useState<UniformsData | undefined>(undefined);

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

  const isTabBlocked = (tab: string) => !isAdmin && blockedTabs.includes(tab);

  const BlockedMessage = () => (
    <Card className="border-orange-500/30 bg-gradient-to-br from-card to-orange-500/5">
      <CardContent className="p-8 text-center space-y-3">
        <Lock className="h-8 w-8 mx-auto text-orange-400" />
        <h3 className="text-sm font-bold text-orange-400">Seção em Manutenção</h3>
        <p className="text-xs text-muted-foreground">Esta área está temporariamente indisponível. Tente novamente mais tarde.</p>
      </CardContent>
    </Card>
  );

  return (
    <>
      <TabsContent value="dashboard">
        <DashboardTab club={game.club} events={game.events} infrastructure={game.infrastructure} onOpenNewspaper={() => setActiveTab('journal')} onGoToFriendly={() => setActiveTab('matches')} userId={userId} onOpenTournament={(id: string) => { setActiveTournamentId(id); setActiveTab('tournament'); }} clubProfile={game.clubProfile} season={game.season?.currentSeason} currentWeek={game.season?.currentWeek} totalWeeks={game.season?.totalWeeks} onViewClub={(name) => { toast.info(`Perfil de ${name}`); }} />
      </TabsContent>
      <TabsContent value="tournament">
        {activeTournamentId ? (
          <TournamentExpandedView tournamentId={activeTournamentId} onClose={() => { setActiveTournamentId(null); setActiveTab('dashboard'); }} />
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhum campeonato selecionado</p>
        )}
      </TabsContent>
      
      <TabsContent value="calendar">{isTabBlocked('calendar') ? <BlockedMessage /> : <MatchCalendarTab userId={userId} clubName={game.club.name} />}</TabsContent>
      <TabsContent value="matches">
        {isTabBlocked('matches') ? <BlockedMessage /> : (
          <MatchesTab
            matches={game.club.matches}
            clubName={game.club.name}
            stadiumName={(game.club as any).stadiumName || 'Arena'}
            alreadyPlayedToday={game.alreadyPlayedToday ?? false}
            lastFriendlyDate={game.lastFriendlyDate ?? ''}
            players={game.club.players}
            teamStrength={Math.round(
              (game.club.players || []).slice(0, 11).reduce((s, p: any) => s + (p.overall || p.ovr || 60), 0)
              / Math.max(1, Math.min(11, (game.club.players || []).length))
            )}
            tactics={game.tactics}
            onGenerateFriendly={game.generateFriendly}
            userId={userId}
            stadiumCapacity={getStadiumCapacity(game.infrastructure.stadium.level)}
            fans={game.club.fans || 1000}
            applyFanChange={game.applyFanChange}
          />
        )}
      </TabsContent>
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
              onSigningPlayer({ name: player.name, position: player.position, overall: player.overall, age: player.age, eventType: 'renewal', extraInfo: extra });
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
              toast.success(`${player.name} anunciado no mercado por R$${(askingPrice / 1000).toFixed(0)}k! 🏷️`);
            }
          }}
          onLoanOut={async (playerId, terms) => {
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
                salaryPayer: terms?.salaryPayer ?? 'buyer',
                salarySplitPct: terms?.salarySplitPct ?? 0,
                loanFee: terms?.loanFee ?? 0,
                openToOffers: true,
              },
            });
            if (res.error || res.data?.error) {
              toast.error(res.data?.error || 'Erro ao anunciar empréstimo');
            } else {
              toast.success(`${player.name} anunciado no Mercado de Empréstimos! 🔄`);
            }
          }}
          onChangeNumber={game.changeShirtNumber}
          canLoanOut={game.loanedPlayers.filter(l => l.direction === 'out').length < 3}
          userId={userId}
          onAuction={async (player) => {
            const baseValue = Math.floor((player.overall * 15000 * (player.age < 25 ? 1.3 : player.age > 30 ? 0.7 : 1)) / 2);
            // Floor by OVR (matches validate_auction trigger)
            const ovr = player.overall;
            const minByOvr = ovr >= 80 ? 500000 : ovr >= 70 ? 300000 : ovr >= 60 ? 200000 : 100000;
            const halfValue = Math.max(baseValue, minByOvr);
            const { error } = await supabase.from('player_auctions').insert([{
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
              toast.error('Erro ao criar leilão');
            } else {
              toast.success(`${player.name} colocado em leilão!`);
            }
          }}
          transferBudget={(game as any).transferBudget}
          onRescindPlayer={(game as any).rescindPlayer}
          onReorderPlayers={game.updatePlayers}
          tactics={game.tactics}
        />
      </TabsContent>
      <TabsContent value="league">
        <Card className="border-orange-500/30 bg-gradient-to-br from-card to-orange-500/5">
          <CardContent className="p-8 text-center space-y-3">
            <h3 className="text-sm font-bold text-orange-400">Liga Indisponível</h3>
            <p className="text-xs text-muted-foreground">O sistema de liga foi removido para manutenção total.</p>
          </CardContent>
        </Card>
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
              toast.success(`${player.name} anunciado no mercado de empréstimos!`);
            }
          }}
          onLoanIn={game.loanInPlayer}
          onListedPlayer={() => setActiveTab('market')}
        />
        )}
      </TabsContent>
      <TabsContent value="tactics">{isTabBlocked('tactics') ? <BlockedMessage /> : <TacticsTab tactics={game.tactics} players={game.club.players} onUpdate={game.setTactics} season={game.season?.currentSeason ?? 1} userId={userId} />}</TabsContent>
      <TabsContent value="fans">
        <FansTab club={game.club} winStreak={winStreak} loseStreak={loseStreak} stadiumLevel={game.infrastructure.stadium.level} ticketPrice={game.club.ticketPrice || 30} />
      </TabsContent>
      <TabsContent value="members">
        <MembersTab totalFans={game.club.fans || 1000} reputation={game.club.reputation || 50} wins={game.club.stats?.wins ?? 0} draws={game.club.stats?.draws ?? 0} losses={game.club.stats?.losses ?? 0} />
      </TabsContent>

      {/* INFRAESTRUTURA — abas independentes (cada item é uma tela própria no menu principal) */}
      <TabsContent value="training">
        {isTabBlocked('training') ? <BlockedMessage /> : (
          <InfrastructureWrapper
            initialSubTab="training"
            players={game.club.players}
            infrastructure={game.infrastructure}
            trainingFocus={game.trainingFocus}
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
            standalone
          />
        )}
      </TabsContent>
      <TabsContent value="physio">
        {isTabBlocked('training') ? <BlockedMessage /> : (
          <InfrastructureTab
            infrastructure={game.infrastructure}
            budget={game.club.budget}
            players={game.club.players}
            onUpgrade={game.upgradeFacility}
          />
        )}
      </TabsContent>
      <TabsContent value="stadium">
        {isTabBlocked('training') ? <BlockedMessage /> : (
          <StadiumTab
            infrastructure={game.infrastructure}
            budget={game.club.budget}
            fans={game.club.fans}
            stadiumName={game.club.stadiumName || 'Arena'}
            ticketPrice={game.club.ticketPrice || 30}
            reputation={game.club.reputation}
            winStreak={winStreak}
            loseStreak={loseStreak}
            vipBoxesBuilt={game.club.vipBoxesBuilt}
            stadiumOps={game.club.stadiumOps}
            upcomingHomeMatches={(game.club.matches || []).filter((m: any) => !m.played && (m.isHome ?? true)).map((m: any) => ({ id: m.id, date: m.date, isHome: m.isHome ?? true, opponent: m.opponent, competition: (m as any).competition }))}
            onUpgrade={game.upgradeFacility}
            onSetTicketPrice={game.setTicketPrice}
            onRenameStadium={game.renameStadium}
            onBuildVipBox={game.buildVipBox}
            onAcceptStadiumEvent={game.acceptStadiumEvent}
            onRejectStadiumEvent={game.rejectStadiumEvent}
            onStartStadiumRepair={game.startStadiumRepair}
            onBuyStadiumInsurance={game.buyStadiumInsurance}
            onCancelStadiumInsurance={game.cancelStadiumInsurance}
            onAcceptStadiumSponsor={game.acceptStadiumSponsor}
            onRejectStadiumSponsor={game.rejectStadiumSponsor}
            onToggleMembershipTier={game.toggleMembershipTier}
            onBuyModularUpgrade={game.buyModularUpgrade}
          />
        )}
      </TabsContent>
      <TabsContent value="youth">
        {isTabBlocked('training') ? <BlockedMessage /> : (
          <YouthAcademyTab
            prospects={game.youthProspects}
            academyLevel={game.infrastructure.youthAcademy.level}
            academyUpgradeCompletesAt={game.infrastructure.youthAcademy.upgradeCompletesAt}
            isPremium={isPremium}
            monthlyInvestment={game.youthInvestment}
            budget={game.club.budget}
            hasScouts={(game.club.scouts?.length ?? 0) > 0}
            currentSeason={game.season?.currentSeason ?? 1}
            onPromote={game.promoteYouth}
            onSell={game.sellYouth}
            onEnrollCopinha={game.enrollCopinha}
            onSetInvestment={game.setYouthInvestment}
            onUpgradeAcademy={() => game.upgradeFacility('youthAcademy')}
          />
        )}
      </TabsContent>
      <TabsContent value="ctrooms">
        {isTabBlocked('training') ? <BlockedMessage /> : (
          game.ctRooms ? (
            <CTRoomsTab
              rooms={game.ctRooms}
              budget={game.club.budget}
              trainingCenterLevel={game.infrastructure?.trainingCenter?.level ?? 1}
              onUpgradeRoom={game.upgradeCTRoom}
            />
          ) : <p className="text-xs text-muted-foreground text-center py-8">Carregando salas do CT...</p>
        )}
      </TabsContent>
      {/* Rota legada 'infra' continua redirecionando para Treinos por compatibilidade */}
      <TabsContent value="infra">
        {isTabBlocked('training') ? <BlockedMessage /> : (
          <InfrastructureWrapper
            initialSubTab="training"
            players={game.club.players}
            infrastructure={game.infrastructure}
            trainingFocus={game.trainingFocus}
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
      <TabsContent value="scouts">
        {isTabBlocked('scouts') ? <BlockedMessage /> : (
          <ScoutsTab
            scouts={game.club.scouts || []}
            scoutReports={game.club.scoutReports || []}
            matchesSinceLastScout={game.club.matchesSinceLastScout || 0}
            budget={game.club.budget}
            availableScouts={game.club.availableScouts || []}
            lastScoutGeneratedAt={game.club.lastScoutGeneratedAt}
            onHireScout={game.hireScout}
            onFireScout={game.fireScout}
            onAcceptAvailableScout={(scoutId: string) => {
              game.setClub((prev: any) => {
                const pool = prev.availableScouts || [];
                const picked = pool.find((s: any) => s.id === scoutId);
                if (!picked) return prev;
                const signingFee = picked.salary * 3;
                if ((prev.budget || 0) < signingFee) {
                  toast.error(`Verba insuficiente — taxa de R$${(signingFee / 1000).toFixed(0)}k`);
                  return prev;
                }
                toast.success(`${picked.name} contratado! Hab: ${picked.skill}/10`);
                return {
                  ...prev,
                  budget: prev.budget - signingFee,
                  scouts: [...(prev.scouts || []), picked],
                  availableScouts: pool.filter((s: any) => s.id !== scoutId),
                };
              });
            }}
            onBuyPremiumScout={isPremium ? () => {
              // Premium R$10/mês: 1 Olheiro Lendário (Nv 10) GRÁTIS por mês
              const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
              const lockKey = `premium_legendary_scout_${userId}_${monthKey}`;
              if (localStorage.getItem(lockKey)) {
                toast.info('🌟 Você já resgatou seu Olheiro Lendário deste mês. Volte no próximo mês!');
                return;
              }
              const eliteNames = ['Alexandre Reis', 'Roberto Maximus', 'Vitor Sá', 'Henrique Aurélio', 'Diego Falcão'];
              const elite = {
                id: Math.random().toString(36).substr(2, 9),
                name: eliteNames[Math.floor(Math.random() * eliteNames.length)],
                skill: 10,
                salary: 500_000,
                contract: 3,
              };
              game.setClub((prev: any) => ({
                ...prev,
                scouts: [...(prev.scouts || []), elite],
              }));
              localStorage.setItem(lockKey, '1');
              toast.success(`⚡ Olheiro Lendário ${elite.name} contratado GRÁTIS (Premium)!`);
            } : undefined}
            onUpgradePremium={!isPremium ? () => setActiveTab('premium') : undefined}
          />
        )}
      </TabsContent>
      <TabsContent value="finance"><FinanceTab budget={game.club.budget} finances={game.finances} totalSalaries={game.totalSalaries} players={game.club.players} scouts={game.club.scouts} sponsors={game.sponsors} infrastructure={game.infrastructure} fans={game.club.fans} ticketPrice={game.club.ticketPrice} youthInvestment={game.youthInvestment} /></TabsContent>
      <TabsContent value="sponsors">
        <SponsorsTab
          sponsors={game.sponsors}
          offers={game.sponsorOffers}
          reputation={game.club.reputation}
          onAccept={game.acceptSponsor}
          onRefreshOffers={game.refreshSponsorOffers}
          userId={userId}
          addBonus={game.addBonus}
        />
      </TabsContent>
      <TabsContent value="rules"><RulesTab /></TabsContent>
      
      <TabsContent value="settings"><SettingsTab /></TabsContent>
      {/* clubsettings deep-link redirect: render ClubProfileTab so existing links keep working */}
      <TabsContent value="clubsettings">
        <ClubProfileTab
          club={game.club}
          season={game.season.currentSeason}
          profile={game.clubProfile}
          onSave={game.updateClubProfile}
          onRenameClub={game.renameClub}
          onRenameStadium={game.renameStadium}
          onUpdateShield={game.updateShield}
        />
      </TabsContent>
      {/* Aba "staff" removida — sistema de equipe técnica desativado. */}

      <TabsContent value="chat">{isTabBlocked('chat') ? <BlockedMessage /> : <GlobalChatTab userId={userId} displayName={displayName} clubName={game.club.name} />}</TabsContent>
      <TabsContent value="journal"><NewspaperFullPage onBack={() => setActiveTab('dashboard')} /></TabsContent>
      <TabsContent value="newspaper"><NewspaperFullPage onBack={() => setActiveTab('dashboard')} /></TabsContent>
      <TabsContent value="uniforms"><UniformsTab primaryColor={game.club.primaryColor} secondaryColor={game.club.secondaryColor} uniforms={uniforms} onSave={setUniforms} sponsors={game.sponsors} players={game.club.players} clubReputation={game.club.reputation} /></TabsContent>
      <TabsContent value="auction">{isTabBlocked('auction') ? <BlockedMessage /> : <AuctionTab userId={userId} clubName={game.club.name} players={game.club.players} budget={game.club.budget} isPremium={true} />}</TabsContent>
      <TabsContent value="pacotinhos">
        {isTabBlocked('pacotinhos') ? <BlockedMessage /> : <PacotinhosTab budget={game.club.budget} userId={userId} onBuyPack={(newPlayers, cost) => { game.addPackPlayers(newPlayers, cost); }} />}
      </TabsContent>
      <TabsContent value="achievements"><AchievementsTab achievements={game.achievements} /></TabsContent>
      <TabsContent value="clubprofile">
        <ClubProfileTab
          club={game.club}
          season={game.season.currentSeason}
          profile={game.clubProfile}
          onSave={game.updateClubProfile}
          onRenameClub={game.renameClub}
          onRenameStadium={game.renameStadium}
          onUpdateShield={game.updateShield}
        />
      </TabsContent>
      <TabsContent value="trophies"><TrophiesTab trophies={game.clubProfile.trophies || []} /></TabsContent>
      <TabsContent value="ranking"><RankingTab rating={game.ranking} rankingHistory={game.rankingHistory} clubName={game.club.name} stats={game.club.stats} season={game.season.currentSeason} /></TabsContent>
      <TabsContent value="support"><SupportTab userId={userId} displayName={displayName} /></TabsContent>
      <TabsContent value="terms"><TermsTab /></TabsContent>
      {showAdmin && (
        <TabsContent value="admin"><AdminTab userId={userId} isFounder={isFounder} /></TabsContent>
      )}
    </>
  );
}
