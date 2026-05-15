import { ArrowLeft, Menu, Wallet, Activity, Trophy } from 'lucide-react';
import { ClubShield } from '../ClubShield';
import { Club } from '@/types/game';
import { SeasonData } from '@/types/infrastructure';
import { formatMoney } from '@/lib/formatMoney';
import { avgStamina } from './squadHelpers';

interface Props {
  club: Club;
  season?: SeasonData;
  onBack?: () => void;
  onMenu?: () => void;
}

export function SquadHeader({ club, season, onBack, onMenu }: Props) {
  const energy = avgStamina(club.players);
  const energyColor = energy >= 70 ? 'text-emerald-400' : energy >= 40 ? 'text-amber-400' : 'text-red-400';

  const handleBack = () => {
    if (onBack) return onBack();
    window.dispatchEvent(new CustomEvent('flm:navigate-to-tab', { detail: { tab: 'dashboard' } }));
  };
  const handleMenu = () => {
    if (onMenu) return onMenu();
    window.dispatchEvent(new CustomEvent('flm:open-mobile-menu'));
  };

  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-xl border-b border-emerald-500/10
                 bg-gradient-to-r from-zinc-950/95 via-zinc-900/90 to-zinc-950/95"
    >
      <div className="px-3 sm:px-5 py-2.5 flex items-center gap-3">
        <button
          onClick={handleBack}
          aria-label="Voltar"
          className="shrink-0 w-9 h-9 rounded-xl bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400
                     border border-white/10 flex items-center justify-center text-white/70 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <ClubShield club={club as any} size={36} className="shrink-0 drop-shadow-lg" />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white truncate leading-tight">{club.name}</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
              Temporada {season?.currentSeason ?? 1}
            </p>
          </div>
        </div>

        {/* Stats — money + energy */}
        <div className="hidden sm:flex items-center gap-2">
          <Stat
            icon={<Wallet className="h-3 w-3" />}
            label="Caixa"
            value={formatMoney(club.budget)}
            valueClass="text-emerald-400"
          />
          <div className="h-8 w-px bg-white/5" />
          <Stat
            icon={<Activity className="h-3 w-3" />}
            label="Energia"
            value={`${energy}%`}
            valueClass={energyColor}
          />
        </div>

        {/* Compact stats for mobile */}
        <div className="flex sm:hidden flex-col items-end mr-1">
          <span className="text-[11px] font-bold text-emerald-400 leading-none">{formatMoney(club.budget)}</span>
          <span className={`text-[9px] font-bold leading-none mt-0.5 ${energyColor}`}>⚡ {energy}%</span>
        </div>

        <button
          onClick={handleMenu}
          aria-label="Menu"
          className="shrink-0 w-9 h-9 rounded-xl bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400
                     border border-white/10 flex items-center justify-center text-white/70 transition-all"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function Stat({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-1 text-white/40">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span className={`text-xs font-bold ${valueClass || 'text-white'}`}>{value}</span>
    </div>
  );
}
