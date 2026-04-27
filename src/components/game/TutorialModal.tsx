import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, Users, Swords, ShoppingCart, Trophy, 
  Building2, GraduationCap, ChevronRight, ChevronLeft, X, Sparkles, Coins,
  Target, Dumbbell, Globe, Newspaper, DollarSign, Landmark, Gamepad2, Zap, Shield
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
    title: 'Bem-vindo ao FLM! ⚽',
    tab: 'dashboard',
    description: 'Bem-vindo ao FLM! Vamos te mostrar o básico para começar. Você é o novo manager — gerencie elenco, finanças, partidas e suba no ranking global!',
    examples: [
      { label: '💰 Orçamento', detail: 'Gerencie finanças — cada decisão impacta seu caixa' },
      { label: '📊 Moral & Torcida', detail: 'Resultados afetam moral do elenco e tamanho da torcida' },
      { label: '⚡ Eventos', detail: 'Lesões, protestos, patrocínios e surpresas aparecem aqui' },
    ],
    reward: 0,
    color: 'text-primary',
  },
  {
    icon: Newspaper,
    title: 'Jornal & Notícias 📰',
    tab: 'journal',
    description: 'O Jornal traz manchetes automáticas sobre transferências, resultados e comunicados. Use a IA para gerar narrações épicas!',
    examples: [
      { label: '📰 Manchetes', detail: 'Notícias geradas automaticamente sobre seu clube' },
      { label: '🤖 Narração IA', detail: 'Clique para gerar narrações cinematográficas' },
      { label: '📢 Comunicados', detail: 'Avisos importantes da administração do jogo' },
    ],
    reward: 0,
    color: 'text-blue-400',
  },
  {
    icon: Users,
    title: 'Elenco & Jogadores 👥',
    tab: 'squad',
    description: 'Gerencie cada jogador: atributos detalhados (16 stats), contratos, fadiga, moral individual. Descanse jogadores cansados e renove contratos antes que expirem!',
    examples: [
      { label: '⭐ OVR & Atributos', detail: '16 atributos como Velocidade, Finalização, Visão, Compostura...' },
      { label: '😴 Fadiga & Descanso', detail: 'Jogadores cansados rendem -20%. Use "Descansar" para recuperar' },
      { label: '📝 Contratos', detail: 'Renove antes de expirar ou perde o jogador de graça!' },
    ],
    reward: 0,
    color: 'text-green-400',
  },
  {
    icon: Target,
    title: 'Táticas & Formações ⚔️',
    tab: 'tactics',
    description: 'Escolha formação (4-3-3, 4-4-2, 3-5-2...), estilo (ofensivo/defensivo), pressão e tempo. Cada combinação muda completamente o resultado das partidas!',
    examples: [
      { label: '📐 Formação', detail: '4-3-3, 4-4-2, 3-5-2, 5-3-2 e mais — cada uma com pontos fortes' },
      { label: '⚔️ Estilo', detail: 'Ofensivo → mais gols mas sofre mais. Contra-ataque → explosivo' },
      { label: '🔥 Pressão & Tempo', detail: 'Pressão alta cansa mas rouba bolas. Tempo rápido = mais chances' },
    ],
    reward: 0,
    color: 'text-red-400',
  },
  {
    icon: Dumbbell,
    title: 'Treinos Táticos 2D 🎮',
    tab: 'training',
    description: 'Simulações táticas interativas! Pratique Pênaltis, Faltas, Cruzamentos, Contra-Ataques e Pressão. Cada treino dá bônus temporários para a próxima partida!',
    examples: [
      { label: '🎯 Pênaltis', detail: '10 cobranças com física realista — pratique o ângulo perfeito' },
      { label: '⚡ Contra-Ataque', detail: 'Simule transições rápidas e ganhe +2 em Velocidade temporário' },
      { label: '📐 Cruzamentos', detail: 'Treine jogadas pela ponta e ganhe bônus em Cruzamento' },
    ],
    reward: 0,
    color: 'text-orange-400',
  },
  {
    icon: ShoppingCart,
    title: 'Mercado Online 🛒',
    tab: 'market',
    description: 'Compre e venda jogadores com outros managers reais! Faça propostas com bônus por gols, títulos e assistências. Negocie empréstimos para reduzir custos.',
    examples: [
      { label: '🔍 Buscar', detail: 'Filtre por posição, OVR, idade e preço no mercado global' },
      { label: '💼 Negociar', detail: 'Oferte preço + salário + bônus por performance' },
      { label: '🔄 Empréstimos', detail: 'Empreste jogadores para economizar ou reforçar temporariamente' },
    ],
    reward: 0,
    color: 'text-yellow-400',
  },
  {
    icon: Gamepad2,
    title: 'Partidas & Simulação ⚽',
    tab: 'matches',
    description: 'Partidas em tempo real com narração detalhada e lances 2D animados! Gols, pênaltis, contra-ataques, cruzamentos e cobranças de falta — tudo visualizado em 2D.',
    examples: [
      { label: '📺 Narração', detail: 'Texto detalhado minuto a minuto com emoção de rádio' },
      { label: '🎬 Lances 2D', detail: 'Animações de gols, defesas, trave, contra-ataques e faltas' },
      { label: '📊 Estatísticas', detail: 'Posse, chutes, escanteios, faltas — tudo em tempo real' },
    ],
    reward: 0,
    color: 'text-emerald-400',
  },
  {
    icon: Globe,
    title: 'Liga Online & Torneios 🌍',
    tab: 'league',
    description: 'Entre na liga automática do seu país e dispute contra managers reais! Campeonatos com rodadas, tabela, chat, propostas diretas e premiações.',
    examples: [
      { label: '🏆 Auto-Liga', detail: 'O jogo te inscreve automaticamente em liga competitiva' },
      { label: '💬 Chat & Propostas', detail: 'Negocie jogadores e converse diretamente com rivais' },
      { label: '🎖️ Torneios', detail: 'Campeonatos especiais com grupos, mata-mata e premiação' },
    ],
    reward: 0,
    color: 'text-cyan-400',
  },
  {
    icon: Building2,
    title: 'Infraestrutura & Estádio 🏟️',
    tab: 'infra',
    description: 'Evolua CT, Fisioterapia, Base e Estádio até nível 15! Cada upgrade traz benefícios reais: treino mais eficiente, recuperação acelerada e mais receita.',
    examples: [
      { label: '🏟️ Estádio', detail: 'Até 120k lugares → mais receita por jogo disputado' },
      { label: '🏋️ CT', detail: 'Nível maior = evolução de atributos mais rápida' },
      { label: '🏥 Fisioterapia', detail: 'Lesões duram menos dias com nível alto' },
    ],
    reward: 0,
    color: 'text-purple-400',
  },
  {
    icon: Trophy,
    title: 'Ranking & Conquistas 🏅',
    tab: 'ranking',
    description: 'Suba no ranking global com vitórias! Complete conquistas únicas e colecione troféus de títulos conquistados. Dispute o topo!',
    examples: [
      { label: '📈 Ranking', detail: 'Vitórias dão pontos, derrotas tiram. Suba divisões!' },
      { label: '🏅 Conquistas', detail: '100 gols, 10 vitórias seguidas, campeão invicto e mais' },
      { label: '🏆 Troféus', detail: 'Títulos de liga ficam eternizados na galeria do clube' },
    ],
    reward: 0,
    color: 'text-amber-400',
  },
];

const TOTAL_REWARD = 200000;

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



  const tabDisplayName = (tab: string) => {
    const map: Record<string, string> = {
      dashboard: 'Dashboard', journal: 'Jornal', squad: 'Elenco',
      tactics: 'Táticas', training: 'Treinos', market: 'Mercado',
      matches: 'Partidas', league: 'Liga', infra: 'Infraestrutura', ranking: 'Ranking',
    };
    return map[tab] || tab;
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-3 right-3 z-[60] w-[min(360px,calc(100vw-1.5rem))] max-h-[min(560px,calc(100vh-1.5rem))] overflow-hidden rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl shadow-black/30 animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col">
      <div className="overflow-y-auto smooth-scroll">
        <div className="p-4 space-y-3">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
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
                <h2 className="text-base font-semibold leading-none tracking-tight">{current.title}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="secondary" className="text-[9px] gap-0.5 h-4">
                    📍 Aba: {tabDisplayName(current.tab)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {current.description}
          </p>

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

          <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-[10px] text-yellow-300">Recompensa ao concluir:</span>
            </div>
            <span className="text-xs font-bold text-yellow-400">R$ 200.000</span>
          </div>

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
      </div>
    </div>
  );
}
