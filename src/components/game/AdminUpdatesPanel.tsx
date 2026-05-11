import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';

export function AdminUpdatesPanel() {
  return (
    <Card className="border-border/30 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-primary" /> Manutenção de Sistemas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[10px] text-muted-foreground">Sistema de copas removido. Painel focado em atualizações globais de liga e mercado.</p>
      </CardContent>
    </Card>
  );
}

export default AdminUpdatesPanel;