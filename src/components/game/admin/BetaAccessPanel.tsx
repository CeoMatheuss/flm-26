import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Mail, CheckCircle2, XCircle, Trash2, Plus, RefreshCw, ShieldCheck, Clock } from 'lucide-react';

interface Request {
  id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string | null;
  created_at: string;
  reviewed_at: string | null;
}
interface WhitelistEntry {
  id: string;
  email: string;
  created_at: string;
}

export function BetaAccessPanel() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [newEmail, setNewEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [reqRes, wlRes] = await Promise.all([
      supabase.from('beta_access_requests').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('beta_whitelist').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    if (reqRes.data) setRequests(reqRes.data as Request[]);
    if (wlRes.data) setWhitelist(wlRes.data as WhitelistEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    const { error } = await supabase.rpc('approve_beta_request', { _request_id: id });
    if (error) {
      toast.error('Erro ao aprovar: ' + error.message);
    } else {
      toast.success('Solicitação aprovada e adicionada à whitelist!');
      load();
    }
  };

  const reject = async (id: string) => {
    const { error } = await supabase.rpc('reject_beta_request', { _request_id: id });
    if (error) toast.error('Erro ao recusar: ' + error.message);
    else { toast.info('Solicitação recusada.'); load(); }
  };

  const removeFromWhitelist = async (id: string, email: string) => {
    if (!confirm(`Remover ${email} da whitelist?`)) return;
    const { error } = await supabase.from('beta_whitelist').delete().eq('id', id);
    if (error) toast.error('Erro ao remover');
    else { toast.success('Removido da whitelist'); load(); }
  };

  const addToWhitelist = async () => {
    const lower = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) {
      toast.error('Email inválido');
      return;
    }
    const { error } = await supabase.from('beta_whitelist').insert({ email: lower });
    if (error) {
      if (error.code === '23505') toast.info('Email já está na whitelist');
      else toast.error('Erro ao adicionar: ' + error.message);
    } else {
      toast.success('Adicionado à whitelist!');
      setNewEmail('');
      load();
    }
  };

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Acesso BETA</h3>
          {pendingCount > 0 && <Badge variant="destructive" className="text-[10px]">{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</Badge>}
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="h-7 gap-1 text-xs">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {/* Solicitações */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="h-4 w-4" /> Solicitações de Acesso
          </CardTitle>
          <div className="flex gap-1 mt-2">
            {(['pending','approved','rejected','all'] as const).map(s => (
              <Button
                key={s}
                size="sm"
                variant={filter === s ? 'default' : 'outline'}
                onClick={() => setFilter(s)}
                className="h-6 text-[10px] px-2"
              >
                {s === 'pending' ? 'Pendentes' : s === 'approved' ? 'Aprovadas' : s === 'rejected' ? 'Recusadas' : 'Todas'}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhuma solicitação.</p>
            ) : (
              <div className="space-y-1.5">
                {filtered.map(r => (
                  <div key={r.id} className="p-2.5 rounded-md border bg-card/50 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold truncate">{r.email}</span>
                        {r.status === 'pending' && <Badge variant="secondary" className="text-[9px] gap-1"><Clock className="h-2.5 w-2.5" />Pendente</Badge>}
                        {r.status === 'approved' && <Badge className="text-[9px] gap-1 bg-success"><CheckCircle2 className="h-2.5 w-2.5" />Aprovada</Badge>}
                        {r.status === 'rejected' && <Badge variant="destructive" className="text-[9px] gap-1"><XCircle className="h-2.5 w-2.5" />Recusada</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString('pt-BR')}</p>
                      {r.message && <p className="text-[10px] text-muted-foreground italic truncate">"{r.message}"</p>}
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" onClick={() => approve(r.id)} className="h-7 px-2 gap-1 text-[10px]">
                          <CheckCircle2 className="h-3 w-3" /> Aprovar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => reject(r.id)} className="h-7 px-2 gap-1 text-[10px]">
                          <XCircle className="h-3 w-3" /> Recusar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Whitelist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Whitelist ({whitelist.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-1.5">
            <Input
              type="email"
              placeholder="email@gmail.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="h-8 text-xs"
            />
            <Button size="sm" onClick={addToWhitelist} className="h-8 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Adicionar
            </Button>
          </div>
          <ScrollArea className="h-48">
            {whitelist.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Whitelist vazia.</p>
            ) : (
              <div className="space-y-1">
                {whitelist.map(w => (
                  <div key={w.id} className="flex items-center justify-between p-2 rounded-md border bg-card/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{w.email}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeFromWhitelist(w.id, w.email)} className="h-7 w-7 p-0">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
