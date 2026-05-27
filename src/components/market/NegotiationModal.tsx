import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatMoney } from '@/lib/formatMoney';
import { Player } from '@/types/game';
import { User, DollarSign, Calendar, Gift, Zap, TrendingUp, Handshake, AlertTriangle, CheckCircle2, XCircle, Info, Calculator, UserPlus, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface NegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | any;
  currentClubName: string;
  onConfirm: (data: NegotiationData) => void;
  loading?: boolean;
  type: 'transfer' | 'free_agent';
  budget: {
    transfer: number;
    salary: number;
  };
  initialData?: Partial<NegotiationData>;
}

export interface NegotiationData {
  offeredPrice?: number;
  offeredSalary: number;
  contractYears: number;
  signingBonus: number;
  bonusGoals?: number;
  bonusAssists?: number;
  bonusGames?: number;
  bonusTitles?: number;
}

export function NegotiationModal({ 
  isOpen, 
  onClose, 
  player, 
  currentClubName, 
  onConfirm, 
  loading, 
  type,
  budget,
  initialData
}: NegotiationModalProps) {
  const [salary, setSalary] = useState(initialData?.offeredSalary || 1000);
  const [years, setYears] = useState(initialData?.contractYears || 2);
  const [luvas, setLuvas] = useState(initialData?.signingBonus || 0);
  const [price, setPrice] = useState(initialData?.offeredPrice || (player?.asking_price || 0));
  
  const currentSalary = player?.salary || player?.player_data?.salary || 500;
  
  // Negotiation AI Simulation for "Chance of Acceptance"
  const acceptanceChance = useMemo(() => {
    let chance = 50;
    
    // Salary impact
    const salaryRatio = salary / currentSalary;
    if (salaryRatio >= 1.5) chance += 35;
    else if (salaryRatio >= 1.2) chance += 20;
    else if (salaryRatio >= 1.0) chance += 10;
    else if (salaryRatio >= 0.8) chance -= 15;
    else chance -= 40;
    
    // Contract years impact
    if (years === 3 || years === 4) chance += 5;
    if (years === 1) chance -= 10;
    if (years === 5) chance += 2;
    
    // Luvas impact
    if (luvas > 0) {
      const luvasImpact = Math.min(15, (luvas / (currentSalary * 12)) * 10);
      chance += luvasImpact;
    }
    
    // Price impact (only for transfers)
    if (type === 'transfer' && player?.asking_price) {
      const priceRatio = price / player.asking_price;
      if (priceRatio >= 1.2) chance += 10;
      if (priceRatio < 1.0) chance -= 20;
    }
    
    return Math.max(5, Math.min(99, chance));
  }, [salary, years, luvas, price, currentSalary, player?.asking_price, type]);

  const isAutoAccept = salary >= currentSalary;

  const handleConfirm = () => {
    onConfirm({
      offeredPrice: type === 'transfer' ? price : undefined,
      offeredSalary: salary,
      contractYears: years,
      signingBonus: luvas,
      bonusGoals: 0,
      bonusAssists: 0,
      bonusGames: 0,
      bonusTitles: 0,
    });
  };

  const totalTransferCost = (type === 'transfer' ? price : 0) + luvas;
  const annualSalaryCost = salary * 12;
  const canAfford = totalTransferCost <= budget.transfer && annualSalaryCost <= budget.salary;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-[#0A0E14] border-white/10 shadow-2xl">
        <div className="relative">
          {/* Header with Player Info */}
          <div className="p-6 pb-4 bg-gradient-to-br from-blue-600/20 to-purple-600/10 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg border border-white/20">
                <span className="text-2xl font-black">{player?.overall || player?.player_overall || '??'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white truncate">{player?.name || player?.player_name}</h2>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                    {player?.position || player?.player_position}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <User className="w-3 h-3" /> {player?.age || player?.player_age} anos
                  </span>
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Valor: {formatMoney(player?.asking_price || 0)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Humor do Jogador</div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={cn("w-3 h-1 rounded-full", i <= 4 ? "bg-green-500" : "bg-gray-700")} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Salary Comparison Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] uppercase font-black text-gray-500 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Salário Atual
                </div>
                <div className="text-lg font-bold text-gray-300">{formatMoney(currentSalary)}/mês</div>
              </div>
              <div className={cn(
                "p-4 rounded-xl border transition-all duration-300",
                salary >= currentSalary ? "bg-green-500/10 border-green-500/30" : "bg-amber-500/10 border-amber-500/30"
              )}>
                <div className="text-[10px] uppercase font-black text-gray-500 mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Proposta Salarial
                </div>
                <div className={cn("text-lg font-black", salary >= currentSalary ? "text-green-400" : "text-amber-400")}>
                  {formatMoney(salary)}/mês
                </div>
              </div>
            </div>

            {/* Main Inputs */}
            <div className="space-y-4">
              {type === 'transfer' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold px-1">
                    <label className="text-gray-400 uppercase tracking-wider">Valor da Transferência</label>
                    <span className="text-blue-400">{formatMoney(price)}</span>
                  </div>
                  <Slider
                    value={[price]}
                    onValueChange={([v]) => setPrice(v)}
                    max={Math.max(price * 2, 10000000)}
                    step={1000}
                    className="py-4"
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold px-1">
                  <label className="text-gray-400 uppercase tracking-wider">Salário Oferecido</label>
                  <span className={cn(salary >= currentSalary ? "text-green-400" : "text-amber-400")}>
                    {formatMoney(salary)}/mês
                  </span>
                </div>
                <Slider
                  value={[salary]}
                  onValueChange={([v]) => setSalary(v)}
                  max={Math.max(salary * 3, currentSalary * 2)}
                  min={100}
                  step={50}
                  className="py-4"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-gray-500 px-1">Tempo de Contrato</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((y) => (
                      <button
                        key={y}
                        onClick={() => setYears(y)}
                        className={cn(
                          "flex-1 h-9 rounded-lg text-xs font-bold transition-all border",
                          years === y 
                            ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_-5px_hsl(var(--primary))]" 
                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                        )}
                      >
                        {y}a
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] uppercase font-black text-gray-500 px-1">
                    <span>Luvas (Bônus)</span>
                    <span className="text-gray-400">{formatMoney(luvas)}</span>
                  </div>
                  <Input
                    type="number"
                    value={luvas}
                    onChange={(e) => setLuvas(Number(e.target.value))}
                    className="h-9 bg-white/5 border-white/10 text-xs font-bold focus-visible:ring-blue-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Chance of Acceptance Bar */}
            <div className="p-4 rounded-xl bg-black/60 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-black uppercase text-gray-400">Chance de Aceite</span>
                </div>
                <span className={cn(
                  "text-lg font-black",
                  acceptanceChance >= 75 ? "text-green-400" : acceptanceChance >= 40 ? "text-amber-400" : "text-red-400"
                )}>
                  {acceptanceChance}%
                </span>
              </div>
              <Progress value={acceptanceChance} className="h-2 bg-white/5" />
              
              <AnimatePresence mode="wait">
                {isAutoAccept ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="mt-3 flex items-center gap-2 text-[11px] font-bold text-green-400 bg-green-500/10 p-2 rounded-lg border border-green-500/20"
                  >
                    <Zap className="w-3 h-3 fill-green-400" />
                    ACEITE IMEDIATO! O jogador aceitará na hora por ser maior que o salário atual.
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="mt-3 flex items-center gap-2 text-[11px] font-bold text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20"
                  >
                    <Clock className="w-3 h-3" />
                    O jogador irá analisar a proposta (7h ingame).
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Financial Check */}
            {!canAfford && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[11px] font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Orçamento insuficiente para esta proposta!
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 pt-2 flex gap-3 bg-black/20 border-t border-white/5">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={loading || !canAfford}
              className={cn(
                "flex-[2] font-black uppercase tracking-wider",
                isAutoAccept 
                  ? "bg-green-600 hover:bg-green-700 text-white shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)]" 
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Negociando...
                </span>
              ) : isAutoAccept ? (
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Contratar Agora
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Handshake className="w-4 h-4" /> Enviar Proposta
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
