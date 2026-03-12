import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle, Newspaper } from 'lucide-react';

interface UpdateData {
  id: string;
  title: string;
  content: string;
  update_type: string;
  benefits: string[];
  created_at: string;
}

interface Props {
  update: UpdateData | null;
  open: boolean;
  onClose: () => void;
}

const typeLabels: Record<string, { label: string; color: string; icon: string }> = {
  feature: { label: 'Nova Funcionalidade', color: 'bg-emerald-500', icon: '🚀' },
  improvement: { label: 'Melhoria', color: 'bg-blue-500', icon: '⚡' },
  fix: { label: 'Correção', color: 'bg-orange-500', icon: '🔧' },
  info: { label: 'Informação', color: 'bg-primary', icon: '📢' },
  event: { label: 'Evento', color: 'bg-purple-500', icon: '🎉' },
};

export function UpdateAnnouncementModal({ update, open, onClose }: Props) {
  if (!update) return null;

  const typeInfo = typeLabels[update.update_type] || typeLabels.info;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`${typeInfo.color} text-white text-[10px]`}>
              {typeInfo.icon} {typeInfo.label}
            </Badge>
          </div>
          <DialogTitle className="text-base flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary" />
            {update.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {update.content}
          </p>

          {update.benefits && update.benefits.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Benefícios desta atualização:
              </p>
              <div className="space-y-1.5">
                {update.benefits.map((benefit, i) => (
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
