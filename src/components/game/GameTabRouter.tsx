import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardTab } from '@/components/game/DashboardTab';
import { SquadTab } from '@/components/game/SquadTab';
import { TacticsTab } from '@/components/game/TacticsTab';
import { MultiplayerTab } from '@/components/game/MultiplayerTab';
import { OnlineMarketTab } from '@/components/game/OnlineMarketTab';
import { NewspaperFullPage } from '@/components/game/NewspaperFullPage';
import { ChampionshipsTab } from '@/components/game/ChampionshipsTab';

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
import { CopasTab } from './CopasTab';
import { WorldLeagues } from './WorldLeagues';

// StaffTab removido (sistema de equipe técnica desativado)
import { AdminTab } from '@/components/game/AdminTab';
import { PacotinhosTab } from '@/components/game/PacotinhosTab';
import { LojaFLM } from '@/components/game/LojaFLM';
import { SupportTab } from '@/components/game/SupportTab';
import { TermsTab } from "@/components/game/TermsTab";
import { SquadModernLayout } from "./squad-modern/SquadModernLayout";
import { getStadiumCapacity } from '@/types/infrastructure';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Lock, Globe, Star, Instagram, ExternalLink, TrendingUp } from 'lucide-react';
import { LeagueTab } from './LeagueTab';
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

  return (
    <>
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
      <TabsContent value="tournament">
        {activeTournamentId ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Torneio desativado</div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhum campeonato selecionado</p>
        )}
      </TabsContent>
      
      <TabsContent value="calendar">{isTabBlocked('calendar') ? <BlockedMessage /> : <MatchCalendarTab userId={userId} clubName={game.club.name} />}</TabsContent>

      <TabsContent value="matches">
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
      </TabsContent>

      <TabsContent value="squad" className="m-0 h-full">
        {isTabBlocked('squad') ? <BlockedMessage /> : (
          <SquadModernLayout
            players={game.club.players}
            budget={game.club.budget}
            clubName={game.club.name}
            userId={userId}
            tactics={game.tactics}
            onRest={game.restPlayer}
            onUpdatePlayers={game.updatePlayers}
            youthProspects={game.youthProspects}
            onPromoteYouth={game.promoteYouth}
          />
        )}
      </TabsContent>

      <TabsContent value="league">
        {isTabBlocked('leagues') ? <BlockedMessage /> : <LeagueTab clubName={game.club.name} country={game.club.country} clubPlayers={game.club.players} />}
      </TabsContent>
      <TabsContent value="copas">
        <CopasTab userId={userId} />
      </TabsContent>
      <TabsContent value="world">
        <WorldLeagues 
          userId={userId}
          rating={game.ranking} 
          rankingHistory={game.rankingHistory} 
          clubName={game.club.name} 
          stats={game.club.stats} 
          season={game.season?.currentSeason ?? 1} 
        />

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
      <TabsContent value="tactics">{isTabBlocked('tactics') ? <BlockedMessage /> : <TacticsTab tactics={game.tactics} players={game.club.players} onUpdate={game.setTactics} onChangePosition={game.changePlayerPosition} season={game.season?.currentSeason ?? 1} userId={userId} />}</TabsContent>
      <TabsContent value="fans">
        <FansTab club={game.club} winStreak={winStreak} loseStreak={ls => ls} stadiumLevel={game.infrastructure.stadium.level} ticketPrice={game.club.ticketPrice || 30} />
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
            totalWeeks={game.season.totalWeeks}
          />
        )}
      </TabsContent>

      <TabsContent value="stadium">
        {isTabBlocked('stadium') ? <BlockedMessage /> : (
          <InfrastructureWrapper
            initialSubTab="stadium"
            players={game.club.players}
            infrastructure={game.infrastructure}
            tactics={game.tactics}
            onPlayersUpdate={game.updatePlayers}
            currentWeek={game.season.currentWeek}
            clubName={game.club.name}
            userId={userId}
            budget={game.club.budget}
            onUpgradeCT={() => game.upgradeFacility('trainingCenter')}
            onUpgradeFacility={game.upgradeFacility}
            onUpgradeCTRoom={game.upgradeCTRoom}
            onSetTicketPrice={game.setTicketPrice}
            onBuildVipBox={game.buildVipBox}
            onAcceptStadiumEvent={game.acceptStadiumEvent}
            onRejectStadiumEvent={game.rejectStadiumEvent}
            onStartStadiumRepair={game.startStadiumRepair}
            onBuyStadiumInsurance={game.buyStadiumInsurance}
            onCancelStadiumInsurance={game.cancelStadiumInsurance}
            onAcceptStadiumSponsor={game.acceptStadiumSponsor}
            onRejectStadiumSponsor={game.rejectStadiumSponsor}
            onBuyModularUpgrade={game.buyModularUpgrade}
            totalWeeks={game.season.totalWeeks}
          />
        )}
      </TabsContent>

      <TabsContent value="youth">
        {isTabBlocked('youth') ? <BlockedMessage /> : (
          <InfrastructureWrapper
            initialSubTab="youth"
            players={game.club.players}
            infrastructure={game.infrastructure}
            tactics={game.tactics}
            onPlayersUpdate={game.updatePlayers}
            currentWeek={game.season.currentWeek}
            clubName={game.club.name}
            userId={userId}
            budget={game.club.budget}
            onUpgradeCT={() => game.upgradeFacility('trainingCenter')}
            onUpgradeFacility={game.upgradeFacility}
            onUpgradeCTRoom={game.upgradeCTRoom}
            onPromoteYouth={game.promoteYouth}
            onSellYouth={game.sellYouth}
            onEnrollCopinha={game.enrollCopinha}
            onSetYouthInvestment={game.setYouthInvestment}
            totalWeeks={game.season.totalWeeks}
          />
        )}
      </TabsContent>

      <TabsContent value="journal">
        {isTabBlocked('newspaper') ? <BlockedMessage /> : <NewspaperFullPage userId={userId} clubName={game.club.name} />}
      </TabsContent>
      <TabsContent value="staff">
        {isTabBlocked('staff') ? <BlockedMessage /> : (
          <InfrastructureWrapper
            initialSubTab="scouts"
            players={game.club.players}
            infrastructure={game.infrastructure}
            tactics={game.tactics}
            onPlayersUpdate={game.updatePlayers}
            currentWeek={game.season.currentWeek}
            clubName={game.club.name}
            userId={userId}
            budget={game.club.budget}
            onUpgradeCT={() => game.upgradeFacility('trainingCenter')}
            onUpgradeFacility={game.upgradeFacility}
            onUpgradeCTRoom={game.upgradeCTRoom}
            onHireScout={game.hireScout}
            onFireScout={game.fireScout}
            scouts={game.club.scouts}
            scoutReports={game.club.scoutReports}
            totalWeeks={game.season.totalWeeks}
          />
        )}
      </TabsContent>
      <TabsContent value="finance">
        {isTabBlocked('finances') ? <BlockedMessage /> : <FinanceTab budget={game.club.budget} finances={game.finances} currentWeek={game.season.currentWeek} players={game.club.players} scouts={game.club.scouts} clubName={game.club.name} infrastructure={game.infrastructure} userId={userId} />}
      </TabsContent>
      <TabsContent value="settings"><SettingsTab userId={userId} userEmail="" displayName={displayName} onSignOut={() => {}} /></TabsContent>
      <TabsContent value="uniforms"><UniformsTab clubName={game.club.name} primaryColor={game.club.primaryColor} secondaryColor={game.club.secondaryColor} onSave={() => {}} /></TabsContent>
      <TabsContent value="sponsors">
        {isTabBlocked('sponsors') ? <BlockedMessage /> : (
          <SponsorsTab 
            club={game.club} 
            infrastructure={game.infrastructure} 
            userId={userId} 
            onUpgradeFacility={(f) => game.upgradeFacility(f as any)}
            onAcceptSponsor={(cfg) => {
              import('@/data/flmSponsors').then(({ convertToSponsorOffer }) => {
                const offer = convertToSponsorOffer(cfg, game.club.fans);
                game.acceptSponsor(offer);
              });
            }}
          />
        )}
      </TabsContent>
      <TabsContent value="stats">
        <div className="p-8 text-center text-muted-foreground">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-bold">Estatísticas detalhadas</p>
          <p className="text-xs">Em breve: artilharia, assistências e scouts avançados.</p>
        </div>
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
