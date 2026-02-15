import { Sponsor, SponsorOffer, sponsorTypeLabels, generateSponsorOffers } from '@/types/sponsor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Handshake, Plus, DollarSign } from 'lucide-react';

interface Props {
  sponsors: Sponsor[];
  offers: SponsorOffer[];
  reputation: number;
  onAccept: (offer: SponsorOffer) => void;
  onRefreshOffers: () => void;
}

export function SponsorsTab({ sponsors, offers, reputation, onAccept, onRefreshOffers }: Props) {
  const totalMonthly = sponsors.reduce((s, sp) => s + sp.monthlyPay, 0);
  const atLimit = sponsors.length >= 3;

  return (
    <div className="space-y-6">
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2"><Handshake className="h-5 w-5" /> Patrocinadores ({sponsors.length}/3)</span>
            <span className="text-sm font-normal text-muted-foreground">Receita mensal: <span className="text-primary font-bold">R$ {(totalMonthly / 1000).toFixed(0)}k</span></span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sponsors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum patrocinador ativo. Aceite ofertas abaixo!</p>
          ) : (
            <div className="space-y-2">
              {sponsors.map(sp => (
                <div key={sp.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Badge variant="secondary" className="text-xs">{sponsorTypeLabels[sp.type]}</Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{sp.name}</p>
                    <p className="text-xs text-muted-foreground">{sp.duration} temporada(s) restante(s)</p>
                  </div>
                  <p className="text-sm font-bold text-primary">R$ {(sp.monthlyPay / 1000).toFixed(0)}k/mês</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Ofertas Disponíveis</span>
            <Button size="sm" variant="outline" onClick={onRefreshOffers}>Buscar Novas</Button>
          </CardTitle>
          <p className="text-xs text-muted-foreground">Sua reputação: {reputation} — Quanto maior, melhores os patrocínios</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {offers.map(offer => (
              <div key={offer.id} className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                <Badge className="text-xs">{sponsorTypeLabels[offer.type]}</Badge>
                <div className="flex-1">
                  <p className="font-medium text-sm">{offer.name}</p>
                  <p className="text-xs text-muted-foreground">{offer.duration} temporada(s) • Rep. mín: {offer.minReputation}</p>
                </div>
                <p className="text-sm font-bold text-primary">R$ {(offer.monthlyPay / 1000).toFixed(0)}k/mês</p>
                <Button size="sm" onClick={() => onAccept(offer)} disabled={reputation < offer.minReputation || atLimit}>
                  <Plus className="h-3 w-3 mr-1" /> {atLimit ? 'Limite' : 'Aceitar'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
