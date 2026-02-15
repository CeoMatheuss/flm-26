import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Crown, Zap, Handshake, Users, TrendingUp, Star, Gift, ShieldCheck, Copy, CheckCircle, QrCode } from 'lucide-react';
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
    description: 'Inclui: R$ 1M + 3.000 torcedores + patrocínio de R$ 200k/mês + acesso Leilão',
    icon: Crown,
    gameBonus: 'Tudo incluso',
    priceReal: 40,
    promoPrice: 29,
    tag: '👑 Melhor Valor',
  },
];

const PIX_KEY = '069984951996';

interface Props {
  userId: string;
  clubName: string;
  budget: number;
  isPremium: boolean;
  onPremiumRequest: () => void;
}

export function PremiumTab({ userId, clubName, budget, isPremium, onPremiumRequest }: Props) {
  const [selectedItem, setSelectedItem] = useState<PremiumItem | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);

  const copyPix = () => {
    navigator.clipboard.writeText(PIX_KEY);
    setPixCopied(true);
    toast.success('Chave PIX copiada!');
    setTimeout(() => setPixCopied(false), 3000);
  };

  const handleBuy = (item: PremiumItem) => {
    setSelectedItem(item);
  };

  const handleConfirmPayment = async () => {
    if (!selectedItem) return;
    setPendingRequest(true);

    // Register premium request as pending
    const { error } = await supabase.from('premium_users').upsert([{
      user_id: userId,
      status: 'pending',
      pix_transaction_id: `${selectedItem.id}_${Date.now()}`,
    }], { onConflict: 'user_id' });

    if (error) {
      toast.error('Erro ao registrar pagamento');
    } else {
      toast.success('✅ Pagamento registrado! Aguarde a confirmação do administrador para liberar o Premium.', { duration: 8000 });
      onPremiumRequest();
    }
    setPendingRequest(false);
    setSelectedItem(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 via-amber-500/5 to-orange-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent font-black">
                PREMIUM
              </span>
            </CardTitle>
            {isPremium && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">
                <CheckCircle className="h-3 w-3 mr-1" /> ATIVO
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isPremium
              ? `${clubName} é Premium! Aproveite todas as vantagens exclusivas e o acesso ao Leilão.`
              : `Turbine o ${clubName} com vantagens exclusivas! Pague via PIX e tenha acesso ao Leilão de Jogadores.`}
          </p>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1 text-yellow-500">
              <Zap className="h-3 w-3" /> Ativação após confirmação
            </div>
            <div className="flex items-center gap-1 text-green-500">
              <Gift className="h-3 w-3" /> Promoções Ativas
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PIX Payment Modal */}
      {selectedItem && (
        <Card className="border-yellow-500/50 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <QrCode className="h-4 w-4 text-yellow-500" /> Pagamento via PIX
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Item selecionado</p>
              <p className="text-sm font-bold">{selectedItem.name}</p>
              <p className="text-lg font-black text-yellow-400 mt-1">
                R$ {selectedItem.promoPrice || selectedItem.priceReal},00
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold">Chave PIX (Celular):</p>
              <div className="flex items-center gap-2">
                <Input
                  value={PIX_KEY}
                  readOnly
                  className="text-xs h-9 font-mono bg-muted/30"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 shrink-0"
                  onClick={copyPix}
                >
                  {pixCopied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="bg-yellow-500/10 rounded-lg p-2.5 text-[10px] text-yellow-300 space-y-1">
              <p className="font-bold">📋 Instruções:</p>
              <p>1. Copie a chave PIX acima</p>
              <p>2. Faça o pagamento de <strong>R$ {selectedItem.promoPrice || selectedItem.priceReal},00</strong></p>
              <p>3. Clique em "Já Paguei" abaixo</p>
              <p>4. Aguarde a confirmação do administrador</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-xs"
                onClick={() => setSelectedItem(null)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1 h-9 text-xs font-bold bg-yellow-500 hover:bg-yellow-600 text-black"
                onClick={handleConfirmPayment}
                disabled={pendingRequest}
              >
                {pendingRequest ? 'Registrando...' : '✅ Já Paguei'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                  disabled={isPremium}
                >
                  {isPremium ? 'Ativo ✓' : 'Comprar via PIX'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-[9px] text-center text-muted-foreground/50">
        Pagamentos via PIX. Após o pagamento, o administrador confirmará e seu Premium será ativado.
      </p>
    </div>
  );
}
