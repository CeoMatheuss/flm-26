import React, { useState, useMemo } from 'react';
import { Player, personalityLabels } from '@/types/game';
import { ClubShield } from '../ClubShield';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  LayoutList, 
  Target, 
  Activity, 
  Heart, 
  BarChart3, 
  Hash, 
  FileText,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Star
} from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';
import { getPlayerValue, isPlayerGem } from '@/utils/playerGenerator';
import { cn } from '@/lib/utils';

interface SquadTableProps {
  players: Player[];
  selectedPlayer: Player | null;
  onPlayerSelect: (player: Player) => void;
}

export function SquadTable({ players, selectedPlayer, onPlayerSelect, onUpdatePlayers }: SquadTableProps & { onUpdatePlayers?: (players: Player[]) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setFilterPos] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const filteredPlayers = useMemo(() => {
    return [...players]
      .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(p => !positionFilter || p.position === positionFilter)
      .sort((a, b) => b.overall - a.overall);
  }, [players, searchTerm, positionFilter]);

  const posOrder = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0a0c14]/40 backdrop-blur-xl rounded-t-[2rem] border-t border-x border-white/5 overflow-hidden shadow-2xl">
      {/* Search & Filter Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white/5 p-1 rounded-xl">
             <TabsList className="bg-transparent h-8 p-0 gap-1">
                <TabsTrigger value="all" className="text-[10px] font-black italic uppercase rounded-lg px-4 data-[state=active]:bg-[#8b5cf6] data-[state=active]:text-white transition-all duration-300">Elenco</TabsTrigger>
                <TabsTrigger value="form" className="text-[10px] font-black italic uppercase rounded-lg px-4 data-[state=active]:bg-[#8b5cf6] data-[state=active]:text-white transition-all duration-300">Formação</TabsTrigger>
                <TabsTrigger value="stats" className="text-[10px] font-black italic uppercase rounded-lg px-4 data-[state=active]:bg-[#8b5cf6] data-[state=active]:text-white transition-all duration-300">Estatísticas</TabsTrigger>
             </TabsList>
          </Tabs>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[400px]">
             <button
               onClick={() => setFilterPos(null)}
               className={cn(
                 "shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black italic uppercase transition-all duration-300 border",
                 !positionFilter ? "bg-[#8b5cf6]/20 border-[#8b5cf6]/40 text-[#8b5cf6]" : "bg-white/5 border-white/5 text-white/40 hover:text-white"
               )}
             >
               Todos
             </button>
             {posOrder.map(pos => (
               <button
                 key={pos}
                 onClick={() => setFilterPos(positionFilter === pos ? null : pos)}
                 className={cn(
                   "shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black italic uppercase transition-all duration-300 border",
                   positionFilter === pos ? "bg-[#8b5cf6]/20 border-[#8b5cf6]/40 text-[#8b5cf6]" : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                 )}
               >
                 {pos}
               </button>
             ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20 group-focus-within:text-[#8b5cf6] transition-colors" />
            <Input 
              placeholder="Buscar jogador..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-10 w-[200px] bg-white/5 border-white/5 pl-10 text-xs rounded-xl focus-visible:ring-[#8b5cf6]/50 focus-visible:border-[#8b5cf6]/50 transition-all duration-500"
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white/5 border-white/5 hover:bg-[#8b5cf6]/10 hover:text-[#8b5cf6] hover:border-[#8b5cf6]/30">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-y-auto smooth-scroll">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0a0c14] border-b border-white/5 shadow-md">
            <tr className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] italic">
              <th className="px-6 py-4 w-12">#</th>
              <th className="px-6 py-4">Jogador</th>
              <th className="px-6 py-4 text-center">Pos</th>
              <th className="px-6 py-4 text-center">OVR</th>
              <th className="px-6 py-4">Condição</th>
              <th className="px-6 py-4">Moral</th>
              <th className="px-6 py-4">Gols</th>
              <th className="px-6 py-4">Assist.</th>
              <th className="px-6 py-4 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {filteredPlayers.map((player) => {
              const isSelected = selectedPlayer?.id === player.id;
              const value = getPlayerValue(player);
              
              return (
                <tr 
                  key={player.id}
                  onClick={() => onPlayerSelect(player)}
                  className={cn(
                    "group cursor-pointer transition-all duration-300",
                    isSelected 
                      ? "bg-[#8b5cf6]/10" 
                      : "hover:bg-white/[0.02]"
                  )}
                >
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-black italic tracking-tighter transition-colors",
                      isSelected ? "text-[#8b5cf6]" : "text-white/20"
                    )}>
                      #{player.shirtNumber || player.id.slice(0, 2)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 overflow-hidden group-hover:border-[#8b5cf6]/30 transition-all duration-500">
                        <Users className="h-6 w-6 text-white/10" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                           <p className={cn(
                             "text-sm font-black italic tracking-tighter truncate",
                             isSelected ? "text-white" : "text-white/80 group-hover:text-white"
                           )}>{player.name}</p>
                           {isPlayerGem(player) && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
                        </div>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{player.age} Anos</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge className={cn(
                      "text-[9px] font-black italic px-2 py-0.5",
                      isSelected ? "bg-[#8b5cf6] text-white" : "bg-white/5 text-white/60 border-white/5"
                    )}>{player.position}</Badge>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={cn(
                      "inline-flex w-10 h-10 rounded-lg border-2 items-center justify-center font-black italic text-lg transition-all duration-500",
                      isSelected ? "bg-[#8b5cf6]/20 border-[#8b5cf6]/40 text-[#8b5cf6] shadow-[0_0_15px_rgba(139,92,246,0.2)]" : "bg-white/5 border-white/5 text-white/80"
                    )}>
                      {player.overall}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-24 space-y-1.5">
                       <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                         <div 
                           className={cn(
                             "h-full transition-all duration-1000",
                             player.stamina > 80 ? "bg-[#10b981]" : player.stamina > 50 ? "bg-amber-400" : "bg-red-500"
                           )} 
                           style={{ width: `${player.stamina}%` }} 
                         />
                       </div>
                       <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{Math.round(player.stamina)}% Stamina</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5 w-fit">
                       <Heart className={cn(
                         "h-3 w-3",
                         player.morale > 70 ? "text-red-400 fill-red-400" : "text-white/20"
                       )} />
                       <span className="text-[10px] font-black text-white/60 italic">{player.morale}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-black text-white/40 italic">{player.goals || 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-black text-white/40 italic">{player.assists || 0}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-[#10b981] italic tracking-tighter uppercase">
                      {value >= 1_000_000 ? `${(value/1_000_000).toFixed(1)}M` : `${(value/1000).toFixed(0)}k`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
