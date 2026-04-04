import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Calendar, CalendarDays, Dumbbell, GraduationCap, Search, Shirt, User, Landmark, Building2, Home, DollarSign, Handshake, Gavel, Heart, MessageCircle, Swords, Gift, Medal, Trophy, BarChart3, Settings, Sparkles, BookOpen, Shield, ChevronRight } from 'lucide-react';

interface GameMenuProps {
  showAdmin: boolean;
  onTabChange: (tab: string) => void;
  onShowTutorial: () => void;
}

export function GameMenu({ showAdmin, onTabChange, onShowTutorial }: GameMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 w-10 p-0 shrink-0 border-border/30 bg-card/60 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60 bg-card/95 backdrop-blur-md border-border/30 z-50 max-h-[75vh] overflow-y-auto smooth-scroll p-2 rounded-xl shadow-xl shadow-black/20">
        <p className="menu-category">⚽ Clube</p>
        <DropdownMenuItem onClick={() => onTabChange('calendar')} className="menu-item"><Calendar className="h-3.5 w-3.5 text-primary/70" /> Calendário <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => onTabChange('training')} className="menu-item"><Dumbbell className="h-3.5 w-3.5 text-primary/70" /> Treinos <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('youth')} className="menu-item"><GraduationCap className="h-3.5 w-3.5 text-primary/70" /> Categorias de Base <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('scouts')} className="menu-item"><Search className="h-3.5 w-3.5 text-primary/70" /> Olheiros <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('uniforms')} className="menu-item"><Shirt className="h-3.5 w-3.5 text-primary/70" /> Uniformes <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('clubprofile')} className="menu-item"><User className="h-3.5 w-3.5 text-primary/70" /> Perfil do Clube <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

        <div className="my-1.5 border-t border-border/20" />
        <p className="menu-category">🏗️ Infraestrutura</p>
        <DropdownMenuItem onClick={() => onTabChange('stadium')} className="menu-item"><Landmark className="h-3.5 w-3.5 text-primary/70" /> Estádio <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('infra')} className="menu-item"><Building2 className="h-3.5 w-3.5 text-primary/70" /> CT & Fisioterapia <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('ctrooms')} className="menu-item"><Home className="h-3.5 w-3.5 text-primary/70" /> Salas do CT <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

        <div className="my-1.5 border-t border-border/20" />
        <p className="menu-category">💰 Finanças</p>
        <DropdownMenuItem onClick={() => onTabChange('finance')} className="menu-item"><DollarSign className="h-3.5 w-3.5 text-primary/70" /> Relatório Financeiro <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('sponsors')} className="menu-item"><Handshake className="h-3.5 w-3.5 text-primary/70" /> Patrocínios <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('auction')} className="menu-item"><Gavel className="h-3.5 w-3.5 text-primary/70" /> Leilão de Jogadores <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

        <div className="my-1.5 border-t border-border/20" />
        <p className="menu-category">🌍 Comunidade</p>
        <DropdownMenuItem onClick={() => onTabChange('fans')} className="menu-item"><Heart className="h-3.5 w-3.5 text-primary/70" /> Torcida <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('chat')} className="menu-item"><MessageCircle className="h-3.5 w-3.5 text-primary/70" /> Chat Global <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('matches')} className="menu-item"><Swords className="h-3.5 w-3.5 text-primary/70" /> Amistosos Online <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('pacotinhos')} className="menu-item"><Gift className="h-3.5 w-3.5 text-primary/70" /> Pacotinhos <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

        <div className="my-1.5 border-t border-border/20" />
        <p className="menu-category">🏆 Conquistas</p>
        <DropdownMenuItem onClick={() => onTabChange('achievements')} className="menu-item"><Medal className="h-3.5 w-3.5 text-primary/70" /> Conquistas <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('trophies')} className="menu-item"><Trophy className="h-3.5 w-3.5 text-primary/70" /> Troféus <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('ranking')} className="menu-item"><BarChart3 className="h-3.5 w-3.5 text-primary/70" /> Ranking Global <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

        <div className="my-1.5 border-t border-border/20" />
        <p className="menu-category">⚙️ Sistema</p>
        <DropdownMenuItem onClick={() => onTabChange('settings')} className="menu-item"><Settings className="h-3.5 w-3.5 text-primary/70" /> Configurações <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        {showAdmin && <DropdownMenuItem onClick={() => onTabChange('updates')} className="menu-item"><Sparkles className="h-3.5 w-3.5 text-primary/70" /> Atualizações <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>}
        <DropdownMenuItem onClick={onShowTutorial} className="menu-item"><BookOpen className="h-3.5 w-3.5 text-primary/70" /> Tutorial Interativo <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        {showAdmin && <DropdownMenuItem onClick={() => onTabChange('admin')} className="menu-item"><Shield className="h-3.5 w-3.5 text-destructive/70" /> Painel Admin <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
