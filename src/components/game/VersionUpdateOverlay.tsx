import { Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VersionState } from '@/hooks/useVersionGuard';

interface Props {
  state: VersionState;
  onRollback?: () => void;
}

/**
 * Overlay full-screen exibido enquanto o sistema executa migrations.
 * Bloqueia interação com o jogo (simulação, transferências, etc).
 */
export function VersionUpdateOverlay({ state, onRollback }: Props) {
  if (state.status === 'ready' || state.status === 'checking') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          {state.status === 'failed' ? (
            <AlertTriangle className="h-8 w-8 text-destructive" />
          ) : state.status === 'observation' ? (
            <ShieldCheck className="h-8 w-8 text-success" />
          ) : (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          )}
          <div>
            <h2 className="text-lg font-bold">
              {state.status === 'failed'
                ? 'Falha na atualização'
                : state.status === 'observation'
                ? 'Atualização concluída'
                : 'Atualizando seu jogo...'}
            </h2>
            <Badge variant="outline" className="mt-1 text-xs">
              {state.userVersion} → {state.gameVersion}
            </Badge>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{state.progressLabel}</p>

        {state.status === 'migrating' && (
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 border border-border/40">
            ⚠️ Não feche esta janela. Suas ações estão temporariamente bloqueadas para garantir a integridade dos seus dados.
          </div>
        )}

        {state.status === 'failed' && (
          <>
            {state.error && (
              <div className="text-xs bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-destructive">
                {state.error}
              </div>
            )}
            <div className="flex gap-2">
              {onRollback && (
                <Button variant="outline" className="flex-1" onClick={onRollback}>
                  Restaurar backup
                </Button>
              )}
              <Button className="flex-1" onClick={() => window.location.reload()}>
                Tentar novamente
              </Button>
            </div>
          </>
        )}

        {state.status === 'observation' && (
          <Button className="w-full" onClick={() => window.location.reload()}>
            Continuar
          </Button>
        )}
      </div>
    </div>
  );
}
