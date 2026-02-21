import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Loader2 } from 'lucide-react';
import { ShieldCrest } from './ShieldCrest';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SquadPlayer {
  id: string;
  name: string;
  position: string;
  age: number;
  isLoanedOut: boolean;
  isLoanedIn: boolean;
}

interface Props {
  sellerId: string;
  sellerClubName: string;
  sellerShield?: { primaryColor: string; secondaryColor: string; pattern: string; shape?: string } | null;
  onBack: () => void;
}

const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
};

const posOrder = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

export function SellerTeamView({ sellerId, sellerClubName, sellerShield, onBack }: Props) {
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [clubName, setClubName] = useState(sellerClubName);
  const [shield, setShield] = useState(sellerShield);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await supabase.functions.invoke('get-seller-squad', {
        body: { sellerId },
      });

      if (res.error || res.data?.error) {
        toast.error(res.data?.error || 'Erro ao carregar time');
        setLoading(false);
        return;
      }

      setSquad(res.data.squad || []);
      setClubName(res.data.clubName || sellerClubName);
      if (res.data.shield) setShield(res.data.shield);
      setLoading(false);
    };
    load();
  }, [sellerId, sellerClubName]);

  const sortedSquad = [...squad].sort((a, b) => {
    const posA = posOrder.indexOf(a.position);
    const posB = posOrder.indexOf(b.position);
    if (posA !== posB) return posA - posB;
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Carregando elenco...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Mercado
      </Button>

      {/* Team Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            {shield ? (
              <ShieldCrest
                primaryColor={shield.primaryColor}
                secondaryColor={shield.secondaryColor}
                pattern={shield.pattern}
                shape={(shield.shape as any) || 'classic'}
                size={48}
              />
            ) : (
              <span className="text-3xl">⚽</span>
            )}
            <div>
              <h2 className="text-lg font-bold">{clubName}</h2>
              <p className="text-xs text-muted-foreground">{squad.length} jogadores</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Squad */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" /> Elenco
            <Badge variant="outline" className="text-[9px] ml-2">OVR oculto</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {sortedSquad.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/20 hover:bg-muted/40 transition-colors">
                <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[p.position] || 'bg-muted'}`}>{p.position}</span>
                <span className="text-xs font-medium flex-1 truncate">{p.name}</span>
                <span className="text-[10px] text-muted-foreground">{p.age} anos</span>
                <span className="text-xs font-bold w-8 text-right text-muted-foreground">???</span>
                {p.isLoanedIn && (
                  <Badge variant="outline" className="text-[7px] border-blue-500/30 text-blue-400 px-1 py-0">EMPRESTADO</Badge>
                )}
                {p.isLoanedOut && (
                  <Badge variant="outline" className="text-[7px] border-orange-500/30 text-orange-400 px-1 py-0">CEDIDO</Badge>
                )}
              </div>
            ))}
          </div>
          {squad.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum jogador encontrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
