import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertTriangle, History, RotateCcw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { GAME_VERSION } from '@/components/game/UpdateAnnouncementModal';

interface VersionRow {
  user_id: string;
  game_version: string;
  data_version: string;
  migration_status: string;
  failed_attempts: number;
  last_migration_at: string | null;
  observation_until: string | null;
}
interface MigLog {
  id: string;
  user_id: string;
  from_version: string;
  to_version: string;
  status: string;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}
interface SuspRow {
  id: string;
  user_id: string;
  activity_type: string;
  severity: string;
  description: string;
  status: string;
  created_at: string;
}

function severityColor(s: string) {
  if (s === 'critical') return 'destructive';
  if (s === 'high') return 'destructive';
  if (s === 'medium') return 'default';
  return 'secondary';
}

export function AdminVersionPanel() {
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [logs, setLogs] = useState<MigLog[]>([]);
  const [suspicious, setSuspicious] = useState<SuspRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const [v, l, s] = await Promise.all([
      supabase.from('user_versions').select('*').order('updated_at', { ascending: false }).limit(100),
      supabase.from('migration_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('suspicious_activity').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setVersions((v.data as any) || []);
    setLogs((l.data as any) || []);
    setSuspicious((s.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const forceRollback = async (userId: string) => {
    const { data } = await supabase.from('user_versions').select('last_backup').eq('user_id', userId).maybeSingle();
    if (!data?.last_backup) {
      toast.error('Sem backup disponível para este usuário');
      return;
    }
    await supabase.from('game_saves').update({ club_data: data.last_backup as any }).eq('user_id', userId);
    await supabase.from('user_versions').update({ migration_status: 'idle', failed_attempts: 0 }).eq('user_id', userId);
    toast.success('Backup restaurado');
    reload();
  };

  const updateSuspStatus = async (id: string, status: string) => {
    await supabase.from('suspicious_activity').update({
      status,
      reviewed_at: new Date().toISOString(),
    } as any).eq('id', id);
    reload();
  };

  const outdatedCount = versions.filter(v => v.data_version !== GAME_VERSION).length;
  const failedCount = versions.filter(v => v.migration_status === 'failed').length;
  const pendingSusp = suspicious.filter(s => s.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Versão atual</div><div className="text-lg font-bold">{GAME_VERSION}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Desatualizados</div><div className="text-lg font-bold text-warning">{outdatedCount}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Falhas</div><div className="text-lg font-bold text-destructive">{failedCount}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Suspeitos pendentes</div><div className="text-lg font-bold text-destructive">{pendingSusp}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="versions">
        <TabsList>
          <TabsTrigger value="versions"><Shield className="h-4 w-4 mr-1" />Versões</TabsTrigger>
          <TabsTrigger value="logs"><History className="h-4 w-4 mr-1" />Logs</TabsTrigger>
          <TabsTrigger value="suspicious"><AlertTriangle className="h-4 w-4 mr-1" />Suspeitos</TabsTrigger>
        </TabsList>

        <TabsContent value="versions">
          <Card><CardHeader><CardTitle className="text-sm">Versão por usuário</CardTitle></CardHeader><CardContent>
            {loading ? <div className="text-sm text-muted-foreground">Carregando...</div> : versions.length === 0 ? <div className="text-sm text-muted-foreground">Nenhum registro</div> : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {versions.map(v => (
                  <div key={v.user_id} className="flex items-center justify-between bg-muted/30 rounded-lg p-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono truncate">{v.user_id}</div>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px]">{v.data_version} → {GAME_VERSION}</Badge>
                        <Badge variant={v.migration_status === 'failed' ? 'destructive' : v.migration_status === 'observation' ? 'default' : 'secondary'} className="text-[10px]">{v.migration_status}</Badge>
                        {v.failed_attempts > 0 && <Badge variant="destructive" className="text-[10px]">{v.failed_attempts} falhas</Badge>}
                      </div>
                    </div>
                    {v.migration_status === 'failed' && (
                      <Button size="sm" variant="outline" onClick={() => forceRollback(v.user_id)}>
                        <RotateCcw className="h-3 w-3 mr-1" />Rollback
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card><CardHeader><CardTitle className="text-sm">Histórico de migrations (100 últimas)</CardTitle></CardHeader><CardContent>
            {logs.length === 0 ? <div className="text-sm text-muted-foreground">Nenhum log</div> : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {logs.map(l => (
                  <div key={l.id} className="bg-muted/30 rounded-lg p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-mono truncate">{l.user_id}</div>
                      <Badge variant={l.status === 'success' ? 'default' : 'destructive'} className="text-[10px]">{l.status}</Badge>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {l.from_version} → {l.to_version} · {l.duration_ms}ms · {new Date(l.created_at).toLocaleString('pt-BR')}
                    </div>
                    {l.error_message && <div className="text-destructive mt-1">{l.error_message}</div>}
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="suspicious">
          <Card><CardHeader><CardTitle className="text-sm">Atividade suspeita</CardTitle></CardHeader><CardContent>
            {suspicious.length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma atividade detectada</div> : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {suspicious.map(s => (
                  <div key={s.id} className="bg-muted/30 rounded-lg p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono truncate flex-1">{s.user_id}</div>
                      <Badge variant={severityColor(s.severity) as any} className="text-[10px]">{s.severity}</Badge>
                      <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                    </div>
                    <div>{s.description}</div>
                    <div className="text-muted-foreground">{s.activity_type} · {new Date(s.created_at).toLocaleString('pt-BR')}</div>
                    {s.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateSuspStatus(s.id, 'dismissed')}>Ignorar</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateSuspStatus(s.id, 'confirmed')}><AlertTriangle className="h-3 w-3 mr-1" />Confirmar</Button>
                        <Button size="sm" onClick={() => updateSuspStatus(s.id, 'reviewed')}><CheckCircle2 className="h-3 w-3 mr-1" />Revisado</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
