import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Player } from '@/types/game';
import { getPlayerBaseValue } from '@/utils/playerGenerator';
import { formatMoney } from '@/lib/formatMoney';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  player: Player | null;
  transferBudgetAvailable: number;
  onClose: () => void;
  onConfirm: (player: Player, fee: number) => Promise<void> | void;
}

export function calcRescissionFee(player: Player): number {
  const baseValue = getPlayerBaseValue(player);
  const monthsLeft = Math.min((player.contract || 0) * 12, 24);
  const salaryWeight = (player.salary || 0) * monthsLeft * 0.5;
  const valueWeight = baseValue * 0.4;
  return Math.floor(valueWeight + salaryWeight);
}

export function RescindModal({ player, transferBudgetAvailable, onClose, onConfirm }: Props) {
  const [submitting, setSubmitting] = useState(false);
  if (!player) return null;

  const fee = calcRescissionFee(player);
  const baseValue = getPlayerBaseValue(player);
  const feePercent = baseValue > 0 ? Math.round((fee / baseValue) * 100) : 0;
  const canAfford = transferBudgetAvailable >= fee;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(player, fee);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!player} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <X className="h-5 w-5" /> Rescindir contrato
          </DialogTitle>
          <DialogDescription>
            Você está prestes a rescindir o contrato de <span className="font-bold text-foreground">{player.name}</span>.
            Ele será liberado e entrará no <span className="font-bold text-foreground">Mercado Livre</span> após 24h de cooldown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Valor base do jogador</span>
              <span className="font-bold">{formatMoney(baseValue)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Salário mensal</span>
              <span className="font-bold">{formatMoney(player.salary || 0)}/mês</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Contrato restante</span>
              <span className="font-bold">{player.contract || 0} ano(s)</span>
            </div>
            <div className="border-t border-destructive/20 pt-2 mt-1 flex justify-between">
              <span className="text-sm font-semibold text-destructive">Taxa de rescisão</span>
              <div className="text-right">
                <p className="text-base font-black text-destructive">{formatMoney(fee)}</p>
                <p className="text-[9px] text-muted-foreground">~{feePercent}% do valor base</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/30 bg-muted/30 p-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Verba de transferências disponível</span>
              <span className={`font-bold ${canAfford ? 'text-emerald-400' : 'text-destructive'}`}>{formatMoney(transferBudgetAvailable)}</span>
            </div>
            {!canAfford && (
              <p className="text-[10px] text-destructive flex items-center gap-1.5 pt-1">
                <AlertTriangle className="h-3 w-3" /> Verba de transferências insuficiente para rescindir.
              </p>
            )}
          </div>

          {(player.personality === 'lider' || player.personality === 'leal') && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-400 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                <strong>Aviso de moral:</strong> {player.name} é {player.personality === 'lider' ? 'líder' : 'leal'} ao clube.
                Outros jogadores podem perder moral com essa rescisão.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!canAfford || submitting}>
            {submitting ? 'Rescindindo...' : 'Confirmar rescisão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
