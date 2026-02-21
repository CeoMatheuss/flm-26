import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, Users, Swords, ShoppingCart, Trophy, 
  Building2, GraduationCap, ChevronRight, ChevronLeft, X, Sparkles, Coins
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const steps = [
  {
    icon: Sparkles,
    title: 'Bem-vindo ao FLM 26! ⚽',
    description: 'Você agora é o manager de um clube de futebol! Seu objetivo é construir o melhor time, conquistar títulos e subir no ranking.',
    tips: ['Explore cada aba para conhecer as ferramentas', 'Salve seu progresso com frequência', 'Acompanhe as finanças para não falir!'],
    reward: 50000,
    color: 'text-primary',
  },
  {
    icon: LayoutDashboard,
    title: 'Painel & Jornal',
    description: 'O Painel mostra um resumo do seu clube: próximos jogos, eventos e notícias. O Jornal traz as manchetes da temporada.',
    tips: ['Fique de olho nos eventos aleatórios', 'Jogadores podem se lesionar ou protestar'],
    reward: 50000,
    color: 'text-blue-400',
  },
  {
    icon: Users,
    title: 'Elenco & Treinos',
    description: 'Gerencie seus jogadores: veja atributos, renove contratos, descanse quem está cansado e defina focos de treino individuais.',
    tips: ['Cada jogador tem uma personalidade que afeta o comportamento', 'Jogadores jovens evoluem mais rápido', 'Goleiros usam o atributo "Defesa de Goleiro"'],
    reward: 75000,
    color: 'text-green-400',
  },
  {
    icon: Swords,
    title: 'Partidas & Táticas',
    description: 'Simule partidas da liga. Configure sua formação, estilo de jogo e pressão na aba Táticas antes de jogar.',
    tips: ['Táticas ofensivas marcam mais gols mas sofrem mais', 'A força do elenco é o fator principal'],
    reward: 75000,
    color: 'text-red-400',
  },
  {
    icon: ShoppingCart,
    title: 'Mercado & Olheiros',
    description: 'Compre e venda jogadores. Contrate olheiros para revelar atributos de agentes livres (que ficam ocultos).',
    tips: ['Agentes livres têm OVR oculto — use olheiros!', 'Liste jogadores para venda na aba Elenco'],
    reward: 75000,
    color: 'text-yellow-400',
  },
  {
    icon: GraduationCap,
    title: 'Base (Academia)',
    description: 'Invista na base para gerar jovens talentos a cada 4 rodadas. Quanto maior o investimento, mais jogadores aparecem.',
    tips: ['O nível da academia determina a qualidade', 'Promova jovens ao time principal quando estiverem prontos'],
    reward: 75000,
    color: 'text-purple-400',
  },
  {
    icon: Building2,
    title: 'Infraestrutura & Estádio',
    description: 'Melhore CT, fisioterapia, academia e estádio. Cada upgrade traz benefícios: treino mais rápido, recuperação melhor, mais torcedores.',
    tips: ['Estádio vai até nível 15 (120k lugares)', 'CT mais forte = jogadores evoluem mais rápido'],
    reward: 50000,
    color: 'text-cyan-400',
  },
  {
    icon: Trophy,
    title: 'Liga, Ranking & Multiplayer',
    description: 'Dispute a liga de 20 times, suba no ranking online e entre em ligas multiplayer para jogar contra outros managers reais!',
    tips: ['Vitórias dão pontos de ranking', 'Derrotas tiram pontos', 'Ranking reflete o momento real do time'],
    reward: 50000,
    color: 'text-amber-400',
  },
];

const TOTAL_REWARD = steps.reduce((sum, s) => sum + s.reward, 0);

export function TutorialModal({ open, onClose, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const Icon = current.icon;

  const handleFinish = () => {
    onComplete?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className={`p-6 bg-gradient-to-br from-${current.color.replace('text-', '')}/10 to-transparent`}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px]">
                {step + 1} / {steps.length}
              </Badge>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground" onClick={onClose}>
                <X className="h-3 w-3 mr-1" /> Pular tutorial
              </Button>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <div className={`p-3 rounded-xl bg-card border border-border/50`}>
                <Icon className={`h-8 w-8 ${current.color}`} />
              </div>
              <div>
                <DialogTitle className="text-lg">{current.title}</DialogTitle>
                <div className="flex items-center gap-1 mt-1">
                  <Coins className="h-3 w-3 text-yellow-400" />
                  <span className="text-[10px] text-yellow-400 font-bold">+R${current.reward.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
            {current.description}
          </p>

          <div className="mt-4 space-y-2">
            {current.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                <span className="text-primary text-xs mt-0.5">💡</span>
                <p className="text-xs">{tip}</p>
              </div>
            ))}
          </div>

          {/* Reward banner */}
          <div className="mt-4 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-yellow-400" />
              <span className="text-[10px] text-yellow-300">Complete tudo e ganhe:</span>
            </div>
            <span className="text-xs font-bold text-yellow-400">R${TOTAL_REWARD.toLocaleString('pt-BR')}</span>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1 mt-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted/50'}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="h-8 text-xs"
            >
              <ChevronLeft className="h-3 w-3 mr-1" /> Anterior
            </Button>

            {step < steps.length - 1 ? (
              <Button size="sm" onClick={() => setStep(s => s + 1)} className="h-8 text-xs">
                Próximo <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleFinish} className="h-8 text-xs bg-green-600 hover:bg-green-700">
                🎮 Ganhar R$500k e Jogar!
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
