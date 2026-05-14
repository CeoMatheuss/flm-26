import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  AlertTriangle, 
  Flame, 
  History, 
  User, 
  ArrowUpRight,
  Dumbbell
} from 'lucide-react';
import { WeeklyTrainingResult, focusLabels } from '@/training/TrainingTypes';

interface TrainingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: any; // WeeklyTrainingResult | null
}

export function TrainingReportModal({ isOpen, onClose, result }: TrainingReportModalProps) {
  if (!result) return null;

  const hasDevelopment = result.developmentLogs.length > 0;
  const hasEvents = result.events.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader className="p-6 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-primary">
            <History className="h-5 w-5" />
            <DialogTitle className="text-xl font-bold">Resumo do Último Treino</DialogTitle>
          </div>
          <DialogDescription className="text-slate-400">
            Ciclo concluído na semana {result.week} da temporada.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 pt-4">
          <div className="space-y-6">
            {/* Eventos Dinâmicos */}
            {hasEvents && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Ocorrências e Eventos
                </h3>
                <div className="grid gap-3">
                  {result.events.map((ev: any) => (
                    <div key={ev.id} className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex items-start gap-3">
                      <span className="text-2xl">{ev.icon}</span>
                      <div>
                        <p className="font-bold text-sm text-slate-200">{ev.title}</p>
                        <p className="text-xs text-slate-400">{ev.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Evolução de Atributos */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Evolução de Atributos
              </h3>
              {hasDevelopment ? (
                <div className="grid gap-2">
                  {result.developmentLogs.map((log: any, idx: number) => (
                    <div key={idx} className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-800 p-2 rounded-full">
                          <User className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{log.playerName}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-tighter">
                            {focusLabels[log.attribute] || log.attribute}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                        <span className="text-slate-500 text-xs font-mono">{log.oldValue}</span>
                        <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold font-mono">{log.newValue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-900/30 rounded-lg border border-dashed border-slate-800">
                  <Dumbbell className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Nenhuma evolução de atributo neste ciclo.</p>
                  <p className="text-[10px] text-slate-600">Dica: Aumente a intensidade do treino ou invista no CT.</p>
                </div>
              )}
            </section>

            {/* Resumo de Condição */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Flame className="h-4 w-4" /> Impacto Físico
              </h3>
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Jogadores Processados</span>
                  <span className="text-slate-100 font-bold">{result.sessions.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Média de Fadiga Aplicada</span>
                  <span className="text-orange-400 font-bold">
                    -{Math.round(Object.values(result.fatigueApplied as Record<string, number>).reduce((a, b) => a + b, 0) / (result.sessions.length || 1))}% stamina
                  </span>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Entendido
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
