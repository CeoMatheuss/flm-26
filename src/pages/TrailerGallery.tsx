
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DashboardTab } from '@/components/game/DashboardTab';
import { TacticsTab } from '@/components/game/TacticsTab';
import { LeagueTab } from '@/components/game/LeagueTab';

import { ScoutsTab } from '@/components/game/ScoutsTab';
import { MatchViewer } from '@/pages/MatchPage';
import { initialClub } from '@/data/initialData';
import { defaultTactics } from '@/types/tactics';
import { defaultInfrastructure, defaultSeason } from '@/types/infrastructure';

const mockGame: any = {
  club: {
    ...initialClub,
    matches: [
      { id: '1', opponent: 'Real Madrid', opponentLogo: 'https://bit.ly/3uN6w1X', date: 'Hoje', played: false },
      { id: '2', opponent: 'Barcelona', opponentLogo: 'https://bit.ly/3uN6w1X', date: 'Amanhã', played: false }
    ]
  },
  tactics: defaultTactics,
  finances: [
    { id: '1', type: 'receita', category: 'Patrocínio', amount: 50000, description: 'Sponsor Mensal', date: new Date().toISOString() }
  ],
  infrastructure: defaultInfrastructure,
  season: defaultSeason,
  marketPlayers: [],
  freeAgents: [],
  sponsors: [],
  sponsorOffers: [],
  events: [
    { id: '1', type: 'bonus', icon: '💰', title: 'Bônus de Vitória', description: 'A torcida está feliz!', date: new Date().toISOString() }
  ],
  ranking: 1,
  rankingHistory: [],
  setTactics: () => {},
  upgradeFacility: () => {},
  generateFriendly: () => {},
  enrollWorldLeague: async () => {},
  trainPlayer: () => {},
  restPlayer: () => {},
};

const mockMatchState: any = {
  phase: 'playing',
  currentMinute: 75,
  progress: 75,
  homeTeam: 'FLM 26',
  awayTeam: 'Rival FC',
  homeGoals: 2,
  awayGoals: 1,
  visibleEvents: [
    { minute: 12, type: 'goal', description: 'GOL! FLM 26 abre o placar!', team: 'home' },
    { minute: 45, type: 'yellow', description: 'Cartão amarelo para o capitão.', team: 'away' },
    { minute: 68, type: 'goal', description: 'GOL! Ampliamos a vantagem!', team: 'home' }
  ],
  latestEvent: { minute: 75, type: 'info', description: 'FLM pressiona no ataque!' },
  stats: {
    home: { shots: 12, shotsOnTarget: 8, possession: 55, corners: 4, fouls: 2 },
    away: { shots: 5, shotsOnTarget: 2, possession: 45, corners: 2, fouls: 6 }
  },
  stadiumName: 'Arena FLM',
  competition: 'Brasileirão Série A'
};

export default function TrailerGallery() {
  const [scene, setScene] = useState(0);

  const scenes = [
    { name: 'Dashboard', component: <DashboardTab club={mockGame.club} events={mockGame.events} infrastructure={mockGame.infrastructure} userId="mock-user" /> },
    { name: 'Tactics', component: <TacticsTab tactics={mockGame.tactics} players={mockGame.club.players} onUpdate={() => {}} userId="mock-user" /> },
    { name: 'League', component: <LeagueTab clubName={mockGame.club.name} clubPlayers={mockGame.club.players} /> },
    { name: 'Copas', component: <CopasTab userId="mock-user" /> },
    { name: 'Scouts', component: <ScoutsTab userId="mock-user" budget={mockGame.club.budget} /> },
    { name: 'Match', component: (
      <div className="h-[600px] overflow-y-auto bg-slate-900">
        <MatchViewer 
          matchState={{
            ...mockMatchState,
            visibleEvents: mockMatchState.visibleEvents,
            stats: mockMatchState.stats
          }} 
          onExit={() => {}} 
          homePlayers={initialClub.players || []} 
          tactics={defaultTactics} 
          awayStrength={70}
        />
      </div>
    ) },
  ];

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center">
      <div className="mb-4 flex gap-2 overflow-x-auto p-2 w-full max-w-6xl">
        {scenes.map((s, i) => (
          <Button key={i} variant={scene === i ? 'default' : 'outline'} size="sm" onClick={() => setScene(i)}>
            {s.name}
          </Button>
        ))}
      </div>
      <div className="w-full max-w-6xl border rounded-2xl overflow-hidden bg-card shadow-2xl min-h-[700px]">
        {scenes[scene].component}
      </div>
    </div>
  );
}
