import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, Users, Swords, ShoppingCart, Trophy, 
  Building2, GraduationCap, ChevronRight, ChevronLeft, X, Sparkles, Coins,
  Target, Dumbbell, Globe, Newspaper, DollarSign, Landmark
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  onNavigateTab?: (tab: string) => void;
}

const steps = [
  {
    icon: Sparkles,
    title: 'Bem-vindo ao FLM 26! ⚽',
    tab: 'dashboard',
    description: 'Você é o novo manager! Aqui no Dashboard você acompanha tudo: orçamento, torcida, resultados e eventos do seu clube.',
    examples: [
      { label: 'Orçamento', detail: 'Seu dinheiro disponível para contratações e melhorias' },
      { label: 'Torcida', detail: 'Vitórias atraem fãs, derrotas espantam' },
      { label: 'Eventos', detail: 'Lesões, protestos e surpresas aparecem aqui' },
    ],
    reward: 50000,
    color: 'text-primary',
  },
  {
    icon: Newspaper,
    title: 'Jornal & Notícias',
    tab: 'journal',
    description: 'O Jornal traz todas as manchetes: transferências, resultados, eventos e comunicados oficiais dos administradores.',
    examples: [
      { label: 'Manchetes', detail: 'Notícias automáticas sobre seu clube e jogadores' },
      { label: 'Narração IA', detail: 'Clique para gerar narrações realistas das notícias' },
      { label: 'Atualizações ADM', detail: 'Comunicados oficiais da moderação do jogo' },
    ],
    reward: 25000,
    color: 'text-blue-400',
  },
  {
    icon: Users,
    title: 'Elenco',
    tab: 'squad',
    description: 'Gerencie seus jogadores: veja atributos detalhados, renove contratos, descanse jogadores cansados e liste para venda.',
    examples: [
      { label: 'OVR', detail: 'Overall do jogador — quanto maior, melhor ele joga' },
      { label: 'Stamina', detail: 'Jogadores cansados rendem menos. Use "Descansar"' },
      { label: 'Contrato', detail: 'Renove antes que expire ou perde o jogador!' },
    ],
    reward: 50000,
    color: 'text-green-400',
  },
  {
    icon: Target,
    title: 'Táticas',
    tab: 'tactics',
    description: 'Configure formação (4-3-3, 4-4-2, etc), estilo de jogo (ofensivo/defensivo) e pressão. A tática afeta diretamente o resultado das partidas.',
    examples: [
      { label: 'Formação', detail: 'Escolha entre 4-3-3, 4-4-2, 3-5-2 e mais' },
      { label: 'Estilo', detail: 'Ofensivo marca mais gols mas sofre mais' },
      { label: 'Pressão', detail: 'Alta pressão cansa mais mas rouba mais bolas' },
    ],
    reward: 50000,
    color: 'text-red-400',
  },
  {
    icon: Dumbbell,
    title: 'Treinos & Treinos 2D',
    tab: 'training',
    description: 'Treine seus jogadores para evoluir atributos. Os Treinos 2D (Pênaltis, Faltas, Contra-Ataque) dão bônus temporários para as partidas!',
    examples: [
      { label: 'Treinos', detail: 'Insights automáticos sobre potencial e condição do elenco' },
      { label: 'Treinos 2D', detail: 'Simulações táticas que dão +1/+2 em atributos' },
      { label: 'Bônus', detail: 'Complete um treino 2D antes do jogo para vantagem!' },
    ],
    reward: 75000,
    color: 'text-orange-400',
  },
  {
    icon: ShoppingCart,
    title: 'Mercado de Transferências',
    tab: 'market',
    description: 'Compre e venda jogadores no mercado online. Faça propostas, negocie salários e monte o melhor elenco possível.',
    examples: [
      { label: 'Comprar', detail: 'Veja jogadores à venda e faça ofertas com bônus' },
      { label: 'Vender', detail: 'Liste seus jogadores no elenco → botão "Vender"' },
      { label: 'Empréstimos', detail: 'Empreste jogadores para reduzir folha salarial' },
    ],
    reward: 75000,
    color: 'text-yellow-400',
  },
  {
    icon: Globe,
    title: 'Liga Online',
    tab: 'league',
    description: 'Entre na liga automática do seu país e dispute contra outros managers reais. Campeonatos com rodadas, tabela e premiações.',
    examples: [
      { label: 'Auto-Liga', detail: 'O jogo te coloca automaticamente em uma liga competitiva' },
      { label: 'Chat', detail: 'Converse com outros managers na liga' },
      { label: 'Propostas', detail: 'Negocie jogadores diretamente com rivais' },
    ],
    reward: 50000,
    color: 'text-cyan-400',
  },
  {
    icon: Building2,
    title: 'Infraestrutura & Estádio',
    tab: 'infra',
    description: 'Melhore o CT, fisioterapia, base e estádio. Cada nível traz benefícios reais: treino mais rápido, recuperação melhor e mais torcedores.',
    examples: [
      { label: 'Estádio', detail: 'Até nível 15 (120k lugares) → mais receita por jogo' },
      { label: 'CT', detail: 'Nível maior = jogadores evoluem mais rápido' },
      { label: 'Fisioterapia', detail: 'Lesões duram menos com nível alto' },
    ],
    reward: 50000,
    color: 'text-purple-400',
  },
  {
    icon: Trophy,
    title: 'Ranking & Conquistas',
    tab: 'ranking',
    description: 'Suba no ranking global com vitórias! Complete conquistas para desbloquear marcos. Acesse troféus para ver sua galeria.',
    examples: [
      { label: 'Ranking', detail: 'Vitórias dão pontos, derrotas tiram. Dispute o topo!' },
      { label: 'Conquistas', detail: 'Marque 100 gols, ganhe 10 jogos seguidos e mais' },
      { label: 'Troféus', detail: 'Títulos de liga ficam eternizados na galeria' },
    ],
    reward: 75000,
    color: 'text-amber-400',
  },
];

