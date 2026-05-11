import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, RefreshCw, Play, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

export function CupsOverviewTab() {
  const [cups, setCups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('national_cups').select('*').order('country_code', { ascending: true });
    if (data) setCups(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (action: string) => {
    if (!password) {
      toast.error('Informe a senha administrativa');
      return;
    }
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('national-cup-manager', {
        body: { action, password }
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Erro na operação');
      } else {
        toast.success(data?.message || 'Operação concluída');
        load();
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro de conexão');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="game-card border-orange-500/30">
        <CardHeader className="py-3 px-4 bg-orange-500/10 border-b border-orange-500/20">
          <CardTitle className="text-xs font-black flex items-center gap-2 text-orange-500">
            <ShieldAlert className="h-4 w-4" /> PAINEL DE CONTROLE DAS COPAS NACIONAIS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Autenticação Master</label>
              <Input 
                type="password" 
                placeholder="Senha ADM" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="h-8 text-xs bg-muted/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-6">
              <Button 
                variant="default" 
                size="sm" 
                className="h-8 text-[10px] gap-1.5 font-bold uppercase"
                disabled={isProcessing}
                onClick={() => handleAction('generate_all_national_cups')}
              >
                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Gerar Copas (Dia 10)
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                className="h-8 text-[10px] gap-1.5 font-bold uppercase"
                disabled={isProcessing}
                onClick={() => handleAction('reset_cups')}
              >
                <Trash2 className="h-3 w-3" /> Reiniciar Sistema
              </Button>
            </div>
          </div>

          <div className="pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full h-8 text-[10px] gap-1.5 font-black uppercase border-primary/50 text-primary hover:bg-primary/10"
              disabled={isProcessing}
              onClick={() => handleAction('advance_phase')}
            >
              {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Avançar Rodada (Todas as Copas)
            </Button>
            <p className="text-[9px] text-muted-foreground text-center mt-2 italic">
              * A simulação é autoritativa e processa todas as partidas "Scheduled" da rodada atual.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {cups.map(c => (
          <Card key={c.id} className="game-card bg-card/40">
            <CardContent className="p-2.5">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className={`h-3 w-3 ${c.status === 'in_progress' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-[10px] font-black truncate">{c.country_code}</span>
              </div>
              <div className="flex justify-between items-center">
                <Badge variant={c.status === 'in_progress' ? 'default' : 'outline'} className="text-[8px] h-4 px-1">
                  {c.status === 'in_progress' ? `RD ${c.current_round}` : c.status}
                </Badge>
                <span className="text-[9px] text-muted-foreground font-mono">S{c.season}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}