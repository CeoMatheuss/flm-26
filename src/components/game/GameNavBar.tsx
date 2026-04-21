import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Newspaper, Users, Target, Globe } from 'lucide-react';

export function GameNavBar() {
  return (
    <TabsList className="flex-1 grid grid-cols-5 h-auto gap-0.5 bg-card/60 backdrop-blur-sm p-1 border border-border/20 rounded-xl">
      <TabsTrigger value="dashboard" className="nav-tab flex flex-col items-center gap-0.5 py-2 sm:py-2.5"><LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="text-[9px] sm:text-xs leading-tight font-medium">Início</span></TabsTrigger>
      <TabsTrigger value="journal" className="nav-tab flex flex-col items-center gap-0.5 py-2 sm:py-2.5"><Newspaper className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="text-[9px] sm:text-xs leading-tight font-medium">Jornal</span></TabsTrigger>
      <TabsTrigger value="squad" className="nav-tab flex flex-col items-center gap-0.5 py-2 sm:py-2.5"><Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="text-[9px] sm:text-xs leading-tight font-medium">Elenco</span></TabsTrigger>
      <TabsTrigger value="tactics" className="nav-tab flex flex-col items-center gap-0.5 py-2 sm:py-2.5"><Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="text-[9px] sm:text-xs leading-tight font-medium">Táticas</span></TabsTrigger>
      <TabsTrigger value="league" className="nav-tab flex flex-col items-center gap-0.5 py-2 sm:py-2.5"><Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="text-[9px] sm:text-xs leading-tight font-medium">Liga</span></TabsTrigger>
    </TabsList>
  );
}
