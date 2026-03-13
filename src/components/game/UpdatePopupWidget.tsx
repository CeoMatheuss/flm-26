import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Rocket, CheckCircle, Sparkles, Wrench, X } from 'lucide-react';

interface GameUpdate {
  id: string;
  title: string;
  version: string;
  description: string;
  fixes: string[];
  features: string[];
  ai_summary: string | null;
  published_at: string | null;
}

interface Props {
  userId: string;
}

export function UpdatePopupWidget({ userId }: Props) {
  const [latestUpdate, setLatestUpdate] = useState<GameUpdate | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const checkForUpdates = async () => {
      const { data } = await supabase
        .from('game_updates')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return;
      const update = data as unknown as GameUpdate;
      const lastSeen = localStorage.getItem('flm-last-update-seen');
      if (lastSeen !== update.id) {
        setLatestUpdate(update);
        setShowBanner(true);
      }
    };
    checkForUpdates();
  }, [userId]);

  const handleDismiss = () => {
    if (latestUpdate) {
      localStorage.setItem('flm-last-update-seen', latestUpdate.id);
    }
    setShowBanner(false);
  };

  const handleViewDetails = () => {
    setShowBanner(false);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    if (latestUpdate) {
      localStorage.setItem('flm-last-update-seen', latestUpdate.id);
    }
    setShowDetails(false);
  };

  if (!latestUpdate) return null;

  return (
    <>
      {/* Banner popup */}
      {showBanner && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 z-50 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="bg-card border border-primary/30 rounded-xl shadow-xl shadow-primary/10 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Rocket className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold">📢 Novidades da Atualização!</p>
                  <p className="text-[10px] text-muted-foreground">v{latestUpdate.version}</p>
                </div>
              </div>
              <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {latestUpdate.ai_summary && (
              <p className="text-[10px] text-muted-foreground line-clamp-3 leading-relaxed">
                {latestUpdate.ai_summary.slice(0, 150)}...
              </p>
            )}

            <div className="flex gap-1.5">
              <Button size="sm" className="flex-1 h-8 text-xs gap-1" onClick={handleViewDetails}>
                <Sparkles className="h-3 w-3" /> Ver Detalhes
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleDismiss}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full details dialog */}
      <Dialog open={showDetails} onOpenChange={handleCloseDetails}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-emerald-500 text-white text-[10px]">🚀 Atualização Disponível</Badge>
              <Badge variant="outline" className="text-[10px]">v{latestUpdate.version}</Badge>
            </div>
            <DialogTitle className="text-base flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              {latestUpdate.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {latestUpdate.ai_summary && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Resumo:
                </p>
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{latestUpdate.ai_summary}</p>
              </div>
            )}

            {latestUpdate.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{latestUpdate.description}</p>
            )}

            {latestUpdate.features.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Novidades:
                </p>
                {latestUpdate.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            )}

            {latestUpdate.fixes.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-orange-400" /> Correções:
                </p>
                {latestUpdate.fixes.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Wrench className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={handleCloseDetails} className="w-full gap-2">
              <CheckCircle className="h-4 w-4" /> Entendi!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
