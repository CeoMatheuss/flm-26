import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatMoney } from '@/lib/formatMoney';
import { Calendar, DollarSign, Percent, Ban, Shield, Handshake } from 'lucide-react';
import { LoanTerms, defaultLoanTerms } from '@/types/loan';

interface Props {
  isOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  player: any;
  onConfirm?: (terms: LoanTerms) => void;
  onSubmit?: (terms: LoanTerms) => void | Promise<void>;
  initialTerms?: LoanTerms;
  listedTerms?: any;
  openToOffers?: boolean;
  mode: 'setup' | 'view' | 'negotiate' | 'list';
  isOwner?: boolean;
  loading?: boolean;
}

export function LoanNegotiationModal({ isOpen, open, onClose, onOpenChange, player, onConfirm, onSubmit, initialTerms, mode, isOwner, loading }: Props) {
  const [terms, setTerms] = useState<LoanTerms>(initialTerms || defaultLoanTerms);

  const activeOpen = isOpen || open || false;
  const activeClose = onClose || (() => onOpenChange?.(false));
  const activeSubmit = (terms: LoanTerms) => {
    if (onConfirm) onConfirm(terms);
    else if (onSubmit) onSubmit(terms);
  };

  const handleSalaryBorrowerChange = (val: number) => {
    const borrower = Math.min(100, Math.max(0, val));
    setTerms(prev => ({
      ...prev,
      salaryPercentageBorrower: borrower,
      salaryPercentageOwner: 100 - borrower
    }));
  };

  const isViewOnly = mode === 'view';

  return (
    <Dialog open={activeOpen} onOpenChange={activeClose}>
      <DialogContent className="max-w-lg w-[calc(100%-1rem)] max-h-[92dvh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-zinc-800">
        <DialogHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
          <DialogTitle className="text-base sm:text-lg font-black flex items-center gap-2">
            <Handshake className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
            {mode === 'setup' || mode === 'list' ? 'Configurar Empréstimo' : 'Negociar'}
          </DialogTitle>

          <div className="flex items-center gap-2.5 mt-2">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-sm text-emerald-400 shrink-0">
              {player?.overall}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm leading-none truncate">{player?.name}</p>
              <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider font-mono truncate">
                {player?.position} • {player?.age}a • {formatMoney(player?.salary || 0)}/mês
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-5">
          <div className="space-y-3 py-2 pb-4">
            {/* Duração e Taxa */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-zinc-500 font-bold flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Duração
                </Label>
                <Select
                  disabled={isViewOnly}
                  value={terms.duration.toString()}
                  onValueChange={(v) => setTerms(p => ({ ...p, duration: Number(v) }))}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Meses</SelectItem>
                    <SelectItem value="6">6 Meses</SelectItem>
                    <SelectItem value="12">1 Temporada</SelectItem>
                    <SelectItem value="24">2 Temporadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-zinc-500 font-bold flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Taxa
                </Label>
                <div className="relative">
                  <Input
                    disabled={isViewOnly}
                    type="number"
                    inputMode="numeric"
                    value={terms.loanFee}
                    onChange={(e) => setTerms(p => ({ ...p, loanFee: Number(e.target.value) }))}
                    className="bg-zinc-900 border-zinc-800 pl-9 h-10 text-sm"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px] font-bold">FL$</span>
                </div>
              </div>
            </div>

            {/* Divisão Salarial simplificada */}
            <div className="space-y-2 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase text-zinc-500 font-bold flex items-center gap-1">
                  <Percent className="h-3 w-3" /> Salário Receptor
                </Label>
                <span className="text-sm font-black text-emerald-400">{terms.salaryPercentageBorrower}%</span>
              </div>
              <Input
                disabled={isViewOnly}
                type="range"
                min="0"
                max="100"
                step="10"
                value={terms.salaryPercentageBorrower}
                onChange={(e) => handleSalaryBorrowerChange(Number(e.target.value))}
                className="h-2 p-0 accent-emerald-500"
              />
              <p className="text-[10px] text-zinc-500 text-center">
                Receptor paga <span className="text-white font-bold">{formatMoney((player?.salary || 0) * (terms.salaryPercentageBorrower / 100))}</span>/mês
              </p>
            </div>

            {/* Opção de Compra */}
            <div className="flex items-center justify-between gap-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800">
              <Label className="text-sm font-bold">Opção de Compra</Label>
              <div className="flex items-center gap-2">
                {terms.optionalPurchasePrice !== undefined && (
                  <div className="relative w-24 sm:w-28">
                    <Input
                      disabled={isViewOnly}
                      type="number"
                      inputMode="numeric"
                      value={terms.optionalPurchasePrice}
                      onChange={(e) => setTerms(p => ({ ...p, optionalPurchasePrice: Number(e.target.value) }))}
                      className="h-8 bg-zinc-950 border-zinc-800 pl-7 text-xs"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px] font-bold">FL$</span>
                  </div>
                )}
                <Switch
                  disabled={isViewOnly}
                  checked={terms.optionalPurchasePrice !== undefined}
                  onCheckedChange={(checked) => setTerms(p => ({ ...p, optionalPurchasePrice: checked ? player?.marketValue || 1000000 : undefined }))}
                />
              </div>
            </div>

            {/* Cláusulas compactas */}
            <div className="flex items-center justify-between gap-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Ban className="h-4 w-4 text-zinc-500" /> Permitir Cancelamento
              </Label>
              <Switch
                disabled={isViewOnly}
                checked={terms.allowTermination}
                onCheckedChange={(v) => setTerms(p => ({ ...p, allowTermination: v }))}
              />
            </div>

            <div className="flex items-center justify-between gap-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Shield className="h-4 w-4 text-zinc-500" /> Jogar contra Dono
              </Label>
              <Switch
                disabled={isViewOnly}
                checked={terms.canPlayAgainstOwner}
                onCheckedChange={(v) => setTerms(p => ({ ...p, canPlayAgainstOwner: v }))}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row gap-2 p-3 sm:p-4 bg-zinc-900/50 border-t border-zinc-800">
          <Button variant="ghost" onClick={activeClose} className="flex-1 sm:flex-none text-zinc-400 hover:text-white h-10">Cancelar</Button>
          {(mode === 'setup' || mode === 'list') && (
            <Button
              disabled={loading}
              onClick={() => activeSubmit(terms)}
              className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black uppercase tracking-wider h-10"
            >
              {loading ? 'Anunciando...' : 'Anunciar'}
            </Button>
          )}
          {mode === 'view' && !isOwner && (
            <Button disabled={loading} onClick={() => activeSubmit(terms)} className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black h-10">
              Aceitar
            </Button>
          )}
          {mode === 'negotiate' && (
            <Button disabled={loading} onClick={() => activeSubmit(terms)} className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 font-black h-10">
              {loading ? 'Enviando...' : 'Contraproposta'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
