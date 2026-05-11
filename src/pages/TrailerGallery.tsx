import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardTab } from '@/components/game/DashboardTab';
import { TacticsTab } from '@/components/game/TacticsTab';
import { LeagueTab } from '@/components/game/LeagueTab';
import { CopasTab } from '@/components/game/CopasTab';
import { ScoutsTab } from '@/components/game/ScoutsTab';
import { initialClub } from '@/data/initialData';
import { defaultTactics } from '@/types/tactics';
import { defaultInfrastructure, defaultSeason } from '@/types/infrastructure';

const mockGame: any = {
  club: initialClub,
  tactics: defaultTactics,
  finances: [],
  infrastructure: defaultInfrastructure,
  season: defaultSeason,
  marketPlayers: [],
  freeAgents: [],
  sponsors: [],
  sponsorOffers: [],
  events: [],
  ranking: 1,
  rankingHistory: [],
  setTactics: () => {},
  upgradeFacility: () => {},
  generateFriendly: () => {},
  youthProspects: [],
  youthInvestment: 100000,
  clubProfile: {
    ownerName: 'Manager',
    foundedSeason: 1,
    foundedDate: '01/01/2025',
    motto: 'Rumo ao topo',
    trophies: []
  }
};

export default function TrailerGallery() {
  const [scene, setScene] = useState(0);

  const scenes = [
    { name: 'Dashboard', component: <DashboardTab club={mockGame.club} events={mockGame.events} infrastructure={mockGame.infrastructure} season={mockGame.season.currentSeason} userId="mock-user" /> },
    { name: 'Tactics', component: <TacticsTab tactics={mockGame.tactics} players={mockGame.club.players} onUpdate={() => {}} season={1} userId="mock-user" /> },
    { name: 'League', component: <LeagueTab clubName={mockGame.club.name} /> },
    { name: 'Copas', component: <CopasTab userId="mock-user" /> },
    { name: 'Scouts', component: <ScoutsTab userId="mock-user" budget={mockGame.club.budget} /> },
  ];

  return (
    <div className="min-h-screen bg-background p-8 flex flex-col items-center justify-center">
      <div className="mb-8 flex gap-2 overflow-x-auto p-2">
        {scenes.map((s, i) => (
          <Button key={i} variant={scene === i ? 'default' : 'outline'} onClick={() => setScene(i)}>
            {s.name}
          </Button>
        ))}
      </div>
      <div className="w-full max-w-5xl border rounded-2xl overflow-hidden bg-card shadow-2xl">
        {scenes[scene].component}
      </div>
    </div>
  );
}
