import { useState, useCallback, useMemo } from 'react';
import { FinanceEntry, createFinanceEntry, FinanceType, FinanceCategory } from '@/types/finance';
import {
  Sponsor, SponsorOffer, SeasonContext,
  generateSponsorOffers, isObjectiveMet,
} from '@/types/sponsor';
import { toast } from 'sonner';

export function useFinanceState(initialState: any) {
  const [finances, setFinances] = useState<FinanceEntry[]>(initialState?.finances ?? []);
  const [sponsors, setSponsors] = useState<Sponsor[]>(() => {
    const raw: any[] = initialState?.sponsors ?? [];
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

  const addFinance = useCallback((type: FinanceType, category: FinanceCategory, amount: number, desc: string) => {
    setFinances(prev => {
      const entry = createFinanceEntry(type, category, amount, desc);
      return [entry, ...prev].slice(0, 500); // Keep last 500 entries
    });
  }, []);

  const financialSummary = useMemo(() => {
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const lastMonth = finances.filter(f => now - f.timestamp < thirtyDays);
    
    const revenue = lastMonth.filter(f => f.type === 'receita' || f.type === 'premiação')
      .reduce((sum, f) => sum + f.amount, 0);
    const expenses = lastMonth.filter(f => f.type === 'despesa' || f.type === 'investimento')
      .reduce((sum, f) => sum + f.amount, 0);
    
    return {
      monthlyRevenue: revenue,
      monthlyExpenses: expenses,
      netProfit: revenue - expenses,
      byCategory: lastMonth.reduce((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + (f.type === 'receita' || f.type === 'premiação' ? f.amount : -f.amount);
        return acc;
      }, {} as Record<string, number>)
    };
  }, [finances]);

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
    addFinance('receita', 'Patrocínio', 0, `Contrato assinado: ${offer.name}`);
  }, [sponsors.length, addFinance]);

  const refreshSponsorOffers = useCallback((reputation: number) => {
    setSponsorOffers(generateSponsorOffers(reputation, 4));
  }, []);

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

  const trackOfficialWin = useCallback(() => {
    setSponsors(prev => prev.map(sp =>
      sp.status === 'active' && sp.objective.kind === 'win_n_matches'
        ? { ...sp, winsTracked: (sp.winsTracked ?? 0) + 1 }
        : sp
    ));
  }, []);

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

        const newDuration = sp.duration - 1;

        if (newDuration > 0) {
          next.push({ ...sp, duration: newDuration, winsTracked: 0 });
          continue;
        }

        if (met) {
          if (sp.payMode === 'on_complete') {
            const value = sp.totalValue;
            setBudget(b => b + value);
            addFinance('receita', 'Patrocínio', value, `Bônus por cumprir objetivo — ${sp.name}`);
          } else {
            const bonus = Math.floor(sp.totalValue * 0.1);
            if (bonus > 0) {
              setBudget(b => b + bonus);
              addFinance('receita', 'Patrocínio', bonus, `Bônus por cumprir objetivo — ${sp.name}`);
            }
          }
          toast.success(`✅ ${sp.name}: objetivo cumprido!`);
          next.push({ ...sp, status: 'completed', duration: 0 });
        } else {
          const fine = sp.penalty;
          setBudget(b => b - fine);
          addFinance('despesa', 'Patrocínio', fine, `Multa por objetivo não cumprido — ${sp.name}`);
          toast.error(`❌ ${sp.name}: objetivo NÃO cumprido. Multa: R$ ${(fine/1000).toFixed(0)}k`, { duration: 8000 });
          next.push({ ...sp, status: 'failed', duration: 0 });
        }
      }
      return next.filter(sp => sp.status === 'active');
    });
  }, [addFinance]);

  const processMonthlyFinance = useCallback((
    clubBudget: number,
    setBudget: (fn: (b: number) => number) => void,
    totalSalaries: number,
    infrastructureMaintenance: number,
    scoutCosts: number
  ) => {
    const totalExpenses = totalSalaries + infrastructureMaintenance + scoutCosts;
    
    // Process Salaries
    if (totalSalaries > 0) {
      addFinance('despesa', 'Salários', totalSalaries, 'Pagamento mensal de salários do elenco');
    }
    
    // Process Maintenance
    if (infrastructureMaintenance > 0) {
      addFinance('despesa', 'Infraestrutura', infrastructureMaintenance, 'Manutenção mensal do CT e Estádio');
    }

    // Process Scouts
    if (scoutCosts > 0) {
      addFinance('despesa', 'Olheiros', scoutCosts, 'Salários da equipe de observação');
    }

    setBudget(b => b - totalExpenses);
    
    if (clubBudget - totalExpenses < 0) {
      toast.error('O clube está no vermelho! Providencie receitas urgentes.');
    } else {
      toast.info(`Folha mensal processada: -R$ ${(totalExpenses/1000).toFixed(0)}k`);
    }
  }, [addFinance]);

  return {
    finances, setFinances,
    sponsors, setSponsors,
    sponsorOffers, setSponsorOffers,
    financialSummary,
    addFinance,
    acceptSponsor,
    refreshSponsorOffers,
    payNextInstallment,
    trackOfficialWin,
    evaluateSponsorsEndOfSeason,
    processMonthlyFinance
  };
}

