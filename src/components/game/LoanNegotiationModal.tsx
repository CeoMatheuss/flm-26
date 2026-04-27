import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight, Coins, HandCoins, AlertCircle } from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';

export type SalaryPayer = 'seller' | 'buyer' | 'split';

export interface LoanTerms {
  salaryPayer: SalaryPayer;
  salarySplitPct: number; // % paid by SELLER (clube atual) when 'split'
  loanFee: number;
  message?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'list' | 'negotiate'; // list = seller listing, negotiate = buyer proposing
  /** Player base info to show in header */
  player: {
    name: string;
    position: string;
    age: number;
    overall: number;
    salary: number;
  };
  /** When negotiating, the listed terms shown for reference */
  listedTerms?: LoanTerms;
  /** Allow negotiation (buyer can propose). If false in negotiate mode, only "Aceitar" is shown */
  openToOffers?: boolean;
  /** Submit handler */
  onSubmit: (terms: LoanTerms) => Promise<void> | void;
  /** Optional: accept listed terms as-is (negotiate mode only) */
  onAcceptListed?: () => Promise<void> | void;
  loading?: boolean;
}

const MIN_FEE = 0;
const MAX_FEE = 50_000_000;

export function LoanNegotiationModal({
  open, onOpenChange, mode, player, listedTerms, openToOffers = true,
  onSubmit, onAcceptListed, loading = false,
}: Props) {
  const initial: LoanTerms = listedTerms ?? {
    salaryPayer: 'buyer',
    salarySplitPct: 50,
    loanFee: Math.max(50_000, Math.round(player.salary * 6)),
    message: '',
  };
  const [payer, setPayer] = useState<SalaryPayer>(initial.salaryPayer);
  const [split, setSplit] = useState<number>(initial.salarySplitPct || 50);
  const [fee, setFee] = useState<number>(initial.loanFee);
  const [message, setMessage] = useState<string>('');

  const monthlySalary = player.salary;
  const sellerCost = useMemo(() => {
    if (payer === 'seller') return monthlySalary;
    if (payer === 'split') return Math.round(monthlySalary * (split / 100));
    return 0;
  }, [payer, split, monthlySalary]);
  const buyerCost = monthlySalary - sellerCost;

  const handleSubmit = () => {
    onSubmit({ salaryPayer: payer, salarySplitPct: payer === 'split' ? split : 0, loanFee: Math.max(0, fee), message });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            {mode === 'list' ? 'Listar para empréstimo' : 'Negociar empréstimo'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {mode === 'list'
              ? 'Defina os termos com que você aceita ceder o jogador.'
              : 'Faça uma proposta com seus termos. O clube atual pode aceitar, recusar ou contrapropor.'}
          </DialogDescription>
        </DialogHeader>

        {/* Player card */}
        <div className="rounded-lg border border-border/30 bg-card/50 p-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg flex flex-col items-center justify-center bg-primary/10 border border-primary/30">
            <span className="text-base font-black text-primary leading-none">{player.overall}</span>
            <span className="text-[7px] text-muted-foreground">OVR</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{player.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {player.position} • {player.age}a • Salário base R${(monthlySalary / 1000).toFixed(0)}k/mês
            </p>
          </div>
        </div>

        {/* Listed reference (negotiate mode) */}
        {mode === 'negotiate' && listedTerms && (
          <div className="rounded-md bg-muted/30 border border-border/20 p-2 text-[10px] space-y-0.5">
            <p className="font-bold text-muted-foreground uppercase tracking-wider">Termos do anúncio</p>
            <p>Quem paga: <span className="text-foreground font-semibold">{listedTerms.salaryPayer === 'seller' ? 'Clube atual' : listedTerms.salaryPayer === 'buyer' ? 'Receptor' : `Dividido ${listedTerms.salarySplitPct}/${100 - listedTerms.salarySplitPct}`}</span></p>
            <p>Taxa: <span className="text-foreground font-semibold">{formatMoney(listedTerms.loanFee)}</span></p>
            {!openToOffers && (
              <p className="text-amber-400 flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" /> Este clube não aceita contrapropostas.</p>
            )}
          </div>
        )}

        {/* Terms form */}
        <div className="space-y-3">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Quem paga o salário</Label>
            <div className="grid grid-cols-3 gap-1.5 mt-1.5">
              {([
                { v: 'seller', label: 'Clube atual', sub: '100%' },
                { v: 'split', label: 'Dividido', sub: 'split' },
                { v: 'buyer', label: 'Receptor', sub: '100%' },
              ] as const).map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setPayer(opt.v)}
                  className={`px-2 py-1.5 rounded-md border text-[10px] font-medium transition-colors ${payer === opt.v ? 'bg-primary text-primary-foreground border-primary' : 'bg-card/40 border-border/30 text-muted-foreground hover:bg-card/70'}`}
                >
                  <div className="font-bold leading-tight">{opt.label}</div>
                  <div className="opacity-70 text-[9px] mt-0.5">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {payer === 'split' && (
            <div className="rounded-md bg-card/40 border border-border/20 p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Divisão do salário</Label>
                <span className="text-[10px] font-bold text-primary">{split}% / {100 - split}%</span>
              </div>
              <Slider min={10} max={90} step={5} value={[split]} onValueChange={([v]) => setSplit(v)} />
              <p className="text-[9px] text-muted-foreground mt-1">Clube atual paga {split}% • Receptor paga {100 - split}%</p>
            </div>
          )}

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <HandCoins className="h-3 w-3" /> Taxa de empréstimo (paga pelo receptor)
            </Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Input
                type="number"
                min={MIN_FEE}
                max={MAX_FEE}
                step={10000}
                value={fee}
                onChange={e => setFee(Math.max(0, Number(e.target.value) || 0))}
                className="h-8 text-xs"
              />
              <span className="text-[10px] text-muted-foreground shrink-0 w-20 text-right">{formatMoney(fee)}</span>
            </div>
            <div className="flex gap-1 mt-1.5">
              {[0, 100_000, 500_000, 1_000_000, 5_000_000].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFee(v)}
                  className="text-[9px] px-2 py-0.5 rounded bg-card/40 border border-border/20 text-muted-foreground hover:bg-card/70"
                >
                  {v === 0 ? 'Grátis' : formatMoney(v)}
                </button>
              ))}
            </div>
          </div>

          {/* Cost preview */}
          <div className="grid grid-cols-2 gap-2 rounded-md bg-card/30 border border-border/20 p-2">
            <div>
              <p className="text-[9px] text-muted-foreground uppercase">Custo / mês — Clube atual</p>
              <p className="text-xs font-bold text-amber-400 flex items-center gap-1"><Coins className="h-3 w-3" /> {formatMoney(sellerCost)}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground uppercase">Custo / mês — Receptor</p>
              <p className="text-xs font-bold text-primary flex items-center gap-1"><Coins className="h-3 w-3" /> {formatMoney(buyerCost)}</p>
            </div>
          </div>

          {mode === 'negotiate' && (
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Mensagem (opcional)</Label>
              <Input
                placeholder="Ex.: Garantimos minutos como titular."
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, 200))}
                className="h-8 text-xs mt-1.5"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          {mode === 'negotiate' && onAcceptListed && (
            <Button variant="outline" size="sm" onClick={onAcceptListed} disabled={loading} className="gap-1">
              <Badge variant="outline" className="text-[8px] px-1 h-3.5">rápido</Badge>
              Aceitar termos
            </Button>
          )}
          <Button size="sm" onClick={handleSubmit} disabled={loading || (mode === 'negotiate' && !openToOffers)} className="gap-1">
            {mode === 'list' ? 'Publicar empréstimo' : 'Enviar proposta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
