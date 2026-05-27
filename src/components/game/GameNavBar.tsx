import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Newspaper, Users, Target, Trophy, Globe } from 'lucide-react';

export function GameNavBar() {
  return (
    <div className="flex-1 flex flex-col gap-1">
      <TabsList className="flex overflow-x-auto h-auto gap-0.5 bg-card/60 backdrop-blur-sm p-1 border border-border/20 rounded-xl scrollbar-none no-scrollbar">
        <TabsTrigger value="dashboard" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2.5 min-w-[70px] flex-1">
          <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-[9px] sm:text-xs leading-tight font-medium">Início</span>
        </TabsTrigger>
        <TabsTrigger value="squad" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2.5 min-w-[70px] flex-1">
          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-[9px] sm:text-xs leading-tight font-medium">Elenco</span>
        </TabsTrigger>
        <TabsTrigger value="journal" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2.5 min-w-[70px] flex-1">
          <Newspaper className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-[9px] sm:text-xs leading-tight font-medium">Jornal</span>
        </TabsTrigger>
        <TabsTrigger value="tactics" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2.5 min-w-[70px] flex-1">
          <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-[9px] sm:text-xs leading-tight font-medium">Táticas</span>
        </TabsTrigger>
        <TabsTrigger value="league" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2.5 min-w-[70px] flex-1">
          <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
          <span className="text-[9px] sm:text-xs leading-tight font-medium">Liga</span>
        </TabsTrigger>
        <TabsTrigger value="championships" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2.5 min-w-[85px] flex-1">
          <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
          <span className="text-[9px] sm:text-xs leading-tight font-medium">Campeonatos</span>
        </TabsTrigger>
      </TabsList>
    </div>
  );
}
