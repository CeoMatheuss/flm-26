/**
 * instantFriendly.ts — Simulação INSTANTÂNEA de amistoso vs BOT.
 *
 * • Sem rota /match, sem espera, sem UI bloqueante.
 * • Usado pela aba "vs BOT" para 2 modos:
 *     - 'bot_balanced': OVR do BOT no range myOvr ± 2
 *     - 'bot_random':   OVR do BOT entre 40 e 90 (com leve viés ao redor do clube)
 * • Devolve placar + eventos + Δ torcida (calculado por friendlyRewards).
 * • A aplicação do Δ torcida no save é feita pelo chamador (useClubState),
 *   para manter este módulo puro/testável.
 */

import type { Player } from '@/types/game';
import { computeFanReward, outcomeFromScore, type FriendlyMode } from './friendlyRewards';

export interface InstantFriendlyInput {
  mode: Extract<FriendlyMode, 'bot_balanced' | 'bot_random'>;
  myClubName: string;
  myPlayers: Player[];
  currentFans: number;
  /** Casa/Fora — afeta vantagem de mando */
  isHome?: boolean;
}

export interface InstantFriendlyResult {
  myGoals: number;
  oppGoals: number;
  myOvr: number;
  oppOvr: number;
  oppName: string;
  fanChange: number;
  headline: string;
  events: Array<{ minute: number; team: 'home' | 'away'; description: string }>;
  outcome: 'win' | 'draw' | 'loss';
}

// ────────── helpers ──────────

function poisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function pickBotOvr(mode: 'bot_balanced' | 'bot_random', myOvr: number): number {
  if (mode === 'bot_balanced') {
    const delta = Math.floor(Math.random() * 5) - 2; // -2..+2
    return Math.max(35, Math.min(99, myOvr + delta));
  }
  // bot_random: 40..90, leve viés ao redor do clube para variar entre fácil/difícil
  const min = 40;
  const max = 90;
  // 70% range completo; 30% próximo do OVR (±15)
  if (Math.random() < 0.3) {
    const lo = Math.max(min, myOvr - 15);
    const hi = Math.min(max, myOvr + 15);
    return Math.floor(lo + Math.random() * (hi - lo + 1));
  }
  return Math.floor(min + Math.random() * (max - min + 1));
}

function computeMyOvr(players: Player[]): number {
  if (!players || players.length === 0) return 60;
  const healthy = players.filter(p => !(p as any).injured);
  const pool = (healthy.length > 0 ? healthy : players)
    .slice()
    .sort((a, b) => ((b as any).overall || (b as any).ovr || 0) - ((a as any).overall || (a as any).ovr || 0))
    .slice(0, 11);
  const sum = pool.reduce((s, p) => s + ((p as any).overall || (p as any).ovr || 60), 0);
  return Math.round(sum / Math.max(1, pool.length));
}

function pickBotName(): string {
  const list = [
    'Atlético FC', 'Sporting United', 'Real Praia', 'Olímpico SC',
    'Vitória EC', 'Cruzeiro do Sul', 'Estrela do Norte', 'Imperial FC',
    'Fênix FC', 'Lobos do Sul', 'Águia Dourada', 'Tigres FC',
    'Galáxia Sport', 'Cometas FC', 'Vulcão SC', 'Trovão Azul',
  ];
  return list[Math.floor(Math.random() * list.length)];
}

function pickScorerName(players: Player[], side: 'home' | 'away'): string {
  if (side === 'away') return 'Atacante BOT';
  // Pegamos um atacante do clube se houver
  const att = players.filter(p => ['ATA', 'ST', 'CF', 'PE', 'PD'].includes((p as any).position));
  const pool = att.length > 0 ? att : players;
  if (!pool || pool.length === 0) return 'Atacante';
  return (pool[Math.floor(Math.random() * pool.length)] as any).name || 'Atacante';
}

// ────────── core ──────────

export function simulateInstantFriendly(input: InstantFriendlyInput): InstantFriendlyResult {
  const myOvr = computeMyOvr(input.myPlayers);
  const oppOvr = pickBotOvr(input.mode, myOvr);
  const oppName = pickBotName();
  const isHome = input.isHome ?? true;

  const myStrength = Math.max(30, myOvr) * (isHome ? 1.10 : 1.0);
  const oppStrength = Math.max(30, oppOvr) * (isHome ? 1.0 : 1.05);
  const total = myStrength + oppStrength;

  const baseGoals = 2.6;
  const lambdaMine = baseGoals * (myStrength / total) * 1.02;
  const lambdaOpp = baseGoals * (oppStrength / total) * 0.98;

  const myGoals = Math.min(7, poisson(lambdaMine));
  const oppGoals = Math.min(7, poisson(lambdaOpp));
  const outcome = outcomeFromScore(myGoals, oppGoals);

  // Eventos de gol
  const events: InstantFriendlyResult['events'] = [];
  const usedMinutes = new Set<number>();
  const addGoal = (team: 'home' | 'away') => {
    let m = 0;
    let tries = 0;
    do { m = 1 + Math.floor(Math.random() * 90); tries++; } while (usedMinutes.has(m) && tries < 20);
    usedMinutes.add(m);
    const scorer = pickScorerName(input.myPlayers, team === 'home' ? (isHome ? 'home' : 'away') : (isHome ? 'away' : 'home'));
    events.push({
      minute: m,
      team,
      description: `⚽ GOOOL de ${scorer}!`,
    });
  };
  for (let i = 0; i < myGoals; i++) addGoal(isHome ? 'home' : 'away');
  for (let i = 0; i < oppGoals; i++) addGoal(isHome ? 'away' : 'home');
  events.sort((a, b) => a.minute - b.minute);

  const reward = computeFanReward({
    mode: input.mode,
    outcome,
    myOvr,
    oppOvr,
    currentFans: input.currentFans,
  });

  return {
    myGoals,
    oppGoals,
    myOvr,
    oppOvr,
    oppName,
    fanChange: reward.fanChange,
    headline: reward.headline,
    events,
    outcome,
  };
}
