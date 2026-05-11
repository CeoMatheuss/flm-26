import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Loader2 } from 'lucide-react';

interface Props {
  userId: string;
  onOpenTournament?: (id: string) => void;
}

export function CopasTab({ userId }: Props) {
  const [loading] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-dashed bg-muted/20">
      <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <Trophy className="h-12 w-12 text-muted-foreground/20" />
        <div className="space-y-1">
          <h3 className="text-lg font-bold">Copas Nacionais Desativadas</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            O sistema de copas nacionais foi removido para focar na experiência da Liga e Amistosos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
