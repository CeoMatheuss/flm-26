import { useState, useCallback } from 'react';
import { FinanceEntry, createFinanceEntry } from '@/types/finance';
import { Sponsor, SponsorOffer, generateSponsorOffers } from '@/types/sponsor';
import { toast } from 'sonner';

export function useFinanceState(initialState: any) {
  const [finances, setFinances] = useState<FinanceEntry[]>(initialState?.finances ?? []);
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialState?.sponsors ?? []);
  const [sponsorOffers, setSponsorOffers] = useState<SponsorOffer[]>(initialState?.sponsorOffers ?? generateSponsorOffers(65, 4));

  const addFinance = useCallback((type: 'receita' | 'despesa', category: string, amount: number, desc: string) => {
    setFinances(prev => [...prev, createFinanceEntry(type, category, amount, desc)]);
  }, []);

  const acceptSponsor = useCallback((offer: SponsorOffer, setBudget: (fn: (b: number) => number) => void) => {
    if (sponsors.length >= 3) {
      toast.error('Limite de 3 patrocinadores atingido! Aguarde um contrato expirar.');
      return;
    }
    setSponsors(prev => [...prev, offer]);
    setSponsorOffers(prev => prev.filter(o => o.id !== offer.id));
    addFinance('receita', 'Patrocínio', offer.monthlyPay, `Novo: ${offer.name}`);
    setBudget(b => b + offer.monthlyPay);
    toast.success(`Patrocínio aceito: ${offer.name}!`);
  }, [addFinance, sponsors.length]);

  const refreshSponsorOffers = useCallback((reputation: number) => {
    setSponsorOffers(generateSponsorOffers(reputation, 4));
  }, []);

  return {
    finances, setFinances, sponsors, setSponsors, sponsorOffers, setSponsorOffers,
    addFinance, acceptSponsor, refreshSponsorOffers,
  };
}
