import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { YouthProspect } from '@/types/infrastructure';
import { ContractOffer, NegotiationState } from '@/types/promotion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Wallet, Calendar, Shield, MessageSquare, Check, X, Send } from 'lucide-react';
import { toast } from 'sonner';

interface ContractNegotiationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: YouthProspect;
  onComplete: (accepted: boolean, contractDetails?: any) => void;
  clubBudget: number;
}

export function ContractNegotiationModal({ open, onOpenChange, prospect, onComplete, clubBudget }: ContractNegotiationModalProps) {
  // Initial demand from player based on overall/potential
  const initialDemand: ContractOffer = useMemo(() => {
    const baseSalary = Math.floor((prospect.overall * 1500) * (prospect.potential / 70));
    return {
      years: 3,
      salary: baseSalary,
      releaseClause: baseSalary * 100,
      signingBonus: baseSalary * 2,
      squadRole: prospect.potential >= 90 ? 'titular-futuro' : 'promessa'
    };
  }, [prospect]);

  const [offer, setOffer] = useState<ContractOffer>({ ...initialDemand });
  const [patience, setPatience] = useState(100);
  const [history, setHistory] = useState<{ type: 'player' | 'user', text: string }[]>([
    { type: 'player', text: `Olá! Estou muito feliz com a oportunidade. Meu agente preparou uma proposta inicial para o meu primeiro contrato profissional.` }
  ]);

  const handleSendOffer = () => {
    if (offer.salary < initialDemand.salary * 0.5) {
      setPatience(prev => prev - 25);
      setHistory(prev => [...prev, { type: 'user', text: `Oferecemos R$ ${offer.salary.toLocaleString()} por mês.` }, { type: 'player', text: `Isso é um insulto! Meu talento vale muito mais que isso.` }]);
      return;
    }

    // Simple negotiation logic
    const diff = offer.salary / initialDemand.salary;
    const randomFactor = Math.random();

    setHistory(prev => [...prev, { type: 'user', text: `Minha proposta: R$ ${offer.salary.toLocaleString()} por ${offer.years} anos.` }]);

    if (diff >= 0.95 || (diff >= 0.8 && randomFactor > 0.5)) {
      setHistory(prev => [...prev, { type: 'player', text: `Excelente! Os termos são ótimos. Onde eu assino?` }]);
      setTimeout(() => onComplete(true, offer), 1500);
    } else {
      setPatience(prev => prev - 15);
      const counterSalary = Math.floor(initialDemand.salary * (0.9 + Math.random() * 0.1));
      setHistory(prev => [...prev, { type: 'player', text: `Ainda não é o que eu esperava. Que tal R$ ${counterSalary.toLocaleString()}?` }]);
      setOffer(prev => ({ ...prev, salary: counterSalary }));
    }
  };

  if (patience <= 0) {
    onComplete(false);
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 text-white p-0 overflow-hidden flex flex-col h-[80vh]">
        <DialogHeader className="p-6 border-b border-white/5 bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <User className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">Negociação de Contrato</DialogTitle>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{prospect.name} • Agente do Jogador</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Paciência</span>
               <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                 <div 
                   className={`h-full transition-all duration-500 ${patience > 50 ? 'bg-emerald-500' : patience > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                   style={{ width: `${patience}%` }}
                 />
               </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat Side */}
          <div className="flex-1 flex flex-col bg-zinc-950/50 border-r border-white/5">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {history.map((msg, i) => (
                  <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                      msg.type === 'user' 
                        ? 'bg-emerald-500 text-zinc-950 rounded-tr-none' 
                        : 'bg-white/5 border border-white/10 text-zinc-200 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Controls Side */}
          <div className="w-80 p-6 space-y-8 bg-zinc-900/30 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5" /> Salário Mensal (R$)
              </label>
              <div className="space-y-3">
                <Input 
                  type="number" 
                  value={offer.salary} 
                  onChange={(e) => setOffer({ ...offer, salary: parseInt(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10 text-white font-black"
                />
                <Slider 
                  value={[offer.salary]} 
                  min={1000} 
                  max={initialDemand.salary * 2} 
                  step={500}
                  onValueChange={([val]) => setOffer({ ...offer, salary: val })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Duração (Anos)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map(y => (
                  <button
                    key={y}
                    onClick={() => setOffer({ ...offer, years: y })}
                    className={`h-10 rounded-lg border text-xs font-black transition-all ${
                      offer.years === y 
                        ? 'bg-emerald-500 border-transparent text-zinc-950' 
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> Papel no Elenco
              </label>
              <div className="space-y-2">
                {(['promessa', 'reserva', 'rotacao', 'titular-futuro'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setOffer({ ...offer, squadRole: role })}
                    className={`w-full h-10 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between ${
                      offer.squadRole === role 
                        ? 'bg-emerald-500 border-transparent text-zinc-950' 
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                    }`}
                  >
                    {role.replace('-', ' ')}
                    {offer.squadRole === role && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleSendOffer}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black italic uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-4 h-4 mr-2" /> Enviar Proposta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
