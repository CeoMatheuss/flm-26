import { Player, PlayerAttributes } from '@/types/game';

export type PlayerStatus = 'titular' | 'reserva' | 'lesionado' | 'suspenso' | 'promessa' | 'transferivel';

export const statusMeta: Record<PlayerStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  titular:      { label: 'Titular',      color: 'text-emerald-300', bg: 'bg-emerald-500/10',  border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  reserva:      { label: 'Reserva',      color: 'text-zinc-300',    bg: 'bg-zinc-500/10',     border: 'border-zinc-500/30',    dot: 'bg-zinc-400' },
  lesionado:    { label: 'Lesionado',    color: 'text-red-300',     bg: 'bg-red-500/10',      border: 'border-red-500/30',     dot: 'bg-red-400' },
  suspenso:     { label: 'Suspenso',     color: 'text-purple-300',  bg: 'bg-purple-500/10',   border: 'border-purple-500/30',  dot: 'bg-purple-400' },
  promessa:     { label: 'Promessa',     color: 'text-sky-300',     bg: 'bg-sky-500/10',      border: 'border-sky-500/30',     dot: 'bg-sky-400' },
  transferivel: { label: 'Transferível', color: 'text-amber-300',   bg: 'bg-amber-500/10',    border: 'border-amber-500/30',   dot: 'bg-amber-400' },
};

export function getPlayerStatus(player: Player, isStarter: boolean, listed: string[] = []): PlayerStatus {
  if (player.injury) return 'lesionado';
  if ((player as any).suspended) return 'suspenso';
  if (listed.includes(player.id)) return 'transferivel';
  if (isStarter) return 'titular';
  if (player.age <= 21 && player.overall >= 65) return 'promessa';
  return 'reserva';
}

export function ovrTier(ovr: number): { label: string; color: string; ring: string; glow: string } {
  if (ovr >= 85) return { label: 'Elite',     color: 'text-emerald-300', ring: 'border-emerald-400/50', glow: 'shadow-[0_0_18px_rgba(16,185,129,0.45)]' };
  if (ovr >= 75) return { label: 'Muito bom', color: 'text-sky-300',     ring: 'border-sky-400/50',     glow: 'shadow-[0_0_14px_rgba(56,189,248,0.35)]' };
  if (ovr >= 65) return { label: 'Médio',     color: 'text-amber-300',   ring: 'border-amber-400/50',   glow: '' };
  return         { label: 'Ruim',      color: 'text-red-400',     ring: 'border-red-500/40',     glow: '' };
}

export const positionColors: Record<string, string> = {
  GOL: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  ZAG: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  LAT: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  VOL: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  MEI: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  ATA: 'bg-red-500/15 text-red-300 border-red-500/30',
};

/** Friendly labels for the 11 attributes shown in the player panel. */
export const attrConfig: { key: keyof PlayerAttributes | 'leadership' | 'reflexes' | 'endurance'; label: string; from: keyof PlayerAttributes | (keyof PlayerAttributes)[]; }[] = [
  { key: 'passing',     label: 'Passe',          from: 'passing' },
  { key: 'shooting',    label: 'Finalização',    from: 'shooting' },
  { key: 'defending',   label: 'Defesa',         from: 'defending' },
  { key: 'speed',       label: 'Velocidade',     from: 'speed' },
  { key: 'dribbling',   label: 'Drible',         from: 'dribbling' },
  { key: 'marking',     label: 'Interceptação',  from: 'marking' },
  { key: 'physical',    label: 'Físico',         from: 'physical' },
  { key: 'endurance',   label: 'Resistência',    from: ['workRate', 'physical'] },
  { key: 'reflexes',    label: 'Reflexo',        from: ['goalkeeping', 'composure'] },
  { key: 'positioning', label: 'Posicionamento', from: 'positioning' },
  { key: 'leadership',  label: 'Liderança',      from: ['composure', 'workRate'] },
];

export function getAttrValue(p: Player, from: keyof PlayerAttributes | (keyof PlayerAttributes)[]): { value: number; sourceKey: keyof PlayerAttributes } {
  const keys = Array.isArray(from) ? from : [from];
  for (const k of keys) {
    const v = (p.attributes as any)[k];
    if (typeof v === 'number') return { value: v, sourceKey: k };
  }
  // Fallback: derived from overall
  return { value: Math.max(20, p.overall - 10), sourceKey: keys[0] };
}

export function attrColorClass(val: number): string {
  if (val >= 80) return 'from-emerald-400 to-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
  if (val >= 65) return 'from-sky-400 to-sky-500';
  if (val >= 50) return 'from-amber-400 to-amber-500';
  return 'from-red-400 to-red-500';
}

export function avgStamina(players: Player[]): number {
  if (!players.length) return 0;
  return Math.round(players.reduce((s, p) => s + (p.stamina ?? 0), 0) / players.length);
}

export const countryFlag: Record<string, string> = {
  Brasil: '🇧🇷', Argentina: '🇦🇷', Portugal: '🇵🇹', Espanha: '🇪🇸', Inglaterra: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  França: '🇫🇷', Alemanha: '🇩🇪', Itália: '🇮🇹', Holanda: '🇳🇱', Bélgica: '🇧🇪',
  Uruguai: '🇺🇾', Chile: '🇨🇱', Colômbia: '🇨🇴', México: '🇲🇽', EUA: '🇺🇸',
  Japão: '🇯🇵', Coreia: '🇰🇷', Marrocos: '🇲🇦', Senegal: '🇸🇳', Nigéria: '🇳🇬',
};

export function flagFor(country?: string): string {
  if (!country) return '🌍';
  return countryFlag[country] || '🌐';
}
