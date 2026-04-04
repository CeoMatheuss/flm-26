import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Newspaper, Users, Target, Globe, ShoppingCart } from 'lucide-react';

export function GameNavBar() {
  return (
    <TabsList className="flex-1 grid grid-cols-6 h-auto gap-0.5 bg-card/60 backdrop-blur-sm p-1 border border-border/20 rounded-xl">
      <TabsTrigger value="dashboard" className="nav-tab"><LayoutDashboard className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" /><span className="text-[8px] sm:text-xs leading-tight">Início</span></TabsTrigger>
      <TabsTrigger value="journal" className="nav-tab"><Newspaper className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" /><span className="text-[8px] sm:text-xs leading-tight">Jornal</span></TabsTrigger>
      <TabsTrigger value="squad" className="nav-tab"><Users className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" /><span className="text-[8px] sm:text-xs leading-tight">Elenco</span></TabsTrigger>
      <TabsTrigger value="tactics" className="nav-tab"><Target className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" /><span className="text-[8px] sm:text-xs leading-tight">Táticas</span></TabsTrigger>
      <TabsTrigger value="league" className="nav-tab"><Globe className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" /><span className="text-[8px] sm:text-xs leading-tight">Liga</span></TabsTrigger>
      <TabsTrigger value="market" className="nav-tab"><ShoppingCart className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" /><span className="text-[8px] sm:text-xs leading-tight">Mercado</span></TabsTrigger>
    </TabsList>
  );
}
