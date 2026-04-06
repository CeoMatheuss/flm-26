import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Newspaper, Users, Target, Globe, ShoppingCart } from 'lucide-react';

export function GameNavBar() {
  return (
    <TabsList className="flex-1 grid grid-cols-6 h-auto gap-0.5 bg-card/60 backdrop-blur-sm p-0.5 sm:p-1 border border-border/20 rounded-xl">
      <TabsTrigger value="dashboard" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2"><LayoutDashboard className="h-3 w-3 sm:h-3.5 sm:w-3.5" /><span className="text-[7px] sm:text-xs leading-tight">Início</span></TabsTrigger>
      <TabsTrigger value="journal" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2"><Newspaper className="h-3 w-3 sm:h-3.5 sm:w-3.5" /><span className="text-[7px] sm:text-xs leading-tight">Jornal</span></TabsTrigger>
      <TabsTrigger value="squad" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2"><Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" /><span className="text-[7px] sm:text-xs leading-tight">Elenco</span></TabsTrigger>
      <TabsTrigger value="tactics" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2"><Target className="h-3 w-3 sm:h-3.5 sm:w-3.5" /><span className="text-[7px] sm:text-xs leading-tight">Táticas</span></TabsTrigger>
      <TabsTrigger value="league" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2"><Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5" /><span className="text-[7px] sm:text-xs leading-tight">Liga</span></TabsTrigger>
      <TabsTrigger value="market" className="nav-tab flex flex-col items-center gap-0.5 py-1.5 sm:py-2"><ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" /><span className="text-[7px] sm:text-xs leading-tight">Mercado</span></TabsTrigger>
    </TabsList>
  );
}
