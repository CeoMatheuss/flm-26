export type PlayerStatus = 'titular' | 'reserva' | 'promessa' | 'lesionado' | 'suspenso' | 'lista-transferencia' | 'indisponivel' | 'emprestado' | 'afastado' | 'fora' | 'negociando';

export const statusMeta: Record<PlayerStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  titular: { 
    label: 'Titular', 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-400/10', 
    border: 'border-emerald-400/20',
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
  },
  reserva: { 
    label: 'Reserva', 
    color: 'text-zinc-400', 
    bg: 'bg-zinc-400/10', 
    border: 'border-zinc-400/20',
    dot: 'bg-zinc-400'
  },
  promessa: { 
    label: 'Joia', 
    color: 'text-purple-400', 
    bg: 'bg-purple-400/10', 
    border: 'border-purple-400/20',
    dot: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.5)]'
  },
  lesionado: { 
    label: 'Lesionado', 
    color: 'text-red-400', 
    bg: 'bg-red-400/10', 
    border: 'border-red-400/20',
    dot: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]'
  },
  suspenso: { 
    label: 'Suspenso', 
    color: 'text-amber-400', 
    bg: 'bg-amber-400/10', 
    border: 'border-amber-400/20',
    dot: 'bg-amber-400'
  },
  'lista-transferencia': { 
    label: 'Listado', 
    color: 'text-sky-400', 
    bg: 'bg-sky-400/10', 
    border: 'border-sky-400/20',
    dot: 'bg-sky-400'
  },
  indisponivel: { 
    label: 'Indisponível', 
    color: 'text-white/20', 
    bg: 'bg-white/5', 
    border: 'border-white/10',
    dot: 'bg-white/20'
  },
  emprestado: { 
    label: 'Emprestado', 
    color: 'text-zinc-400', 
    bg: 'bg-zinc-400/10', 
    border: 'border-zinc-400/20',
    dot: 'bg-zinc-400 border border-white/20'
  },
  afastado: { 
    label: 'Afastado', 
    color: 'text-red-400/70', 
    bg: 'bg-red-400/5', 
    border: 'border-red-400/10',
    dot: 'bg-red-400/50'
  },
  fora: { 
    label: 'Fora', 
    color: 'text-zinc-500', 
    bg: 'bg-zinc-500/10', 
    border: 'border-zinc-500/20',
    dot: 'bg-zinc-500 shadow-[0_0_8px_rgba(113,113,122,0.5)]'
  },
  negociando: { 
    label: 'Análise', 
    color: 'text-amber-400', 
    bg: 'bg-amber-400/10', 
    border: 'border-amber-400/20',
    dot: 'bg-amber-400 animate-pulse'
  },
};

export const positionColors: Record<string, string> = {
  GOL: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  ZAG: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  LAT: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  VOL: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  MEI: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ATA: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

export const ovrTier = (ovr: number) => {
  if (ovr >= 85) return { 
    label: 'Elite', 
    color: 'text-amber-400', 
    ring: 'border-amber-400/50', 
    glow: 'shadow-[0_0_15px_rgba(251,191,36,0.3)]',
    bg: 'from-amber-400/20 to-transparent'
  };
  if (ovr >= 80) return { 
    label: 'Ouro', 
    color: 'text-amber-200', 
    ring: 'border-amber-200/40', 
    glow: 'shadow-[0_0_12px_rgba(253,246,178,0.2)]',
    bg: 'from-amber-200/15 to-transparent'
  };
  if (ovr >= 75) return { 
    label: 'Prata', 
    color: 'text-zinc-300', 
    ring: 'border-zinc-300/30', 
    glow: '',
    bg: 'from-zinc-300/10 to-transparent'
  };
  return { 
    label: 'Bronze', 
    color: 'text-orange-300/80', 
    ring: 'border-orange-300/20', 
    glow: '',
    bg: 'from-orange-300/5 to-transparent'
  };
};

export const attrConfig = [
  { key: 'vel', label: 'Veloc.', from: 'speed', icon: '⚡' },
  { key: 'fin', label: 'Finaliz.', from: 'shooting', icon: '🎯' },
  { key: 'def', label: 'Defesa', from: 'defending', icon: '🛡️' },
  { key: 'tec', label: 'Técnica', from: 'dribbling', icon: '🎨' },
  { key: 'tac', label: 'Tática', from: 'positioning', icon: '🧠' },
  { key: 'fis', label: 'Físico', from: 'physical', icon: '💪' },
  { key: 'pas', label: 'Passe', from: 'passing', icon: '📐' },
  { key: 'res', label: 'Resist.', from: 'workRate', icon: '🫁' },
];

export const getAttrValue = (player: any, key: string) => {
  const val = player[key] || player.attributes?.[key] || 50;
  return { value: val, sourceKey: key };
};

export const attrColorClass = (val: number) => {
  if (val >= 80) return 'from-emerald-400 to-emerald-500';
  if (val >= 60) return 'from-sky-400 to-sky-500';
  return 'from-red-400 to-red-500';
};

export const getPlayerStatus = (p: any, isStarter: boolean, isNegotiating?: boolean): PlayerStatus => {
  if (isNegotiating) return 'negociando';
  if (p.isLoaned) return 'emprestado';
  if (p.isInjured || p.injury) return 'lesionado';
  if (p.isSuspended) return 'suspenso';
  if (p.onTransferList) return 'lista-transferencia';
  if (p.isAfastado) return 'afastado';
  if (isStarter) return 'titular';
  if (p.age <= 20 && p.overall >= 70) return 'promessa';
  return 'reserva';
};

export const avgStamina = (players: any[]) => {
  if (!players.length) return 0;
  return Math.round(players.reduce((acc, p) => acc + (p.stamina || 0), 0) / players.length);
};

export const flagFor = (country?: string) => {
  const flags: Record<string, string> = {
    Brasil: '🇧🇷',
    Argentina: '🇦🇷',
    Portugal: '🇵🇹',
    França: '🇫🇷',
    Espanha: '🇪🇸',
    Inglaterra: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    Alemanha: '🇩🇪',
    Itália: '🇮🇹',
  };
  return flags[country || 'Brasil'] || '🇧🇷';
};
