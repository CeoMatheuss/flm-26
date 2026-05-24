import React from 'react';
import { ScoutV3, ScoutLevel } from '@/types/scoutingV3';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  User, 
  MapPin, 
  TrendingUp, 
  Zap, 
  Clock, 
  Star, 
  Award, 
  Play, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const LEVEL_CONFIG: Record<ScoutLevel, { color: string, label: string }> = {
  'Amador': { color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', label: 'Amador' },
  'Regional': { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'Regional' },
  'Nacional': { color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', label: 'Nacional' },
  'Internacional': { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Internacional' },
  'Elite Mundial': { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', label: 'Elite Mundial' }
};

interface ScoutCardProps {
  scout: ScoutV3;
  onFire?: (id: string) => void;
  onStartMission?: (scout: ScoutV3) => void;
}

export function ScoutCard({ scout, onFire, onStartMission }: ScoutCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const renderStat = (label: string, value: number, icon: React.ReactNode) => (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-wider">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className={value > 80 ? 'text-emerald-400' : value > 60 ? 'text-amber-400' : 'text-red-400'}>
          {value}
        </span>
      </div>
      <Progress value={value} className="h-1 bg-white/5" />
    </div>
  );

  return (
    <motion.div layout>
      <Card className={`group relative overflow-hidden transition-all duration-300 border-white/5 bg-zinc-950/40 hover:border-primary/30 ${isExpanded ? 'ring-1 ring-primary/20' : ''}`}>
        <div 
          className="p-4 sm:p-5 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-500 shadow-xl">
                {scout.avatar_url ? (
                  <img src={scout.avatar_url} alt={scout.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-700" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2">
                <div className={`h-6 w-6 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center shadow-lg`}>
                  <Award className={`h-3.5 w-3.5 ${scout.reputation > 80 ? 'text-emerald-400' : 'text-zinc-500'}`} />
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-black text-white text-base sm:text-lg uppercase italic truncate leading-none group-hover:text-primary transition-colors">
                  {scout.name}
                </h3>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-zinc-600" /> : <ChevronDown className="h-4 w-4 text-zinc-600" />}
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className={`text-[8px] font-black uppercase px-2 py-0 h-5 ${LEVEL_CONFIG[scout.level]?.color}`}>
                  {scout.level}
                </Badge>
                <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                  <MapPin className="h-3 w-3" /> {scout.country}
                </div>
                {scout.is_busy && (
                  <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[8px] font-black uppercase h-5">Em Missão</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase">
                  <Target className="h-3 w-3 text-primary" />
                  <span className="truncate">{scout.specialization}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase">
                  <Clock className="h-3 w-3 text-emerald-400" />
                  <span>{scout.seasons_remaining}T Restantes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-white/5"
            >
              <CardContent className="p-5 space-y-6 bg-black/40">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderStat('Potencial', scout.potential_evaluation, <TrendingUp className="h-3 w-3" />)}
                  {renderStat('Técnica', scout.technical_evaluation, <Zap className="h-3 w-3" />)}
                  {renderStat('Análise', scout.analysis_speed, <Clock className="h-3 w-3" />)}
                  {renderStat('Base', scout.youth_discovery, <Star className="h-3 w-3" />)}
                </div>

                <div className="grid grid-cols-2 gap-3 p-4 bg-black/40 rounded-2xl border border-white/5">
                  <div className="space-y-1">
                    <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Salário Semanal</p>
                    <p className="text-xs font-black text-emerald-400 font-mono italic">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(scout.salary)}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Região Preferida</p>
                    <p className="text-xs font-black text-primary uppercase italic truncate">
                      {scout.preferred_region}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    disabled={scout.is_busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartMission?.(scout);
                    }}
                    className="flex-1 h-11 bg-white text-black hover:bg-primary font-black uppercase text-[10px] tracking-widest gap-2"
                  >
                    <Play className="h-3 w-3" /> {scout.is_busy ? 'Ocupado' : 'Iniciar Missão'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        onClick={(e) => e.stopPropagation()}
                        className="h-11 w-11 rounded-xl text-zinc-600 hover:text-red-500 hover:bg-red-500/10 border border-white/5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-950 border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white uppercase font-black italic">Confirmar Demissão</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400 font-medium">
                          Tem certeza que deseja demitir {scout.name}? Esta ação não pode ser desfeita e você perderá o investimento feito no contrato.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 uppercase font-black text-[10px] tracking-widest">Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onFire?.(scout.id)}
                          className="bg-red-600 text-white hover:bg-red-700 uppercase font-black text-[10px] tracking-widest"
                        >
                          Demitir Profissional
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
