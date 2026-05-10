import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaguesOverview } from './LeaguesOverview';
import { ActiveLeaguesPanel } from './ActiveLeaguesPanel';
import { RankingTab } from './RankingTab';
import { Globe, MapPin, Trophy, BarChart3, TrendingUp } from 'lucide-react';

export function WorldLeagues() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Globe className="h-6 w-6 text-purple-400" /> Mundo do Futebol
        </h2>
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview" onClick={() => setActiveTab('overview')} className="text-xs px-4">Ligas</TabsTrigger>
          <TabsTrigger value="active" onClick={() => setActiveTab('active')} className="text-xs px-4">Brasil</TabsTrigger>
          <TabsTrigger value="ranking" onClick={() => setActiveTab('ranking')} className="text-xs px-4">Rankings</TabsTrigger>
          <TabsTrigger value="stats" onClick={() => setActiveTab('stats')} className="text-xs px-4">Estatísticas</TabsTrigger>
        </TabsList>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="overview" className="mt-0">
          <LeaguesOverview onBack={() => {}} />
        </TabsContent>
        <TabsContent value="active" className="mt-0">
          <ActiveLeaguesPanel />
        </TabsContent>
        <TabsContent value="ranking" className="mt-0">
          <RankingTab />
        </TabsContent>
        <TabsContent value="stats" className="mt-0">
          <div className="py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl">
             <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-20" />
             <p>Estatísticas mundiais em processamento...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
