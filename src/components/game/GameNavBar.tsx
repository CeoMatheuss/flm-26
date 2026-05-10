import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Users, Target, Trophy, MoreHorizontal } from 'lucide-react';
import { GameMenu } from './GameMenu';

interface GameNavBarProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
}

export function GameNavBar({ onTabChange, activeTab }: GameNavBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-2xl border-t border-border/40 safe-area-bottom shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
      <div className="max-w-[1920px] mx-auto h-16 sm:h-20">
        <TabsList className="grid grid-cols-5 h-full w-full bg-transparent p-0 gap-0">
          <TabsTrigger 
            value="dashboard" 
            className="nav-tab data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none group"
          >
            <div className="flex flex-col items-center justify-center gap-1 transition-transform group-active:scale-90">
              <div className="p-1.5 rounded-xl group-data-[state=active]:bg-primary/20 transition-colors">
                <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold">Início</span>
            </div>
          </TabsTrigger>

          <TabsTrigger 
            value="squad" 
            className="nav-tab data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none group"
          >
            <div className="flex flex-col items-center justify-center gap-1 transition-transform group-active:scale-90">
              <div className="p-1.5 rounded-xl group-data-[state=active]:bg-primary/20 transition-colors">
                <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold">Elenco</span>
            </div>
          </TabsTrigger>

          <TabsTrigger 
            value="tactics" 
            className="nav-tab data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none group"
          >
            <div className="flex flex-col items-center justify-center gap-1 transition-transform group-active:scale-90">
              <div className="p-1.5 rounded-xl group-data-[state=active]:bg-primary/20 transition-colors">
                <Target className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold">Táticas</span>
            </div>
          </TabsTrigger>

          <TabsTrigger 
            value="league" 
            className="nav-tab data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none group"
          >
            <div className="flex flex-col items-center justify-center gap-1 transition-transform group-active:scale-90">
              <div className="p-1.5 rounded-xl group-data-[state=active]:bg-primary/20 transition-colors">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold">Liga</span>
            </div>
          </TabsTrigger>

          {/* Special Menu Trigger */}
          <div className="flex items-center justify-center">
            <GameMenu 
              onTabChange={onTabChange} 
              activeTab={activeTab} 
              trigger={
                <button className="nav-tab w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-all active:scale-95">
                  <div className="p-1.5 rounded-xl transition-colors">
                    <MoreHorizontal className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold">Menu</span>
                </button>
              } 
            />
          </div>
        </TabsList>
      </div>
    </nav>
  );
}

