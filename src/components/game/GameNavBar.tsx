import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Newspaper, Users, Target, Trophy } from 'lucide-react';

export function GameNavBar() {
  return (
    <div className="flex-1 flex items-center gap-2 overflow-hidden">
      <TabsList className="flex shrink-0 h-auto gap-1 bg-card/60 backdrop-blur-sm p-1.5 border border-border/20 rounded-xl">
        <TabsTrigger 
          value="dashboard" 
          className="nav-tab flex flex-col items-center gap-1 py-2.5 sm:py-3.5 min-w-[70px] sm:min-w-[85px] flex-1 basis-0"
        >
          <LayoutDashboard className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
          <span className="text-[10px] sm:text-[13px] leading-tight font-bold">Início</span>
        </TabsTrigger>
        <TabsTrigger 
          value="squad" 
          className="nav-tab flex flex-col items-center gap-1 py-2.5 sm:py-3.5 min-w-[70px] sm:min-w-[85px] flex-1 basis-0"
        >
          <Users className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
          <span className="text-[10px] sm:text-[13px] leading-tight font-bold">Elenco</span>
        </TabsTrigger>
        <TabsTrigger 
          value="journal" 
          className="nav-tab flex flex-col items-center gap-1 py-2.5 sm:py-3.5 min-w-[70px] sm:min-w-[85px] flex-1 basis-0"
        >
          <Newspaper className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
          <span className="text-[10px] sm:text-[13px] leading-tight font-bold">Jornal</span>
        </TabsTrigger>
        <TabsTrigger 
          value="tactics" 
          className="nav-tab flex flex-col items-center gap-1 py-2.5 sm:py-3.5 min-w-[70px] sm:min-w-[85px] flex-1 basis-0"
        >
          <Target className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
          <span className="text-[10px] sm:text-[13px] leading-tight font-bold">Táticas</span>
        </TabsTrigger>
        <TabsTrigger 
          value="league" 
          className="nav-tab flex flex-col items-center gap-1 py-2.5 sm:py-3.5 min-w-[70px] sm:min-w-[85px] flex-1 basis-0"
        >
          <Trophy className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5 text-emerald-400" />
          <span className="text-[10px] sm:text-[13px] leading-tight font-bold">Liga</span>
        </TabsTrigger>
      </TabsList>
    </div>
  );
}


