import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlaskConical, Play, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  adminUserId: string;
}

export function SimulationValidationTab({ adminUserId }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSimulation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('legacy-auto-sim', {
        body: { admin_id: adminUserId }
      });
      if (error) throw error;
      toast.success(`Simulação concluída! ${data?.processed_matches || 0} partidas processadas.`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao simular');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" /> Motor de Simulação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted/20 border border-border/50 rounded-lg space-y-2">
            <p className="text-[10px] text-muted-foreground">
              A simulação ocorre automaticamente a cada 15-30 minutos, mas você pode forçar o processamento de partidas pendentes (atrasadas) aqui.
            </p>
            <Button 
              variant="outline" 
              className="w-full h-9 text-xs font-bold gap-2 border-primary/50 text-primary hover:bg-primary/10"
              onClick={handleSimulation}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Simular Partidas Pendentes
            </Button>
          </div>

          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
            <h4 className="text-[10px] font-bold text-emerald-500 flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="h-3 w-3" /> Status do Motor
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Simulador Automático:</span>
              <span className="text-[10px] font-bold text-emerald-500">OPERACIONAL</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
