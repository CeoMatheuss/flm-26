import { Wrench, AlertTriangle, Clock, LogOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import flmLogo from '@/assets/flm26-logo.png';

export function MaintenanceScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-orange-500/30 bg-gradient-to-br from-card via-card to-orange-500/5 shadow-xl shadow-orange-500/5">
        <CardContent className="p-6 sm:p-8 text-center space-y-5">
          <div className="flex justify-center">
            <img src={flmLogo} alt="FLM 26" className="w-16 h-16 rounded-xl opacity-80" />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-orange-500/10 animate-ping" />
            </div>
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Wrench className="h-8 w-8 text-orange-400 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              <h2 className="text-lg font-bold text-orange-400">Jogo em Atualização</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Estamos aplicando melhorias, correções e novas funcionalidades. 
              Aguarde alguns minutos enquanto finalizamos tudo.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <Clock className="h-4 w-4 text-orange-400 animate-pulse" />
            <span>A manutenção geralmente leva poucos minutos...</span>
          </div>

          <div className="space-y-1.5 text-[10px] text-muted-foreground">
            <p>Durante a manutenção você <span className="font-semibold text-orange-400">NÃO</span> pode:</p>
            <div className="grid grid-cols-2 gap-1">
              <span className="bg-muted/20 rounded px-2 py-1">⚽ Jogar partidas</span>
              <span className="bg-muted/20 rounded px-2 py-1">🏪 Transferências</span>
              <span className="bg-muted/20 rounded px-2 py-1">⚙️ Alterar táticas</span>
              <span className="bg-muted/20 rounded px-2 py-1">📊 Acessar simulação</span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/60">
            Obrigado pela paciência! 💚
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
