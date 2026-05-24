/**
 * Formata valores monetários em pt-BR de forma compacta e legível.
 * Exemplos:
 *   500           → "FL$ 500"
 *   1500          → "FL$ 1,5 mil"
 *   1000000       → "FL$ 1,0 mi"
 *   2500000       → "FL$ 2,5 mi"
 *   1000000000    → "FL$ 1,0 bi"
 */
export function formatMoney(value: number, opts?: { showSign?: boolean; compact?: boolean }): string {
  const showSign = opts?.showSign ?? false;
  const compact = opts?.compact ?? false; 
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : showSign && value > 0 ? '+' : '';

  if (!compact) {
    return `${sign}FL$ ${abs.toLocaleString('pt-BR')}`;
  }

  let formatted: string;
  if (abs >= 1_000_000_000) {
    formatted = `${(abs / 1_000_000_000).toFixed(1).replace('.', ',')} bi`;
  } else if (abs >= 1_000_000) {
    formatted = `${(abs / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  } else if (abs >= 1_000) {
    formatted = `${(abs / 1_000).toFixed(1).replace('.', ',')} mil`;
  } else {
    formatted = `${Math.round(abs)}`;
  }

  return `${sign}FL$ ${formatted}`;
}

/** Formato completo para tooltips ou contextos onde queremos o número exato. */
export function formatMoneyFull(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}FL$ ${Math.abs(value).toLocaleString('pt-BR')}`;
}

