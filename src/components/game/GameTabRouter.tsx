import { TabsContent } from '@/components/ui/tabs';
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
import { StadiumTab } from '@/components/game/StadiumTab';
import { YouthAcademyTab } from '@/components/game/YouthAcademyTab';
import { SponsorsTab } from '@/components/game/SponsorsTab';
import { ScoutsTab } from '@/components/game/ScoutsTab';
import { FansTab } from '@/components/game/FansTab';
import { TrainingWrapper } from '@/components/game/TrainingWrapper';
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
import { RulesTab } from '@/components/game/RulesTab';
import { UpdatesTab } from '@/components/game/UpdatesTab';
import { AdminTab } from '@/components/game/AdminTab';
import { PacotinhosTab } from '@/components/game/PacotinhosTab';
import { getStadiumCapacity } from '@/types/infrastructure';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useCallback, useMemo } from 'react';
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
}

export function GameTabRouter({ game, mp, userId, displayName, showAdmin, isFounder, activeTab, setActiveTab, activeTournamentId, setActiveTournamentId, onSigningPlayer, saveSigningNews }: GameTabRouterProps) {
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

  return (
    <>
      <TabsContent value="dashboard">
        <DashboardTab club={game.club} events={game.events} infrastructure={game.infrastructure} onOpenNewspaper={() => setActiveTab('journal')} onGoToFriendly={() => setActiveTab('matches')} userId={userId} onOpenTournament={(id: string) => { setActiveTournamentId(id); setActiveTab('tournament'); }} clubProfile={game.clubProfile} season={game.season?.currentSeason} onViewClub={(name) => { toast.info(`Perfil de ${name}`); }} />
      </TabsContent>
      <TabsContent value="tournament">
        {activeTournamentId ? (
          <TournamentExpandedView tournamentId={activeTournamentId} onClose={() => { setActiveTournamentId(null); setActiveTab('dashboard'); }} />
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhum campeonato selecionado</p>
        )}
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
              toast.success(`${player.name} listado no mercado por R$${(askingPrice / 1000).toFixed(0)}k! 🏷️`);
            }
          }}
          onLoanOut={(playerId) => {
            const player = game.club.players.find(p => p.id === playerId);
            game.loanOutPlayer(playerId);
            if (player) {
              const extra = 'Emprestado por 1 temporada';
              onSigningPlayer({ name: player.name, position: player.position, overall: player.overall, age: player.age, eventType: 'loan', extraInfo: extra });
              saveSigningNews(player.name, player.position, player.overall, player.age, 'loan', extra);
            }
          }}
          onChangeNumber={game.changeShirtNumber}
          canLoanOut={game.loanedPlayers.filter(l => l.direction === 'out').length < 3}
          userId={userId}
          onAuction={async (player) => {
            const halfValue = Math.floor((player.overall * 15000 * (player.age < 25 ? 1.3 : player.age > 30 ? 0.7 : 1)) / 2);
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
              toast.success(`${player.name} listado no mercado de empréstimos!`);
            }
          }}
          onLoanIn={game.loanInPlayer}
          onListedPlayer={() => setActiveTab('market')}
        />
      </TabsContent>
      <TabsContent value="tactics"><TacticsTab tactics={game.tactics} players={game.club.players} onUpdate={game.setTactics} /></TabsContent>
      <TabsContent value="youth">
        <YouthAcademyTab prospects={game.youthProspects} academyLevel={game.infrastructure.youthAcademy.level} monthlyInvestment={game.youthInvestment} budget={game.club.budget} hasScouts={(game.club.scouts?.length ?? 0) > 0} onPromote={game.promoteYouth} onSetInvestment={game.setYouthInvestment} onGenerateYouth={() => {}} onUpgradeAcademy={() => game.upgradeFacility('youthAcademy')} />
      </TabsContent>
      <TabsContent value="fans">
        <FansTab club={game.club} winStreak={winStreak} loseStreak={loseStreak} stadiumLevel={game.infrastructure.stadium.level} ticketPrice={game.club.ticketPrice || 30} />
      </TabsContent>
      <TabsContent value="training">
        <TrainingWrapper players={game.club.players} infrastructure={game.infrastructure} trainingFocus={game.trainingFocus} onSetTrainingFocus={game.setPlayerTrainingFocus} tactics={game.tactics} onPlayersUpdate={game.updatePlayers} currentWeek={game.season.currentWeek} clubName={game.club.name} />
      </TabsContent>
      <TabsContent value="matches">
        <MatchesTab matches={game.club.matches} clubName={game.club.name} stadiumName={game.club.stadiumName} alreadyPlayedToday={game.alreadyPlayedToday} lastFriendlyDate={game.lastFriendlyDate} players={game.club.players} teamStrength={Math.round(game.club.players.reduce((s, p) => s + p.overall, 0) / Math.max(1, game.club.players.length))} tactics={game.tactics} onGenerateFriendly={game.generateFriendly} userId={userId} stadiumCapacity={getStadiumCapacity(game.infrastructure.stadium.level)} />
      </TabsContent>
      <TabsContent value="sponsors">
        <SponsorsTab sponsors={game.sponsors} offers={game.sponsorOffers} reputation={game.club.reputation} onAccept={game.acceptSponsor} onRefreshOffers={game.refreshSponsorOffers} />
      </TabsContent>
      <TabsContent value="infra"><InfrastructureTab infrastructure={game.infrastructure} budget={game.club.budget} onUpgrade={game.upgradeFacility} /></TabsContent>
      <TabsContent value="stadium">
        <StadiumTab infrastructure={game.infrastructure} budget={game.club.budget} fans={game.club.fans} stadiumName={game.club.stadiumName || 'Arena'} ticketPrice={game.club.ticketPrice || 30} reputation={game.club.reputation} onUpgrade={game.upgradeFacility} onSetTicketPrice={game.setTicketPrice} onRenameStadium={game.renameStadium} />
      </TabsContent>
      <TabsContent value="scouts">
        <ScoutsTab scouts={game.club.scouts || []} scoutReports={game.club.scoutReports || []} matchesSinceLastScout={game.club.matchesSinceLastScout || 0} budget={game.club.budget} onHireScout={game.hireScout} onFireScout={game.fireScout} />
      </TabsContent>
      <TabsContent value="finance"><FinanceTab budget={game.club.budget} finances={game.finances} totalSalaries={game.totalSalaries} players={game.club.players} scouts={game.club.scouts} sponsors={game.sponsors} infrastructure={game.infrastructure} fans={game.club.fans} ticketPrice={game.club.ticketPrice} youthInvestment={game.youthInvestment} /></TabsContent>
      <TabsContent value="rules"><RulesTab /></TabsContent>
      <TabsContent value="updates"><UpdatesTab /></TabsContent>
      <TabsContent value="settings"><SettingsTab /></TabsContent>
      <TabsContent value="chat"><GlobalChatTab userId={userId} displayName={displayName} clubName={game.club.name} /></TabsContent>
      <TabsContent value="journal"><NewspaperFullPage onBack={() => setActiveTab('dashboard')} /></TabsContent>
      <TabsContent value="newspaper"><NewspaperFullPage onBack={() => setActiveTab('dashboard')} /></TabsContent>
      <TabsContent value="uniforms"><UniformsTab primaryColor={game.club.primaryColor} secondaryColor={game.club.secondaryColor} uniforms={uniforms} onSave={setUniforms} sponsors={game.sponsors} players={game.club.players} clubReputation={game.club.reputation} /></TabsContent>
      <TabsContent value="auction"><AuctionTab userId={userId} clubName={game.club.name} players={game.club.players} budget={game.club.budget} isPremium={true} /></TabsContent>
      <TabsContent value="pacotinhos">
        <PacotinhosTab budget={game.club.budget} userId={userId} onBuyPack={(newPlayers, cost) => { game.addPackPlayers(newPlayers, cost); }} />
      </TabsContent>
      <TabsContent value="achievements"><AchievementsTab achievements={game.achievements} /></TabsContent>
      <TabsContent value="clubprofile"><ClubProfileTab club={game.club} season={game.season.currentSeason} profile={game.clubProfile} onSave={game.updateClubProfile} /></TabsContent>
      <TabsContent value="ctrooms"><CTRoomsTab rooms={game.ctRooms} budget={game.club.budget} trainingCenterLevel={game.infrastructure.trainingCenter.level} onUpgradeRoom={game.upgradeCTRoom} /></TabsContent>
      <TabsContent value="trophies"><TrophiesTab trophies={game.clubProfile.trophies || []} /></TabsContent>
      <TabsContent value="ranking"><RankingTab rating={game.ranking} rankingHistory={game.rankingHistory} clubName={game.club.name} stats={game.club.stats} season={game.season.currentSeason} /></TabsContent>
      {showAdmin && (
        <TabsContent value="admin"><AdminTab userId={userId} isFounder={isFounder} /></TabsContent>
      )}
    </>
  );
}
