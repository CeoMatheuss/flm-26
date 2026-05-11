import { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';

export function CopasTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <Trophy className="h-12 w-12 text-muted-foreground/20" />
      <h3 className="text-lg font-bold">Sistema de Copas Desativado</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        O sistema de copas foi removido para focar totalmente em Ligas e Amistosos.
      </p>
    </div>
  );
}