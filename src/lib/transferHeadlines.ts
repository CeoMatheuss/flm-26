// Gerador de manchetes variadas para o Diário do Futebol.
// Centraliza variedade textual + cálculo de importância (DESTAQUE).

export type TransferKind =
  | 'sale'
  | 'purchase'
  | 'buy_now'
  | 'free_agent'
  | 'auction_won'
  | 'loan_out'
  | 'loan_in'
  | 'loan_return'
  | 'international';

export interface HeadlineContext {
  playerName: string;
  playerPosition?: string;
  playerOverall?: number;
  fromClub?: string;
  toClub?: string;
  value?: number; // em reais
  loanSeasons?: number;
  isInternational?: boolean;
}

function fmtMoney(v?: number) {
  if (!v || v <= 0) return '';
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildHeadline(kind: TransferKind, ctx: HeadlineContext): string {
  const money = fmtMoney(ctx.value);
  const ovr = ctx.playerOverall ? ` (OVR ${ctx.playerOverall})` : '';
  const pos = ctx.playerPosition ? ` ${ctx.playerPosition}` : '';

  switch (kind) {
    case 'sale': {
      const variants = [
        `💰 ${ctx.fromClub} acerta venda de ${ctx.playerName}${ovr} ao ${ctx.toClub} por ${money}`,
        `✍️ ${ctx.toClub} anuncia a contratação de ${ctx.playerName}${ovr}${money ? ` por ${money}` : ''}`,
        `🤝 Negócio fechado: ${ctx.playerName}${pos}${ovr} troca o ${ctx.fromClub} pelo ${ctx.toClub}${money ? ` (${money})` : ''}`,
        `🔥 ${ctx.playerName} deixa o ${ctx.fromClub} rumo ao ${ctx.toClub}${money ? ` em acordo de ${money}` : ''}`,
      ];
      return pick(variants);
    }
    case 'buy_now': {
      const variants = [
        `⚡ COMPRA IMEDIATA! ${ctx.toClub} fatura ${ctx.playerName}${ovr} junto ao ${ctx.fromClub} por ${money}`,
        `⚡ Sem rodeios: ${ctx.toClub} ativa cláusula e leva ${ctx.playerName}${ovr} do ${ctx.fromClub} por ${money}`,
        `⚡ ${ctx.playerName} é do ${ctx.toClub}! Operação relâmpago tira o${pos.includes('A') ? '' : ''} jogador do ${ctx.fromClub} por ${money}`,
      ];
      return pick(variants);
    }
    case 'purchase': {
      const variants = [
        `🎯 ${ctx.toClub} reforça o elenco com ${ctx.playerName}${ovr}${money ? ` em negociação de ${money}` : ''}`,
        `📝 Acordo selado: ${ctx.playerName}${pos} assina com o ${ctx.toClub}${money ? ` (${money})` : ''}`,
      ];
      return pick(variants);
    }
    case 'free_agent': {
      const variants = [
        `🆓 ${ctx.toClub} agarra ${ctx.playerName}${ovr} no mercado de jogadores livres`,
        `📋 Sem custo de transferência: ${ctx.playerName}${pos} assina pelo ${ctx.toClub}`,
        `✨ ${ctx.playerName} encontra novo lar: ${ctx.toClub} acerta contrato com o atleta livre no mercado`,
      ];
      return pick(variants);
    }
    case 'auction_won': {
      const variants = [
        `🏆 LEILÃO! ${ctx.toClub} arremata ${ctx.playerName}${ovr} por ${money}`,
        `🔨 Martelo batido: ${ctx.playerName} é do ${ctx.toClub} após disputa acirrada no leilão (${money})`,
        `💸 ${ctx.toClub} dá o lance vencedor por ${ctx.playerName}${ovr} no leilão${money ? ` — ${money}` : ''}`,
      ];
      return pick(variants);
    }
    case 'loan_out': {
      const seasons = ctx.loanSeasons ?? 1;
      const variants = [
        `🔄 ${ctx.fromClub} empresta ${ctx.playerName}${ovr} ao ${ctx.toClub || 'novo clube'} por ${seasons} temporada${seasons > 1 ? 's' : ''}`,
        `📤 Empréstimo confirmado: ${ctx.playerName}${pos} deixa o ${ctx.fromClub} temporariamente`,
        `🤝 ${ctx.playerName} é cedido pelo ${ctx.fromClub} — receptor arca com o salário`,
      ];
      return pick(variants);
    }
    case 'loan_in': {
      const variants = [
        `📥 ${ctx.toClub} reforça elenco com ${ctx.playerName}${ovr} por empréstimo`,
        `🔁 ${ctx.playerName}${pos} chega ao ${ctx.toClub} em acordo de empréstimo`,
        `🆕 ${ctx.toClub} fecha empréstimo de ${ctx.playerName}${ovr} — clube assume os vencimentos`,
      ];
      return pick(variants);
    }
    case 'loan_return': {
      const variants = [
        `↩️ ${ctx.playerName} retorna ao ${ctx.toClub} após fim do empréstimo`,
        `🔚 Fim do ciclo: ${ctx.playerName}${pos} encerra empréstimo e volta para casa`,
      ];
      return pick(variants);
    }
    case 'international': {
      return `🌍 TRANSFERÊNCIA INTERNACIONAL! ${ctx.playerName}${ovr} cruza fronteiras: ${ctx.fromClub} → ${ctx.toClub}${money ? ` por ${money}` : ''}`;
    }
  }
}

/**
 * Define importância da notícia (1 normal, 2 destaque, 3 urgente).
 * - OVR ≥ 85 OU valor ≥ 20M  → 3 (urgente, vai pro topo)
 * - OVR ≥ 78 OU valor ≥ 5M   → 2 (destaque)
 * - Internacional sobe 1 nível
 */
export function computeImportance(ctx: HeadlineContext): number {
  let level = 1;
  if ((ctx.playerOverall ?? 0) >= 78 || (ctx.value ?? 0) >= 5_000_000) level = 2;
  if ((ctx.playerOverall ?? 0) >= 85 || (ctx.value ?? 0) >= 20_000_000) level = 3;
  if (ctx.isInternational) level = Math.min(3, level + 1);
  return level;
}

export function categoryFor(kind: TransferKind): string {
  if (kind === 'loan_out' || kind === 'loan_in' || kind === 'loan_return') return 'EMPRÉSTIMO';
  if (kind === 'free_agent') return 'CONTRATAÇÃO';
  if (kind === 'auction_won') return 'TRANSFERÊNCIA';
  return 'TRANSFERÊNCIA';
}
