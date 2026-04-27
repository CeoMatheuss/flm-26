import { useState, useCallback } from 'react';
import { FinanceEntry, createFinanceEntry } from '@/types/finance';
import {
  Sponsor, SponsorOffer, SeasonContext,
  generateSponsorOffers, isObjectiveMet,
} from '@/types/sponsor';
import { toast } from 'sonner';

export function useFinanceState(initialState: any) {
  const [finances, setFinances] = useState<FinanceEntry[]>(initialState?.finances ?? []);
  const [sponsors, setSponsors] = useState<Sponsor[]>(() => {
    const raw: any[] = initialState?.sponsors ?? [];
    // Migração leve: contratos antigos viram contratos V2 simples
    return raw.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      totalValue: s.totalValue ?? (s.monthlyPay ?? 0) * 12,
      monthlyPay: s.monthlyPay ?? 0,
      installmentsTotal: s.installmentsTotal ?? 12,
      installmentsPaid: s.installmentsPaid ?? 0,
      payMode: s.payMode ?? 'monthly',
      penalty: s.penalty ?? 0,
      objective: (s.objective && s.objective.label)
        ? s.objective
        : { kind: 'top10', label: '⭐ Terminar no top 10' },
      signedSeason: s.signedSeason ?? 0,
      duration: s.duration ?? 1,
      status: s.status ?? 'active',
      winsTracked: s.winsTracked ?? 0,
      minReputation: s.minReputation ?? 30,
    }) as Sponsor);
  });
  const [sponsorOffers, setSponsorOffers] = useState<SponsorOffer[]>(
    initialState?.sponsorOffers ?? generateSponsorOffers(65, 4)
  );

  const addFinance = useCallback((type: 'receita' | 'despesa', category: string, amount: number, desc: string) => {
    setFinances(prev => [...prev, createFinanceEntry(type, category, amount, desc)]);
  }, []);

  const acceptSponsor = useCallback((
    offer: SponsorOffer,
    setBudget: (fn: (b: number) => number) => void,
    currentSeason: number,
  ) => {
    if (sponsors.length >= 3) {
      toast.error('Limite de 3 patrocinadores atingido! Aguarde um contrato expirar.');
      return;
    }
    const signed: Sponsor = { ...offer, signedSeason: currentSeason, status: 'active' };
    setSponsors(prev => [...prev, signed]);
    setSponsorOffers(prev => prev.filter(o => o.id !== offer.id));
    toast.success(`Patrocínio aceito: ${offer.name} — Objetivo: ${offer.objective.label}`);
    // Não credita nada agora; pagamento começa pela próxima parcela.
  }, [sponsors.length]);

  const refreshSponsorOffers = useCallback((reputation: number) => {
    setSponsorOffers(generateSponsorOffers(reputation, 4));
  }, []);

  /** Paga próxima parcela mensal (chamada por timer/calendário). */
  const payNextInstallment = useCallback((
    sponsorId: string,
    setBudget: (fn: (b: number) => number) => void,
  ) => {
    setSponsors(prev => prev.map(sp => {
      if (sp.id !== sponsorId) return sp;
      if (sp.status !== 'active') return sp;
      if (sp.payMode !== 'monthly') return sp;
      if (sp.installmentsPaid >= sp.installmentsTotal) return sp;
      const value = sp.monthlyPay;
      setBudget(b => b + value);
      addFinance('receita', 'Patrocínio', value, `Parcela ${sp.installmentsPaid + 1}/${sp.installmentsTotal} — ${sp.name}`);
      return { ...sp, installmentsPaid: sp.installmentsPaid + 1 };
    }));
  }, [addFinance]);

  /** Incrementa contador de vitórias para objetivos win_n_matches. */
  const trackOfficialWin = useCallback(() => {
    setSponsors(prev => prev.map(sp =>
      sp.status === 'active' && sp.objective.kind === 'win_n_matches'
        ? { ...sp, winsTracked: (sp.winsTracked ?? 0) + 1 }
        : sp
    ));
  }, []);

  /** Avalia objetivos no fim da temporada — credita bônus on_complete OU aplica multa. */
  const evaluateSponsorsEndOfSeason = useCallback((
    ctx: SeasonContext,
    setBudget: (fn: (b: number) => number) => void,
  ) => {
    setSponsors(prev => {
      const next: Sponsor[] = [];
      for (const sp of prev) {
        if (sp.status !== 'active') { next.push(sp); continue; }

        const evalCtx: SeasonContext =
          sp.objective.kind === 'win_n_matches'
            ? { ...ctx, officialWins: sp.winsTracked ?? 0 }
            : ctx;
        const met = isObjectiveMet(sp.objective, evalCtx);

        // Reduz duração; só avalia/encerra quando duração chega a 0
        const newDuration = sp.duration - 1;

        if (newDuration > 0) {
          // Patrocínio multi-temporada — não fecha ainda, mas zera contador de vitórias
          next.push({ ...sp, duration: newDuration, winsTracked: 0 });
          continue;
        }

        if (met) {
          // Pagamento on_complete: credita o restante (se houver)
          if (sp.payMode === 'on_complete') {
            const value = sp.totalValue;
            setBudget(b => b + value);
            addFinance('receita', 'Patrocínio (Bônus)', value, `Bônus por cumprir objetivo — ${sp.name}`);
          } else {
            // Bônus de cumprimento: 10% do total como agradecimento
            const bonus = Math.floor(sp.totalValue * 0.1);
            if (bonus > 0) {
              setBudget(b => b + bonus);
              addFinance('receita', 'Patrocínio (Bônus)', bonus, `Bônus por cumprir objetivo — ${sp.name}`);
            }
          }
          toast.success(`✅ ${sp.name}: objetivo cumprido!`);
          next.push({ ...sp, status: 'completed', duration: 0 });
        } else {
          // Aplica multa — pode levar à falência (orçamento negativo permitido)
          const fine = sp.penalty;
          setBudget(b => b - fine);
          addFinance('despesa', 'Multa Patrocinador', fine, `Objetivo não cumprido — ${sp.name}: ${sp.objective.label}`);
          toast.error(`❌ ${sp.name}: objetivo NÃO cumprido. Multa: R$ ${(fine/1000).toFixed(0)}k`, { duration: 8000 });
          next.push({ ...sp, status: 'failed', duration: 0 });
        }
      }
      // Remove contratos finalizados (completed/failed) após processar
      return next.filter(sp => sp.status === 'active');
    });
  }, [addFinance]);

  return {
    finances, setFinances,
    sponsors, setSponsors,
    sponsorOffers, setSponsorOffers,
    addFinance,
    acceptSponsor,
    refreshSponsorOffers,
    payNextInstallment,
    trackOfficialWin,
    evaluateSponsorsEndOfSeason,
  };
}
