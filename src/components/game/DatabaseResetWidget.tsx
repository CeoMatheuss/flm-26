import { useState, useEffect } from 'react';
import { AlertCircle, X, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dismissWidget, isWidgetDismissed } from '@/hooks/useDismissibleWidget';

interface Props {
  userId: string;
}

export function DatabaseResetWidget({ userId }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const widgetId = 'database_reset_warning_may_31';

  useEffect(() => {
    if (!isWidgetDismissed(widgetId, userId)) {
      setIsVisible(true);
    }
  }, [userId]);

  const handleDismiss = () => {
    dismissWidget(widgetId, userId);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-96 z-[60] animate-in slide-in-from-top-4 fade-in duration-500">
      <div className="bg-destructive/10 border border-destructive/50 backdrop-blur-md rounded-xl shadow-2xl p-4 space-y-3 relative overflow-hidden">
        {/* Background Decorative Icon */}
        <Database className="absolute -bottom-4 -right-4 h-24 w-24 text-destructive/5 rotate-12" />
        
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-bold text-destructive flex items-center gap-1.5">
                ⚠️ AVISO IMPORTANTE: RESET GLOBAL
              </p>
              <p className="text-xs font-medium text-foreground">
                O banco de dados será resetado dia 31/05.
              </p>
            </div>
          </div>
          <button 
            onClick={handleDismiss} 
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 relative z-10">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Para garantir o melhor desempenho e equilíbrio na nova temporada, todos os clubes, jogadores e finanças serão resetados no dia <strong>31 de maio</strong>. Prepare-se para o novo FLM!
          </p>
          
          <div className="pt-1">
            <Button 
              size="sm" 
              variant="destructive" 
              className="w-full h-8 text-xs font-bold uppercase tracking-wider"
              onClick={handleDismiss}
            >
              Estou Ciente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
