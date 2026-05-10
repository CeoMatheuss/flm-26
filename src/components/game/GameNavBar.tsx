import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  LayoutDashboard, Users, Target, Trophy, 
  Newspaper, Calendar, DollarSign, Building2, 
  Settings, Globe, Shield, Star, ShoppingBag,
  MoreHorizontal
} from 'lucide-react';
import { GameMenu } from './GameMenu';

interface GameNavBarProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
  showAdmin: boolean;
  onShowTutorial: () => void;
}

export function GameNavBar({ onTabChange, activeTab, showAdmin, onShowTutorial }: GameNavBarProps) {
  const mainTabs = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'squad', label: 'Elenco', icon: Users },
    { id: 'tactics', label: 'Táticas', icon: Target },
    { id: 'league', label: 'Liga', icon: Trophy },
    { id: 'copas', label: 'Copas', icon: Shield },
    { id: 'journal', label: 'Jornal', icon: Newspaper },
    { id: 'market', label: 'Mercado', icon: ShoppingBag },
    { id: 'calendar', label: 'Calendário', icon: Calendar },
    { id: 'finance', label: 'Finanças', icon: DollarSign },
    { id: 'stadium', label: 'Estádio', icon: Building2 },
    { id: 'world', label: 'Mundo', icon: Globe },
    { id: 'ranking', label: 'Ranking', icon: Star },
  ];

  return (
    <div className="w-full bg-card/80 backdrop-blur-xl border-b border-border/40 sticky top-14 sm:top-16 z-40">
      <ScrollArea className="w-full whitespace-nowrap">
        <TabsList className="inline-flex h-12 sm:h-14 items-center justify-start bg-transparent p-1 gap-1">
          {mainTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="px-4 h-full rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all flex items-center gap-2"
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="text-xs font-bold">{tab.label}</span>
            </TabsTrigger>
          ))}
          
          <div className="flex items-center ml-2 border-l border-border/40 pl-2">
            <GameMenu 
              onTabChange={onTabChange} 
              activeTab={activeTab} 
              showAdmin={showAdmin}
              onShowTutorial={onShowTutorial}
              trigger={
                <button className="h-9 px-3 flex items-center gap-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="text-xs font-bold">Mais</span>
                </button>
              } 
            />
          </div>
        </TabsList>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>
    </div>
  );
}


