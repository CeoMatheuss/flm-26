import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Newspaper, Users, Target, Globe, Radio } from 'lucide-react';
import { useActiveMatch } from '@/hooks/useActiveMatch';
import { useNavigate } from 'react-router-dom';

export function GameNavBar() {
  const { isInLiveMatch, minute } = useActiveMatch();
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col gap-1">
      {isInLiveMatch && (
        <button
          onClick={() => navigate('/match')}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-destructive/15 border border-destructive/40 hover:bg-destructive/25 transition animate-pulse"
        >
          <Radio className="h-3.5 w-3.5 text-destructive" />
          <span className="text-[10px] sm:text-xs font-semibold text-destructive">
            🔴 PARTIDA AO VIVO {minute}' — Modo Estratégia
          </span>
          <span className="text-[10px] sm:text-xs text-destructive/80 underline ml-1">Voltar à partida</span>
        </button>
      )}
      <TabsList className="grid grid-cols-5 h-auto gap-0.5 bg-card/60 backdrop-blur-sm p-1 border border-border/20 rounded-xl">
        <TabsTrigger value="dashboard" className="nav-tab flex flex-col items-center gap-0.5 py-2 sm:py-2.5"><LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="text-[9px] sm:text-xs leading-tight font-medium">Início</span></TabsTrigger>
        <TabsTrigger value="journal" className="nav-tab flex flex-col items-center gap-0.5 py-2 sm:py-2.5"><Newspaper className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="text-[9px] sm:text-xs leading-tight font-medium">Jornal</span></TabsTrigger>
        <TabsTrigger value="squad" className="nav-tab flex flex-col items-center gap-0.5 py-2 sm:py-2.5"><Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="text-[9px] sm:text-xs leading-tight font-medium">Elenco</span></TabsTrigger>
        <TabsTrigger value="tactics" className="nav-tab flex flex-col items-center gap-0.5 py-2 sm:py-2.5"><Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="text-[9px] sm:text-xs leading-tight font-medium">Táticas</span></TabsTrigger>
        <TabsTrigger value="league" className="nav-tab flex flex-col items-center gap-0.5 py-2 sm:py-2.5"><Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="text-[9px] sm:text-xs leading-tight font-medium">Liga</span></TabsTrigger>
      </TabsList>
    </div>
  );
}
