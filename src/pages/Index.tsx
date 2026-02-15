import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardTab } from '@/components/game/DashboardTab';
import { SquadTab } from '@/components/game/SquadTab';
import { MatchesTab } from '@/components/game/MatchesTab';
import { useGame } from '@/hooks/useGame';
import { LayoutDashboard, Users, Swords } from 'lucide-react';

const Index = () => {
  const { club, simulateMatch, trainPlayer, restPlayer } = useGame();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-r from-primary/10 via-background to-primary/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">⚽</div>
            <div>
              <h1 className="text-xl font-bold">{club.name}</h1>
              <p className="text-xs text-muted-foreground">Football Club Manager 2026</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-emerald-400">R$ {(club.budget / 1000000).toFixed(2)}M</p>
            <p className="text-xs text-muted-foreground">{club.stats.points} pts • {club.stats.wins}V {club.stats.draws}E {club.stats.losses}D</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="dashboard" className="flex-1 gap-2">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="squad" className="flex-1 gap-2">
              <Users className="h-4 w-4" /> Elenco
            </TabsTrigger>
            <TabsTrigger value="matches" className="flex-1 gap-2">
              <Swords className="h-4 w-4" /> Partidas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab club={club} />
          </TabsContent>

          <TabsContent value="squad">
            <SquadTab players={club.players} budget={club.budget} onTrain={trainPlayer} onRest={restPlayer} />
          </TabsContent>

          <TabsContent value="matches">
            <MatchesTab matches={club.matches} clubName={club.name} onSimulate={simulateMatch} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
