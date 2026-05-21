import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatMoney } from '@/lib/formatMoney';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, DollarSign, Percent, Clock, Ban, Shield, Zap, TrendingUp, Handshake } from 'lucide-react';
import { LoanTerms, defaultLoanTerms } from '@/types/loan';

interface Props {
  isOpen?: boolean; // Keep for compatibility
  open?: boolean; // Keep for compatibility
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
  const activeSubmit = (terms: any) => {
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

  const handleSalaryOwnerChange = (val: number) => {
    const owner = Math.min(100, Math.max(0, val));
    setTerms(prev => ({
      ...prev,
      salaryPercentageOwner: owner,
      salaryPercentageBorrower: 100 - owner
    }));
  };

  const isViewOnly = mode === 'view';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-zinc-800">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Handshake className="h-5 w-5 text-emerald-400" />
            {mode === 'setup' ? 'Configurar Termos de Empréstimo' : 'Negociar Empréstimo'}
          </DialogTitle>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-lg text-emerald-400">
              {player?.overall}
            </div>
            <div>
              <p className="font-bold text-white leading-none">{player?.name}</p>
              <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wider font-mono">
                {player?.position} • {player?.age} anos • {formatMoney(player?.salary || 0)}/mês
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 pt-2">
          <div className="space-y-6">
            {/* Seção 1: Duração e Financeiro */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-zinc-500 font-bold flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Duração
                </Label>
                <Select 
                  disabled={isViewOnly}
                  value={terms.duration.toString()} 
                  onValueChange={(v) => setTerms(p => ({ ...p, duration: Number(v) }))}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Meses</SelectItem>
                    <SelectItem value="6">6 Meses</SelectItem>
                    <SelectItem value="12">1 Temporada (12m)</SelectItem>
                    <SelectItem value="24">2 Temporadas (24m)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-zinc-500 font-bold flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" /> Taxa de Empréstimo
                </Label>
                <div className="relative">
                  <Input 
                    disabled={isViewOnly}
                    type="number"
                    value={terms.loanFee}
                    onChange={(e) => setTerms(p => ({ ...p, loanFee: Number(e.target.value) }))}
                    className="bg-zinc-900 border-zinc-800 pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-bold">R$</span>
                </div>
              </div>
            </div>

            {/* Seção 2: Divisão Salarial */}
            <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
              <Label className="text-xs uppercase text-zinc-500 font-bold flex items-center gap-1.5">
                <Percent className="h-3 w-3" /> Divisão Salarial
              </Label>
              <div className="grid grid-cols-2 gap-6 items-center">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500">
                    <span>Clube Dono</span>
                    <span className="text-white">{terms.salaryPercentageOwner}%</span>
                  </div>
                  <Input 
                    disabled={isViewOnly}
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={terms.salaryPercentageOwner}
                    onChange={(e) => handleSalaryOwnerChange(Number(e.target.value))}
                    className="h-2 p-0 accent-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500">
                    <span>Clube Receptor</span>
                    <span className="text-white">{terms.salaryPercentageBorrower}%</span>
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
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 text-center italic mt-2">
                O clube receptor pagará <span className="text-white font-bold">{formatMoney((player?.salary || 0) * (terms.salaryPercentageBorrower / 100))}</span> mensais.
              </p>
            </div>

            {/* Seção 3: Compra e Cláusulas */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Opção de Compra</Label>
                  <p className="text-xs text-zinc-500">Permite ao clube receptor comprar o jogador.</p>
                </div>
                <div className="flex items-center gap-4">
                  {terms.optionalPurchasePrice !== undefined && (
                    <div className="relative w-32">
                      <Input 
                        disabled={isViewOnly}
                        type="number"
                        placeholder="Valor"
                        value={terms.optionalPurchasePrice}
                        onChange={(e) => setTerms(p => ({ ...p, optionalPurchasePrice: Number(e.target.value) }))}
                        className="h-8 bg-zinc-950 border-zinc-800 pl-7 text-xs"
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px] font-bold">R$</span>
                    </div>
                  )}
                  <Switch 
                    disabled={isViewOnly}
                    checked={terms.optionalPurchasePrice !== undefined}
                    onCheckedChange={(checked) => setTerms(p => ({ ...p, optionalPurchasePrice: checked ? player?.marketValue || 1000000 : undefined }))}
                  />
                </div>
              </div>

              {terms.optionalPurchasePrice !== undefined && (
                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Compra Obrigatória</Label>
                    <p className="text-xs text-zinc-500">A compra torna-se obrigatória ao fim do prazo.</p>
                  </div>
                  <Switch 
                    disabled={isViewOnly}
                    checked={terms.obligatoryPurchase}
                    onCheckedChange={(v) => setTerms(p => ({ ...p, obligatoryPurchase: v }))}
                  />
                </div>
              )}

              <Separator className="bg-zinc-800" />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-zinc-500" /> Permanência Mín.
                    </Label>
                    <p className="text-[10px] text-zinc-500">Meses até poder cancelar.</p>
                  </div>
                  <Select 
                    disabled={isViewOnly}
                    value={terms.minStayMonths.toString()}
                    onValueChange={(v) => setTerms(p => ({ ...p, minStayMonths: Number(v) }))}
                  >
                    <SelectTrigger className="w-16 h-8 bg-zinc-950 border-zinc-800 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-zinc-500" /> Bônus de Perf.
                    </Label>
                    <p className="text-[10px] text-zinc-500">Pago por gol/assistência.</p>
                  </div>
                  <Input 
                    disabled={isViewOnly}
                    type="number"
                    value={terms.performanceBonus}
                    onChange={(e) => setTerms(p => ({ ...p, performanceBonus: Number(e.target.value) }))}
                    className="w-20 h-8 bg-zinc-950 border-zinc-800 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-zinc-500" /> Jogar contra Dono
                  </Label>
                  <p className="text-xs text-zinc-500">Permite enfrentar seu clube original em competições.</p>
                </div>
                <Switch 
                  disabled={isViewOnly}
                  checked={terms.canPlayAgainstOwner}
                  onCheckedChange={(v) => setTerms(p => ({ ...p, canPlayAgainstOwner: v }))}
                />
              </div>

              <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                <Label className="text-xs uppercase text-zinc-500 font-bold flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" /> Promessa de Utilização
                </Label>
                <Select 
                  disabled={isViewOnly}
                  value={terms.usagePriority}
                  onValueChange={(v: any) => setTerms(p => ({ ...p, usagePriority: v }))}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma Exigência</SelectItem>
                    <SelectItem value="rotacao">Jogador de Rotação</SelectItem>
                    <SelectItem value="titular">Titular Importante</SelectItem>
                    <SelectItem value="estrela">Peça Chave / Estrela</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold">Mínimo de minutos (p/ mês)</span>
                  <Input 
                    disabled={isViewOnly}
                    type="number"
                    step="45"
                    min="0"
                    value={terms.minMinutesRequired}
                    onChange={(e) => setTerms(p => ({ ...p, minMinutesRequired: Number(e.target.value) }))}
                    className="w-20 h-7 bg-zinc-950 border-zinc-800 text-[10px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 bg-zinc-900/50 border-t border-zinc-800">
          <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white">Cancelar</Button>
          {mode === 'setup' && (
            <Button 
              onClick={() => onConfirm(terms)} 
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black uppercase tracking-wider"
            >
              Anunciar Jogador
            </Button>
          )}
          {mode === 'view' && !isOwner && (
            <div className="flex gap-2">
              <Button onClick={() => onConfirm(terms)} className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black">
                Aceitar Termos
              </Button>
              <Button variant="outline" onClick={() => {}} className="border-zinc-700 font-bold">
                Negociar
              </Button>
            </div>
          )}
          {mode === 'negotiate' && (
            <Button onClick={() => onConfirm(terms)} className="bg-primary hover:bg-primary/90 font-black">
              Enviar Contraproposta
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
