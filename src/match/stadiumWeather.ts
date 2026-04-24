/**
 * Stadium Weather — Fase 4
 *
 * Eventos climáticos aleatórios que podem causar danos ao estádio
 * independentemente de eventos agendados. O seguro Premium tem chance
 * de DETECTAR/PREVENIR o dano antes que ocorra.
 */

import type { StadiumDamage, StadiumInsurance, EventSeverity } from './stadiumEvents';
import { DAMAGE_PROFILES } from './stadiumEvents';
import type { StadiumModules } from './stadiumEconomics';

export type WeatherKind = 'chuva_forte' | 'tempestade' | 'granizo' | 'vendaval' | 'onda_calor';

export interface WeatherEvent {
  kind: WeatherKind;
  label: string;
  emoji: string;
  severity: EventSeverity;
  /** chance base de causar dano se ocorrer (0-1) */
  damageChance: number;
}

const WEATHER_CATALOG: WeatherEvent[] = [
  { kind: 'chuva_forte', label: 'Chuva Forte',    emoji: '🌧️', severity: 'baixo',   damageChance: 0.25 },
  { kind: 'tempestade',  label: 'Tempestade',     emoji: '⛈️', severity: 'medio',   damageChance: 0.45 },
  { kind: 'granizo',     label: 'Granizo',        emoji: '🧊', severity: 'alto',    damageChance: 0.60 },
  { kind: 'vendaval',    label: 'Vendaval',       emoji: '💨', severity: 'alto',    damageChance: 0.55 },
  { kind: 'onda_calor',  label: 'Onda de Calor',  emoji: '🥵', severity: 'baixo',   damageChance: 0.18 },
];

/**
 * Rola um evento climático. Probabilidade por dia ~ 8%.
 * Seguro Premium tem chance de PREVENIR o dano (cobertura preventiva).
 */
export interface WeatherRoll {
  triggered: boolean;
  prevented?: boolean;
  weather?: WeatherEvent;
  damage?: StadiumDamage;
  message?: string;
}

export function rollDailyWeather(
  modules: StadiumModules,
  insurance: StadiumInsurance,
): WeatherRoll {
  // 8% chance por tick diário
  if (Math.random() > 0.08) return { triggered: false };

  const weather = WEATHER_CATALOG[Math.floor(Math.random() * WEATHER_CATALOG.length)];

  // Rola dano
  if (Math.random() > weather.damageChance) {
    return {
      triggered: true, weather,
      message: `${weather.emoji} ${weather.label} passou pela região, mas o estádio resistiu sem danos.`,
    };
  }

  // Prevenção do seguro Premium (até 65% de chance de prever e mitigar)
  if (insurance.tier === 'premium' && Math.random() < 0.65) {
    return {
      triggered: true, weather, prevented: true,
      message: `🛡️👑 Equipe do seguro Premium detectou ${weather.label.toLowerCase()} a tempo e protegeu a estrutura. Sem danos!`,
    };
  }
  // Seguro Completo tem chance menor (30%)
  if (insurance.tier === 'completo' && Math.random() < 0.30) {
    return {
      triggered: true, weather, prevented: true,
      message: `🛡️ Seguro Completo mitigou os efeitos de ${weather.label.toLowerCase()}. Sem danos!`,
    };
  }

  // Dano confirmado
  const profile = DAMAGE_PROFILES[weather.severity];
  // Custo: usa manutenção semanal × fator de severidade × variância
  const baseCost = modules.weeklyMaintenance * 4 * profile.repairCostFactor;
  const repairCost = Math.round(baseCost * (0.6 + Math.random() * 0.5));

  const damage: StadiumDamage = {
    id: `dmg_w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    source: 'weather',
    sourceLabel: `${weather.emoji} ${weather.label}`,
    severity: weather.severity,
    capacityCutPct: profile.capacityCutPct,
    repairCost,
    repairDays: profile.repairDays,
    repairing: false,
    createdAt: new Date().toISOString(),
  };

  return {
    triggered: true, weather, damage,
    message: `${weather.emoji} ${weather.label} causou dano ${profile.label} ao estádio! Reparo: R$ ${(repairCost/1000).toFixed(0)}k`,
  };
}

// ─── Relatório financeiro consolidado ─────────────────────────────────────
export interface StadiumFinanceEntry {
  at: string;            // ISO
  category: 'evento' | 'seguro' | 'reparo' | 'manutencao' | 'vip_contrato' | 'partida';
  label: string;
  amount: number;        // positivo = receita, negativo = despesa
}

export interface StadiumFinanceSummary {
  windowDays: number;
  totalRevenue: number;
  totalExpense: number;
  net: number;
  byCategory: Record<string, { in: number; out: number }>;
  entries: StadiumFinanceEntry[];
}

export function summarizeFinance(
  entries: StadiumFinanceEntry[],
  windowDays = 30,
): StadiumFinanceSummary {
  const cutoff = Date.now() - windowDays * 24 * 3600_000;
  const filtered = entries.filter(e => new Date(e.at).getTime() >= cutoff);
  const byCategory: Record<string, { in: number; out: number }> = {};
  let totalRevenue = 0;
  let totalExpense = 0;

  for (const e of filtered) {
    if (!byCategory[e.category]) byCategory[e.category] = { in: 0, out: 0 };
    if (e.amount >= 0) {
      byCategory[e.category].in += e.amount;
      totalRevenue += e.amount;
    } else {
      byCategory[e.category].out += Math.abs(e.amount);
      totalExpense += Math.abs(e.amount);
    }
  }

  return {
    windowDays,
    totalRevenue,
    totalExpense,
    net: totalRevenue - totalExpense,
    byCategory,
    entries: filtered.slice().sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
  };
}

export const FINANCE_CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  evento:      { label: 'Eventos',           emoji: '🎤', color: 'text-fuchsia-300' },
  seguro:      { label: 'Seguro',            emoji: '🛡️', color: 'text-sky-300' },
  reparo:      { label: 'Reparos',           emoji: '🛠️', color: 'text-orange-300' },
  manutencao:  { label: 'Manutenção',        emoji: '🔧', color: 'text-slate-300' },
  vip_contrato:{ label: 'Contratos VIP',     emoji: '👑', color: 'text-amber-300' },
  partida:     { label: 'Bilheteria',        emoji: '🎟️', color: 'text-emerald-300' },
};
