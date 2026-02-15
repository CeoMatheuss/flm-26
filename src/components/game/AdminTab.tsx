import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, CheckCircle, XCircle, Crown, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface PendingUser {
  id: string;
  user_id: string;
  status: string;
  pix_transaction_id: string | null;
  activated_at: string;
}

interface Props {
  userId: string;
}

export function AdminTab({ userId }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allPremium, setAllPremium] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
      if (data) loadPremiumUsers();
    };
    check();
  }, [userId]);

  const loadPremiumUsers = async () => {
    const { data } = await supabase
      .from('premium_users')
      .select('*')
      .order('activated_at', { ascending: false });
    if (data) {
      const typed = data as unknown as PendingUser[];
      setPendingUsers(typed.filter(u => u.status === 'pending'));
      setAllPremium(typed);
    }
  };

  const confirmPremium = async (premiumId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('premium_users')
      .update({ status: 'active' })
      .eq('id', premiumId);
    if (error) {
      toast.error('Erro ao confirmar: ' + error.message);
    } else {
      toast.success('✅ Premium ativado!');
      loadPremiumUsers();
    }
    setLoading(false);
  };

  const rejectPremium = async (premiumId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('premium_users')
      .update({ status: 'rejected' })
      .eq('id', premiumId);
    if (error) {
      toast.error('Erro ao rejeitar');
    } else {
      toast.success('Pedido rejeitado');
      loadPremiumUsers();
    }
    setLoading(false);
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Acesso restrito ao administrador.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-red-500/30 bg-gradient-to-r from-red-500/5 via-orange-500/5 to-yellow-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-400" />
            Painel do Administrador
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Gerencie pagamentos Premium, confirme PIX e administre o jogo.
          </p>
        </CardHeader>
      </Card>

      {/* Pending Payments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-400" />
            Pagamentos Pendentes ({pendingUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum pagamento pendente.</p>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {pendingUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">ID: {u.user_id.slice(0, 8)}...</p>
                      <p className="text-[9px] text-muted-foreground">
                        {u.pix_transaction_id || 'Sem referência'} • {new Date(u.activated_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="h-7 px-2 text-[10px] bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => confirmPremium(u.id)}
                        disabled={loading}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-[10px]"
                        onClick={() => rejectPremium(u.id)}
                        disabled={loading}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* All Premium Users */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-400" />
            Todos os Premium ({allPremium.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allPremium.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum usuário premium ainda.</p>
          ) : (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1">
                {allPremium.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded bg-muted/20">
                    <span className="text-[10px] font-mono truncate">{u.user_id.slice(0, 12)}...</span>
                    <Badge
                      variant="outline"
                      className={`text-[8px] ${
                        u.status === 'active' ? 'text-green-400 border-green-500/30' :
                        u.status === 'pending' ? 'text-yellow-400 border-yellow-500/30' :
                        'text-red-400 border-red-500/30'
                      }`}
                    >
                      {u.status === 'active' ? '✅ Ativo' : u.status === 'pending' ? '⏳ Pendente' : '❌ Rejeitado'}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
