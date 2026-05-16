import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw, Loader2, Zap, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  adminUserId: string;
}

export function SeasonControlTab({ adminUserId }: Props) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: string) => {
    setLoading(true);
    try {
      if (action === 'reset_all_leagues') {
        if (!confirm('ATENÇÃO: Isso vai deletar partidas e estatísticas do mês atual e regenerar TUDO. Deseja continuar?')) {
          setLoading(false);
          return;
        }
        
        const { data, error } = await supabase.functions.invoke('world-leagues-reset', {
          body: { admin_id: adminUserId }
        });
        
        if (error) throw error;
        toast.success(`Ligas regeneradas com sucesso! ${data.total_simulated} jogos simulados.`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao processar ação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Controle de Temporada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <h4 className="text-xs font-bold text-destructive flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Zona de Perigo
            </h4>
            <p className="text-[10px] text-muted-foreground mb-3">
              A regeneração deleta o calendário atual e cria um novo do zero, mantendo os times mas reiniciando a progressão.
            </p>
            <Button 
              variant="destructive" 
              className="w-full h-9 text-xs font-bold gap-2"
              onClick={() => handleAction('reset_all_leagues')}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Regenerar Ligas (Reset Total)
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
             <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <h4 className="text-xs font-bold text-primary flex items-center gap-1.5 mb-1">
                  <Zap className="h-3.5 w-3.5" /> Próxima Temporada
                </h4>
                <p className="text-[10px] text-muted-foreground mb-3">
                  As ligas são criadas automaticamente no dia 1. Use a aba "Prévia Ligas" para gerenciar.
                </p>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
