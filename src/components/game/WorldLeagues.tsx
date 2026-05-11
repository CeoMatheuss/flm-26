import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaguesOverview } from './LeaguesOverview';
import { CopasTab } from './CopasTab';
import { Globe, Trophy } from 'lucide-react';


interface Props {
  userId: string;
  rating?: number;
  rankingHistory?: any[];
  clubName?: string;
  stats?: { wins: number; draws: number; losses: number };
  season?: number;
}


export function WorldLeagues({ userId, rating = 0, rankingHistory = [], clubName = 'Manager', stats = { wins: 0, draws: 0, losses: 0 }, season = 1 }: Props) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Globe className="h-6 w-6 text-purple-400" /> Mundo do Futebol
        </h2>
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview" onClick={() => setActiveTab('overview')} className="text-xs px-4">Ligas Mundiais</TabsTrigger>
          <TabsTrigger value="copas" onClick={() => setActiveTab('copas')} className="text-xs px-4 flex items-center gap-1.5">
            <Trophy className="h-3 w-3" /> Copas Nacionais
          </TabsTrigger>
        </TabsList>
      </div>


      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="overview" className="mt-0">
          <LeaguesOverview onBack={() => {}} />
        </TabsContent>
        <TabsContent value="copas" className="mt-0">
          <CopasTab userId={userId} />
        </TabsContent>

      </Tabs>
    </div>
  );
}