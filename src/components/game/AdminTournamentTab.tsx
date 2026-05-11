import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Swords, Zap, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  userId: string;
}

export function AdminTournamentTab({ userId }: Props) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('national-cup-manager', {
        body: { action }
      });
      if (error) throw error;
      toast.success('Operação realizada com sucesso!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Controle de Copas Nacionais
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="text-xs h-10 gap-2"
            onClick={() => handleAction('generate_all_national_cups')}
            disabled={loading}
          >
            <Zap className="h-3 w-3" /> Gerar Todas (Dia 10)
          </Button>
          <Button 
            variant="outline" 
            className="text-xs h-10 gap-2"
            disabled={loading}
            onClick={() => handleAction('advance_phase')}
          >
            <RefreshCw className="h-3 w-3" /> Simular Rodada / Avançar
          </Button>
          <Button 
            variant="destructive" 
            className="text-xs h-10 gap-2"
            disabled={loading}
            onClick={() => handleAction('reset_cups')}
          >
            <RefreshCw className="h-3 w-3" /> Reiniciar Copas
          </Button>
        </CardContent>
      </Card>
      
      {loading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
