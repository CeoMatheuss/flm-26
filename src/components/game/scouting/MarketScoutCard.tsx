import React from 'react';
import { ScoutMarketPool, ScoutLevel } from '@/types/scoutingV3';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  MapPin, 
  TrendingUp, 
  Zap, 
  Briefcase,
  Star,
  Award,
  Globe
} from 'lucide-react';
import { motion } from 'framer-motion';

const LEVEL_CONFIG: Record<ScoutLevel, { color: string, label: string }> = {
  'Amador': { color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', label: 'Amador' },
  'Regional': { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'Regional' },
  'Nacional': { color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', label: 'Nacional' },
  'Internacional': { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Internacional' },
  'Elite Mundial': { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', label: 'Elite Mundial' }
};

interface MarketScoutCardProps {
  scout: ScoutMarketPool;
  onHire: (scout: ScoutMarketPool) => void;
  canAfford: boolean;
}

export function MarketScoutCard({ scout, onHire, canAfford }: MarketScoutCardProps) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-500 border-white/5 bg-zinc-950/60 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity pointer-events-none">
        <Globe className="w-24 h-24 text-white" />
      </div>

      <CardContent className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-700">
              <User className="w-8 h-8 text-zinc-700" />
            </div>
            <div className="absolute -bottom-1.5 -right-1.5">
              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-black">
                <Star className="h-3 w-3 fill-current" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-black text-white text-lg uppercase italic truncate leading-tight group-hover:text-primary transition-colors">
              {scout.name}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge className={`text-[8px] font-black uppercase h-4 px-1.5 ${LEVEL_CONFIG[scout.level]?.color}`}>
                {scout.level}
              </Badge>
              <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                <MapPin className="h-3 w-3" /> {scout.country}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-zinc-500">
              <TrendingUp className="h-3 w-3" /> Potencial
            </div>
            <div className="text-sm font-black text-white italic">{scout.potential_evaluation}</div>
          </div>
          <div className="space-y-1 text-right">
            <div className="flex items-center gap-1.5 justify-end text-[9px] font-black uppercase text-zinc-500">
              <Zap className="h-3 w-3" /> Técnica
            </div>
            <div className="text-sm font-black text-white italic">{scout.technical_evaluation}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-emerald-400" />
              <div className="space-y-0.5">
                <p className="text-[8px] text-zinc-500 font-black uppercase">Pretensão Salarial</p>
                <p className="text-xs font-black text-emerald-400 font-mono">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(scout.salary)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] text-zinc-500 font-black uppercase">Foco</p>
              <p className="text-[10px] font-bold text-white uppercase italic">{scout.specialization}</p>
            </div>
          </div>

          <Button 
            onClick={() => onHire(scout)}
            disabled={!canAfford}
            className={`w-full h-11 font-black uppercase tracking-widest text-[10px] transition-all shadow-xl ${
              canAfford 
                ? 'bg-primary text-black hover:bg-white' 
                : 'bg-zinc-800 text-zinc-500 border-white/5'
            }`}
          >
            Assinar Contrato Profissional
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
