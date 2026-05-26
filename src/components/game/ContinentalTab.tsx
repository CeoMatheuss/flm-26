import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Calendar } from 'lucide-react';

interface ContinentalTabProps {
  club: any;
}

/**
 * Competições continentais são criadas SOMENTE após o encerramento da liga nacional.
 * Enquanto a liga estiver em curso, esta aba fica vazia (estado zerado) e mostra
 * a tela escura "DIA 05" indicando quando a continental será formada.
 */
export function ContinentalTab({ club: _club }: ContinentalTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black tracking-tighter flex items-center gap-2">
          <Trophy className="w-8 h-8 text-yellow-500" />
          COMPETIÇÕES CONTINENTAIS
        </h2>
        <p className="text-muted-foreground font-medium">
          O caminho para a glória eterna começa aqui.
        </p>
      </div>

      {/* Tela escura: aguardando fim da liga */}
      <Card className="overflow-hidden border-2 border-muted/30 bg-black">
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center text-center py-24 px-6 bg-gradient-to-b from-black via-zinc-950 to-black">
            <Calendar className="w-12 h-12 text-zinc-700 mb-6" />
            <div className="text-[11px] font-bold tracking-[0.3em] text-zinc-500 uppercase mb-3">
              Aguardando início
            </div>
            <div className="text-7xl md:text-8xl font-black tracking-tighter text-white mb-4">
              DIA 05
            </div>
            <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
              As competições continentais só serão formadas após o encerramento da liga nacional.
              No <span className="text-white font-bold">Dia 05</span> da próxima temporada, os clubes
              classificados serão sorteados.
            </p>
            <div className="mt-8 text-[10px] text-zinc-600 uppercase tracking-widest">
              Nenhuma competição ativa
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
