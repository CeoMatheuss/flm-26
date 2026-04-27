import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle, Rocket } from 'lucide-react';

// =============================================
// 🔄 CHANGELOG — Atualize aqui a cada versão!
// =============================================
export const GAME_VERSION = '1.5.0';

export const CHANGELOG = {
  version: GAME_VERSION,
  title: 'Atualização v1.5.0',
  type: 'feature' as const,
  description:
    'Novo sistema de atualizações! Agora a cada nova versão do jogo, você verá automaticamente o que mudou e por quê. Também removemos o antigo sistema de aprovação de atualizações pelo ADM — tudo fica mais direto e transparente.',
  benefits: [
    'Tela de changelog automática a cada nova versão',
    'Reações com emojis nas notícias do Jornal',
    'Remoção do fluxo de aprovação de atualizações',
    'Jornal mais limpo e focado nas notícias do seu clube',
  ],
};

const typeStyles: Record<string, { label: string; color: string; icon: string }> = {
  feature: { label: 'Nova Funcionalidade', color: 'bg-emerald-500', icon: '🚀' },
  improvement: { label: 'Melhoria', color: 'bg-blue-500', icon: '⚡' },
  fix: { label: 'Correção', color: 'bg-orange-500', icon: '🔧' },
  info: { label: 'Informação', color: 'bg-primary', icon: '📢' },
  event: { label: 'Evento', color: 'bg-purple-500', icon: '🎉' },
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function UpdateAnnouncementModal({ open, onClose }: Props) {
  const style = typeStyles[CHANGELOG.type] || typeStyles.info;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`${style.color} text-white text-[10px]`}>
              {style.icon} {style.label}
            </Badge>
            <Badge variant="outline" className="text-[10px]">v{CHANGELOG.version}</Badge>
          </div>
          <DialogTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            {CHANGELOG.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {CHANGELOG.description}
          </p>

          {CHANGELOG.benefits.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                O que mudou:
              </p>
              <div className="space-y-1.5">
                {CHANGELOG.benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={onClose} className="w-full gap-2">
            <CheckCircle className="h-4 w-4" />
            Entendi!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
