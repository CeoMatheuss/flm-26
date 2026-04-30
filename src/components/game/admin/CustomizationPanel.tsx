import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, CheckCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';

/**
 * 🎨 PERSONALIZAÇÃO — Painel isolado, libera/bloqueia edição visual do clube.
 * Sem qualquer relação com Financeiro, Premium ou Presentes.
 */
export function CustomizationPanel() {
  const [userId, setUserId] = useState('');
  const [busy, setBusy] = useState(false);

  const callGrant = async (grant: boolean) => {
    if (busy) return;
    const target = userId.trim();
    if (!target) { toast.error('❌ Cole o ID do usuário.'); return; }
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Sessão expirada'); return; }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-grant-customization`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ targetUserId: target, grant }),
        }
      );
      const result = await res.json();
      if (result.success) {
        toast.success(grant ? `✔ ${result.message}` : `🔒 ${result.message}`);
        setUserId('');
      } else {
        toast.error(result.error || '❌ Erro');
      }
    } catch {
      toast.error('❌ Erro de conexão');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          Liberar Personalização (R$ 10)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-[10px] text-muted-foreground">
          Cole o ID do usuário que pagou para desbloquear edição de nome do clube, estádio e escudo.
        </p>
        <Input
          placeholder="Cole o ID do usuário aqui"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          className="text-xs h-8 font-mono"
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black gap-1"
            disabled={busy || !userId.trim()}
            onClick={() => callGrant(true)}
          >
            <CheckCircle className="h-3 w-3" /> {busy ? '...' : 'Liberar'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            disabled={busy || !userId.trim()}
            onClick={() => callGrant(false)}
          >
            <Lock className="h-3 w-3" /> Bloquear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
