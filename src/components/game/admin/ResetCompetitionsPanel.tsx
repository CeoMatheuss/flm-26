import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RotateCcw, Loader2, ShieldAlert } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props { adminUserId: string }

export function ResetCompetitionsPanel({ adminUserId }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleReset = async () => {
    if (confirmText !== 'RESETAR') {
      toast.error('Digite RESETAR para confirmar');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_reset_real_clubs' as any, {
        p_admin_id: adminUserId,
        p_confirmation_token: 'CONFIRM_RESET_REAL_CLUBS',
      });
      if (error) throw error;
      setLastResult(data);
      toast.success('Reset concluído com sucesso');
      setOpen(false);
      setConfirmText('');
    } catch (e: any) {
      toast.error('Falha no reset: ' + (e?.message ?? 'erro'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          Reset de Competições (Clubes Reais)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-2">
          <p className="font-semibold flex items-center gap-1 text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" /> Ação irreversível
          </p>
          <p className="text-muted-foreground">Zera apenas dados competitivos de clubes controlados por jogadores reais:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            <li>Ranking global de clubes e de jogadores</li>
            <li>Histórico de partidas e relatórios</li>
            <li>Vitórias, empates, derrotas, pontos, títulos da temporada</li>
            <li>Tabelas de ligas, copas, torneios e competições internacionais</li>
            <li>Estatísticas de jogadores (gols, assistências, notas)</li>
            <li>Remove duplicatas de histórico</li>
          </ul>
          <p className="font-semibold text-foreground pt-1">Preserva: contas, clubes, elencos, finanças, configurações e times bots.</p>
        </div>

        <Button
          variant="destructive"
          className="w-full"
          onClick={() => setOpen(true)}
          disabled={loading}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Resetar Rankings e Partidas
        </Button>

        {lastResult?.backup && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <p className="font-semibold mb-1">Snapshot do último reset</p>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(lastResult.backup as Record<string, number>).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{k}</span>
                  <Badge variant="secondary" className="font-mono">{v}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmText(''); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirmar reset completo
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>Esta ação <strong>não pode ser desfeita</strong>. Todos os rankings, partidas e estatísticas dos clubes reais serão zerados.</p>
                  <p>Digite <code className="px-1 py-0.5 bg-muted rounded font-bold">RESETAR</code> para confirmar:</p>
                  <Input
                    autoFocus
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="RESETAR"
                    className="font-mono"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleReset(); }}
                disabled={loading || confirmText !== 'RESETAR'}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resetando...</> : 'Confirmar reset'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
