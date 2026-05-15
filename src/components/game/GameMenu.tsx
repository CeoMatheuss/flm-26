import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ShoppingBag, MoreHorizontal, Calendar, CalendarDays, Dumbbell, GraduationCap, Search, Shirt, User, Users, Landmark, Building2, Home, DollarSign, Handshake, ShoppingCart, Heart, MessageCircle, Swords, Gift, Medal, Trophy, BarChart3, Settings, Sparkles, BookOpen, Shield, ChevronRight, Globe, EyeOff, Scale, Inbox, ArrowLeftRight, HeartPulse, LifeBuoy, FileText, Crown, Target, Instagram } from 'lucide-react';

interface GameMenuProps {
  showAdmin: boolean;
  onTabChange: (tab: string) => void;
  onShowTutorial: () => void;
  onMarketSubTabChange?: (subTab: string) => void;
  tutorialCompleted?: boolean;
}

export function GameMenu({ showAdmin, onTabChange, onShowTutorial, onMarketSubTabChange, tutorialCompleted }: GameMenuProps) {
  const goToMarket = (sub: string) => {
    onMarketSubTabChange?.(sub);
    onTabChange('market');
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 w-10 p-0 shrink-0 border-border/30 bg-card/60 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60 bg-card/95 backdrop-blur-md border-border/30 z-50 max-h-[75vh] overflow-y-auto smooth-scroll p-2 rounded-xl shadow-xl shadow-black/20">
        <p className="menu-category">🌎 Competições</p>
        <DropdownMenuItem onClick={() => onTabChange('world')} className="menu-item"><Globe className="h-3.5 w-3.5 text-purple-400" /> Mundo <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('copas')} className="menu-item"><Trophy className="h-3.5 w-3.5 text-orange-400" /> Copas <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('ranking')} className="menu-item"><BarChart3 className="h-3.5 w-3.5 text-primary/70" /> Rankings <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('trophies')} className="menu-item"><Medal className="h-3.5 w-3.5 text-primary/70" /> Histórico <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('stats')} className="menu-item"><BarChart3 className="h-3.5 w-3.5 text-primary/70" /> Estatísticas <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

        <div className="my-1.5 border-t border-border/20" />
        <p className="menu-category">⚙️ Gerais</p>
        <DropdownMenuItem onClick={() => onTabChange('matches')} className="menu-item"><Swords className="h-3.5 w-3.5 text-primary/70" /> Amistosos! <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('calendar')} className="menu-item"><Calendar className="h-3.5 w-3.5 text-primary/70" /> Calendário <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('scouts')} className="menu-item"><Search className="h-3.5 w-3.5 text-primary/70" /> Olheiros <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('uniforms')} className="menu-item"><Shirt className="h-3.5 w-3.5 text-primary/70" /> Uniformes <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('clubprofile')} className="menu-item"><User className="h-3.5 w-3.5 text-primary/70" /> Perfil do Clube <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        

        <div className="my-1.5 border-t border-border/20" />
        <p className="menu-category">🏗️ Infraestrutura</p>
        <DropdownMenuItem onClick={() => onTabChange('training')} className="menu-item"><Dumbbell className="h-3.5 w-3.5 text-primary/70" /> Treinos <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('physio')} className="menu-item"><HeartPulse className="h-3.5 w-3.5 text-primary/70" /> Fisioterapia <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('stadium')} className="menu-item"><Landmark className="h-3.5 w-3.5 text-primary/70" /> Estádio <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('youth')} className="menu-item"><GraduationCap className="h-3.5 w-3.5 text-primary/70" /> Categorias de Base <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('ctrooms')} className="menu-item"><Building2 className="h-3.5 w-3.5 text-primary/70" /> Salas do CT <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

        <div className="my-1.5 border-t border-border/20" />
        <p className="menu-category">💰 Finanças</p>
        <DropdownMenuItem onClick={() => onTabChange('finance')} className="menu-item"><DollarSign className="h-3.5 w-3.5 text-primary/70" /> Relatório Financeiro <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('sponsors')} className="menu-item"><Handshake className="h-3.5 w-3.5 text-primary/70" /> Patrocínios <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

        <div className="my-1.5 border-t border-border/20" />
        <p className="menu-category">💼 Transferências</p>
        <DropdownMenuItem onClick={() => goToMarket('browse')} className="menu-item"><Globe className="h-3.5 w-3.5 text-primary/70" /> Mercado <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => goToMarket('freeagents')} className="menu-item"><EyeOff className="h-3.5 w-3.5 text-primary/70" /> Jogadores Livres <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => goToMarket('auction')} className="menu-item"><Scale className="h-3.5 w-3.5 text-primary/70" /> Leilão <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => goToMarket('offers')} className="menu-item"><Inbox className="h-3.5 w-3.5 text-primary/70" /> Propostas <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => goToMarket('loans')} className="menu-item"><ArrowLeftRight className="h-3.5 w-3.5 text-primary/70" /> Empréstimos <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

        <div className="my-1.5 border-t border-border/20" />
        <p className="menu-category">🌍 Comunidade</p>
        <DropdownMenuItem onClick={() => onTabChange('fans')} className="menu-item"><Heart className="h-3.5 w-3.5 text-primary/70" /> Torcida <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('members')} className="menu-item"><Crown className="h-3.5 w-3.5 text-yellow-400" /> Sócios Torcedores <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('chat')} className="menu-item"><MessageCircle className="h-3.5 w-3.5 text-primary/70" /> Chat Global <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        
        
        <DropdownMenuItem onClick={() => onTabChange('pacotinhos')} className="menu-item"><Gift className="h-3.5 w-3.5 text-primary/70" /> Pacotinhos <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('shop')} className="menu-item font-bold text-emerald-400 bg-emerald-400/5 hover:bg-emerald-400/10"><ShoppingBag className="h-3.5 w-3.5" /> LOJA FLM <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

        <div className="my-1.5 border-t border-border/20" />
        <p className="menu-category">🏆 Conquistas</p>
        <DropdownMenuItem onClick={() => onTabChange('achievements')} className="menu-item"><Medal className="h-3.5 w-3.5 text-primary/70" /> Conquistas <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

        <div className="my-1.5 border-t border-border/20" />
        <p className="menu-category">📱 Redes Sociais</p>
        <DropdownMenuItem onClick={() => window.open('https://www.instagram.com/footballlifemanager26/', '_blank')} className="menu-item"><Instagram className="h-3.5 w-3.5 text-pink-500" /> Instagram <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>

        <div className="my-1.5 border-t border-border/20" />
        <p className="menu-category">⚙️ Sistema</p>
        <DropdownMenuItem onClick={() => onTabChange('settings')} className="menu-item"><Settings className="h-3.5 w-3.5 text-primary/70" /> Configurações <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('support')} className="menu-item"><LifeBuoy className="h-3.5 w-3.5 text-primary/70" /> Suporte <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange('terms')} className="menu-item"><FileText className="h-3.5 w-3.5 text-primary/70" /> Termos de Uso <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>
        {!tutorialCompleted && <DropdownMenuItem onClick={onShowTutorial} className="menu-item"><BookOpen className="h-3.5 w-3.5 text-primary/70" /> Tutorial Interativo <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>}
        {showAdmin && <DropdownMenuItem onClick={() => onTabChange('admin')} className="menu-item"><Shield className="h-3.5 w-3.5 text-destructive/70" /> Painel Admin <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/30" /></DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