const TOTAL_REWARD = steps.reduce((sum, s) => sum + s.reward, 0);

export function TutorialModal({ open, onClose, onComplete, onNavigateTab }: Props) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const Icon = current.icon;

  const handleNext = () => {
    if (step < steps.length - 1) {
      const nextStep = steps[step + 1];
      onNavigateTab?.(nextStep.tab);
      setStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      const prevStep = steps[step - 1];
      onNavigateTab?.(prevStep.tab);
      setStep(s => s - 1);
    }
  };

  const handleFinish = () => {
    onNavigateTab?.('dashboard');
    onComplete?.();
    onClose();
  };

  // Navigate to tab when opening
  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    } else {
      onNavigateTab?.(current.tab);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border/50">
        <div className="p-5 space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] gap-1">
                📖 {step + 1} / {steps.length}
              </Badge>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground" onClick={onClose}>
                <X className="h-3 w-3 mr-1" /> Pular
              </Button>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <div className="p-2.5 rounded-xl bg-card border border-border/50 shadow-sm">
                <Icon className={`h-7 w-7 ${current.color}`} />
              </div>
              <div>
                <DialogTitle className="text-base">{current.title}</DialogTitle>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="secondary" className="text-[9px] gap-0.5 h-4">
                    📍 Aba: {current.tab === 'dashboard' ? 'Dashboard' : current.tab === 'journal' ? 'Jornal' : current.tab === 'squad' ? 'Elenco' : current.tab === 'tactics' ? 'Táticas' : current.tab === 'training' ? 'Treinos' : current.tab === 'market' ? 'Mercado' : current.tab === 'league' ? 'Liga' : current.tab === 'infra' ? 'Infraestrutura' : 'Ranking'}
                  </Badge>
                  <div className="flex items-center gap-0.5">
                    <Coins className="h-3 w-3 text-yellow-400" />
                    <span className="text-[9px] text-yellow-400 font-bold">+R${current.reward.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {current.description}
          </p>

          {/* Interactive examples */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Como funciona:</p>
            {current.examples.map((ex, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/20 border border-border/30">
                <span className="text-primary text-[10px] font-bold mt-0.5 shrink-0">→</span>
                <div>
                  <p className="text-[11px] font-semibold">{ex.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-snug">{ex.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Total reward */}
          <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-[10px] text-yellow-300">Recompensa total:</span>
            </div>
            <span className="text-xs font-bold text-yellow-400">R${TOTAL_REWARD.toLocaleString('pt-BR')}</span>
          </div>

          {/* Progress */}
          <div className="flex gap-0.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted/40'}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={step === 0}
              className="h-8 text-xs gap-1"
            >
              <ChevronLeft className="h-3 w-3" /> Anterior
            </Button>

            {step < steps.length - 1 ? (
              <Button size="sm" onClick={handleNext} className="h-8 text-xs gap-1">
                Próximo <ChevronRight className="h-3 w-3" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleFinish} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1">
                🎮 Ganhar R${(TOTAL_REWARD / 1000).toFixed(0)}k e Jogar!
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
