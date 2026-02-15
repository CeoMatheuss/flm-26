import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Handshake, Users, TrendingUp, Star, Gift, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface PremiumItem {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  gameBonus: string;
  priceReal: number;
  promoPrice?: number;
  tag?: string;
}

const premiumItems: PremiumItem[] = [
  {
    id: 'sponsor_special',
    name: 'Patrocínio Especial',
    description: 'Receba um patrocínio exclusivo que paga R$ 500.000/mês por 3 temporadas',
    icon: Handshake,
    gameBonus: '+R$ 500.000/mês',
    priceReal: 20,
    promoPrice: 15,
    tag: '🔥 Mais Popular',
  },
  {
    id: 'fans_boost',
    name: 'Pacote Torcida Fiel',
    description: 'Adicione +5.000 torcedores instantaneamente ao seu clube',
    icon: Users,
    gameBonus: '+5.000 torcedores',
    priceReal: 10,
    promoPrice: 7,
    tag: '⭐ Promoção',
  },
  {
    id: 'budget_injection',
    name: 'Aporte Financeiro',
    description: 'Receba R$ 2.000.000 de investimento imediato no orçamento',
    icon: TrendingUp,
    gameBonus: '+R$ 2.000.000',
    priceReal: 25,
    promoPrice: 19,
  },
  {
    id: 'youth_prodigy',
    name: 'Jovem Prodígio',
    description: 'Gere um jovem da base com overall 75+ garantido',
    icon: Star,
    gameBonus: 'Jogador 75+ OVR',
    priceReal: 15,
    promoPrice: 12,
    tag: '🎁 Oferta',
  },
  {
    id: 'stadium_boost',
    name: 'Expansão Express',
    description: 'Aumente a capacidade do estádio em +5.000 lugares instantaneamente',
    icon: ShieldCheck,
    gameBonus: '+5.000 capacidade',
    priceReal: 18,
    promoPrice: 14,
  },
  {
    id: 'vip_pack',
    name: 'Pacote VIP Completo',
    description: 'Inclui: R$ 1M + 3.000 torcedores + patrocínio de R$ 200k/mês',
    icon: Crown,
    gameBonus: 'Tudo incluso',
    priceReal: 40,
    promoPrice: 29,
    tag: '👑 Melhor Valor',
  },
];

interface Props {
  clubName: string;
  budget: number;
}

export function PremiumTab({ clubName, budget }: Props) {
  const handleBuy = (item: PremiumItem) => {
    toast.info(`💳 Pagamento de R$ ${item.promoPrice || item.priceReal},00 para "${item.name}" — Em breve!`, {
      description: 'O sistema de pagamentos será ativado em breve. Fique ligado!',
      duration: 5000,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 via-amber-500/5 to-orange-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent font-black">
              PREMIUM
            </span>
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Turbine seu clube com vantagens exclusivas! Todos os itens são aplicados instantaneamente ao {clubName}.
          </p>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1 text-yellow-500">
              <Zap className="h-3 w-3" /> Ativação Instantânea
            </div>
            <div className="flex items-center gap-1 text-green-500">
              <Gift className="h-3 w-3" /> Promoções Ativas
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {premiumItems.map(item => (
          <Card key={item.id} className="relative overflow-hidden border-border/50 hover:border-yellow-500/30 transition-colors">
            {item.tag && (
              <Badge className="absolute top-2 right-2 text-[8px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                {item.tag}
              </Badge>
            )}
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10 shrink-0">
                  <item.icon className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold">{item.name}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{item.description}</p>
                  <Badge variant="outline" className="mt-1.5 text-[9px] px-1.5 py-0 h-4 text-green-400 border-green-500/30">
                    {item.gameBonus}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                <div className="flex items-baseline gap-1.5">
                  {item.promoPrice ? (
                    <>
                      <span className="text-[10px] text-muted-foreground line-through">R$ {item.priceReal},00</span>
                      <span className="text-sm font-black text-yellow-400">R$ {item.promoPrice},00</span>
                    </>
                  ) : (
                    <span className="text-sm font-black text-yellow-400">R$ {item.priceReal},00</span>
                  )}
                </div>
                <Button
                  size="sm"
                  className="h-7 px-3 text-[10px] font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                  onClick={() => handleBuy(item)}
                >
                  Comprar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <p className="text-[9px] text-center text-muted-foreground/50">
        Os pagamentos são processados de forma segura. Todos os bônus são permanentes e aplicados ao seu save atual.
      </p>
    </div>
  );
}
