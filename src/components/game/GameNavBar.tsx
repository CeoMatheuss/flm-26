import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Newspaper, Users, Target, Trophy } from 'lucide-react';

export function GameNavBar() {
  return (
    <div className="flex-1 flex items-center w-full">
      <TabsList className="flex w-full h-auto gap-1 bg-card/60 backdrop-blur-sm p-1.5 border border-border/20 rounded-xl">
        <TabsTrigger 
          value="dashboard" 
          className="nav-tab flex flex-col items-center justify-center gap-1.5 py-3 sm:py-4 flex-1 basis-0 min-w-0"
        >
          <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-[11px] sm:text-sm leading-tight font-semibold">Início</span>
        </TabsTrigger>
        <TabsTrigger 
          value="squad" 
          className="nav-tab flex flex-col items-center justify-center gap-1.5 py-3 sm:py-4 flex-1 basis-0 min-w-0"
        >
          <Users className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-[11px] sm:text-sm leading-tight font-semibold">Elenco</span>
        </TabsTrigger>
        <TabsTrigger 
          value="journal" 
          className="nav-tab flex flex-col items-center justify-center gap-1.5 py-3 sm:py-4 flex-1 basis-0 min-w-0"
        >
          <Newspaper className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-[11px] sm:text-sm leading-tight font-semibold">Jornal</span>
        </TabsTrigger>
        <TabsTrigger 
          value="tactics" 
          className="nav-tab flex flex-col items-center justify-center gap-1.5 py-3 sm:py-4 flex-1 basis-0 min-w-0"
        >
          <Target className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-[11px] sm:text-sm leading-tight font-semibold">Táticas</span>
        </TabsTrigger>
        <TabsTrigger 
          value="league" 
          className="nav-tab flex flex-col items-center justify-center gap-1.5 py-3 sm:py-4 flex-1 basis-0 min-w-0"
        >
          <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
          <span className="text-[11px] sm:text-sm leading-tight font-semibold">Liga</span>
        </TabsTrigger>
      </TabsList>
    </div>
  );
}


