import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Newspaper, Users, Target, Trophy, Globe } from 'lucide-react';

export function GameNavBar() {
  return (
    <div className="flex-1 flex flex-col gap-1">
      <TabsList className="grid grid-cols-4 sm:grid-cols-7 h-auto gap-0.5 bg-card/60 backdrop-blur-sm p-1 border border-border/20 rounded-xl overflow-hidden">
        <TabsTrigger value="dashboard" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2.5">
          <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-[9px] sm:text-xs leading-tight font-medium">Início</span>
        </TabsTrigger>
        <TabsTrigger value="league" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2.5">
          <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
          <span className="text-[9px] sm:text-xs leading-tight font-medium">Liga</span>
        </TabsTrigger>
        <TabsTrigger value="copas" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2.5">
          <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />
          <span className="text-[9px] sm:text-xs leading-tight font-medium">Copas</span>
        </TabsTrigger>
        <TabsTrigger value="journal" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2.5">
          <Newspaper className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-[9px] sm:text-xs leading-tight font-medium">Jornal</span>
        </TabsTrigger>
        <TabsTrigger value="squad" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2.5">
          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-[9px] sm:text-xs leading-tight font-medium">Elenco</span>
        </TabsTrigger>
        <TabsTrigger value="tactics" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2.5">
          <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-[9px] sm:text-xs leading-tight font-medium">Táticas</span>
        </TabsTrigger>
        <TabsTrigger value="world" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2.5">
          <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400" />
          <span className="text-[9px] sm:text-xs leading-tight font-medium">Mundo</span>
        </TabsTrigger>
      </TabsList>
    </div>
  );
}

