import { Infrastructure, getStadiumCapacity, getStadiumUpgradeCost } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Landmark, ArrowUp, Users, Ticket, DollarSign, TrendingUp } from 'lucide-react';

interface Props {
  infrastructure: Infrastructure;
  budget: number;
  fans: number;
  stadiumName: string;
  ticketPrice: number;
  reputation: number;
  onUpgrade: (facility: 'stadium') => void;
  onSetTicketPrice: (price: number) => void;
  onRenameStadium: (name: string) => void;
}

function getStadiumMatchRevenue(level: number, fans: number, ticketPrice: number): number {
  const capacity = getStadiumCapacity(level);
  const attendance = Math.min(capacity, Math.floor(fans * 0.1));
  return attendance * ticketPrice;
}

export function StadiumTab({ infrastructure, budget, fans, stadiumName, ticketPrice, reputation, onUpgrade, onSetTicketPrice, onRenameStadium }: Props) {
  const stadium = infrastructure?.stadium ?? { level: 1, maxLevel: 10 };
  const cost = getStadiumUpgradeCost(stadium.level);
  const isMaxed = stadium.level >= stadium.maxLevel;
  const capacity = getStadiumCapacity(stadium.level);
  const attendance = Math.min(capacity, Math.floor(fans * 0.1));
  const matchRevenue = getStadiumMatchRevenue(stadium.level, fans, ticketPrice);
  const occupancy = capacity > 0 ? Math.round((attendance / capacity) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Stadium Header */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-emerald-400" />
            {stadiumName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{capacity.toLocaleString()}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Capacidade</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <Users className="h-4 w-4 mx-auto mb-1 text-emerald-400" />
              <p className="text-lg font-bold">{attendance.toLocaleString()}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Público Médio</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{occupancy}%</p>
              <p className="text-[9px] text-muted-foreground uppercase">Ocupação</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <DollarSign className="h-4 w-4 mx-auto mb-1 text-emerald-400" />
              <p className="text-lg font-bold">R${(matchRevenue / 1000).toFixed(0)}k</p>
              <p className="text-[9px] text-muted-foreground uppercase">Receita/Jogo</p>
            </div>
          </div>

          {/* Level & Upgrade */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Nível {stadium.level}/{stadium.maxLevel}</span>
              <Progress value={(stadium.level / stadium.maxLevel) * 100} className="flex-1 h-3" />
            </div>
            <div className="flex items-center gap-2">
              {Array.from({ length: stadium.maxLevel }, (_, i) => (
                <div
                  key={i}
                  className={`h-3 flex-1 rounded-sm ${i < stadium.level ? 'bg-emerald-500' : 'bg-muted'}`}
                />
              ))}
            </div>
            {!isMaxed ? (
              <Button onClick={() => onUpgrade('stadium')} disabled={budget < cost} className="w-full gap-2">
                <ArrowUp className="h-4 w-4" />
                Expandir para Nível {stadium.level + 1} — R$ {(cost / 1000000).toFixed(2)}M
              </Button>
            ) : (
              <p className="text-sm text-center text-emerald-400 font-semibold py-2">✅ Estádio no Nível Máximo!</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ticket Price */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Preço do Ingresso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Ajuste o preço dos ingressos. Preços altos geram mais receita mas podem afastar torcedores se o time não performar bem.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground whitespace-nowrap">R$</span>
            <Input
              type="number"
              min={5}
              max={200}
              value={ticketPrice}
              onChange={e => onSetTicketPrice(Number(e.target.value))}
              className="w-24"
            />
            <div className="flex gap-1.5 flex-wrap">
              {[20, 40, 60, 80, 100].map(p => (
                <Button
                  key={p}
                  size="sm"
                  variant={ticketPrice === p ? 'default' : 'outline'}
                  className="h-7 px-2 text-[10px]"
                  onClick={() => onSetTicketPrice(p)}
                >
                  R${p}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Receita estimada por jogo: <span className="text-primary font-bold">R$ {matchRevenue.toLocaleString()}</span> ({attendance.toLocaleString()} pagantes × R${ticketPrice})
          </p>
        </CardContent>
      </Card>

      {/* Rename Stadium */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Landmark className="h-5 w-5 text-muted-foreground" />
            Renomear Estádio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              defaultValue={stadiumName}
              placeholder="Nome do estádio"
              id="stadium-name-input"
              className="flex-1"
            />
            <Button onClick={() => {
              const input = document.getElementById('stadium-name-input') as HTMLInputElement;
              if (input?.value) onRenameStadium(input.value);
            }}>
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stadium Benefits Info */}
      <Card className="border-muted/30">
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-bold uppercase text-muted-foreground">📋 Capacidade por Nível</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {[
              { level: '1-6', benefit: '5k→30k lugares — Expansão: R$ 5M/nível' },
              { level: '7-13', benefit: '40k→100k lugares — Expansão: R$ 10M/nível' },
              { level: '14-15', benefit: '110k→120k lugares — Expansão: R$ 20M/nível' },
            ].map(item => (
              <div key={item.level} className="flex gap-2 items-start">
                <span className="text-[9px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">Nv.{item.level}</span>
                <p className="text-[10px] text-muted-foreground">{item.benefit}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
