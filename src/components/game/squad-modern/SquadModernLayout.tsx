import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Player } from '@/types/game';
import { SquadTable } from './SquadTable';
import { TacticsTab } from '../TacticsTab';
import { YouthAcademyModernTab } from './YouthAcademyModernTab';
import { YouthProspect } from '@/types/infrastructure';

interface SquadModernProps {
  players: Player[];
  clubName: string;
  userId: string;
  budget: number;
  tactics: any;
  onRest: (id: string) => void;
  onUpdatePlayers: (players: Player[]) => void;
  youthProspects: YouthProspect[];
  onPromoteYouth: (id: string) => void;
}

export function SquadModernLayout({ 
  players, 
  clubName, 
  userId, 
  budget, 
  tactics, 
  onRest, 
  onUpdatePlayers,
  youthProspects,
  onPromoteYouth
}: SquadModernProps) {
  const [activeSubTab, setActiveSubTab] = useState('starters');

  return (
    <div className="h-full flex flex-col bg-[#05070a] text-white">
      <div className="p-6 border-b border-white/5">
        <h1 className="text-3xl font-black italic tracking-tighter uppercase">Elenco</h1>
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Gerencie seu plantel com maestria</p>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="bg-transparent border-b border-white/5 justify-start p-0 px-6 gap-6 h-12 rounded-none">
          <TabsTrigger value="starters" className="text-xs font-black italic uppercase data-[state=active]:text-[#8b5cf6] data-[state=active]:border-b-2 data-[state=active]:border-[#8b5cf6] rounded-none px-0 py-4 transition-all">Titulares</TabsTrigger>
          <TabsTrigger value="reserves" className="text-xs font-black italic uppercase data-[state=active]:text-[#8b5cf6] data-[state=active]:border-b-2 data-[state=active]:border-[#8b5cf6] rounded-none px-0 py-4 transition-all">Reservas</TabsTrigger>
          <TabsTrigger value="youth" className="text-xs font-black italic uppercase data-[state=active]:text-[#8b5cf6] data-[state=active]:border-b-2 data-[state=active]:border-[#8b5cf6] rounded-none px-0 py-4 transition-all">Juniores</TabsTrigger>
          <TabsTrigger value="tactics" className="text-xs font-black italic uppercase data-[state=active]:text-[#8b5cf6] data-[state=active]:border-b-2 data-[state=active]:border-[#8b5cf6] rounded-none px-0 py-4 transition-all">Tático</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden p-6">
          <TabsContent value="starters" className="h-full m-0">
            <SquadTable players={players.slice(0, 11)} selectedPlayer={null} onPlayerSelect={() => {}} onUpdatePlayers={onUpdatePlayers} />
          </TabsContent>
          <TabsContent value="reserves" className="h-full m-0">
            <SquadTable players={players.slice(11)} selectedPlayer={null} onPlayerSelect={() => {}} onUpdatePlayers={onUpdatePlayers} />
          </TabsContent>
          <TabsContent value="youth" className="h-full m-0 overflow-auto">
            <YouthAcademyModernTab prospects={youthProspects} onPromote={onPromoteYouth} />
          </TabsContent>
          <TabsContent value="tactics" className="h-full m-0 overflow-auto">
            <TacticsTab players={players} tactics={tactics} onUpdate={() => {}} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
