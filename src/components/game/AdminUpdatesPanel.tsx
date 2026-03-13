import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Megaphone, Plus, Eye, Rocket, Power, PowerOff, Trash2,
  RefreshCw, Sparkles, Wrench, CheckCircle, AlertTriangle, Loader2, FileText
} from 'lucide-react';

interface GameUpdate {
  id: string;
  title: string;
  version: string;
  description: string;
  fixes: string[];
  features: string[];
  ai_summary: string | null;
  status: string;
  author_id: string;
  created_at: string;
  published_at: string | null;
}

interface Props {
  userId: string;
}

export function AdminUpdatesPanel({ userId }: Props) {
  const [updates, setUpdates] = useState<GameUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUpdate, setPreviewUpdate] = useState<GameUpdate | null>(null);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [fixesText, setFixesText] = useState('');
  const [featuresText, setFeaturesText] = useState('');

  const loadUpdates = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('game_updates')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setUpdates(data as unknown as GameUpdate[]);

    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle();
    if (settings?.value) {
      const val = settings.value as any;
      setMaintenanceActive(val.active === true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUpdates(); }, [loadUpdates]);

  const saveUpdate = async (status: string = 'draft') => {
    if (!title.trim() || !version.trim()) {
      toast.error('Título e versão são obrigatórios');
      return null;
    }
    const fixes = fixesText.split('\n').filter(l => l.trim());
    const features = featuresText.split('\n').filter(l => l.trim());

    const { data, error } = await supabase.from('game_updates').insert([{
      title: title.trim(),
      version: version.trim(),
      description: description.trim(),
      fixes,
      features,
      status,
      author_id: userId,
      published_at: status === 'published' ? new Date().toISOString() : null,
    }]).select().single();

    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return null;
    }
    return data as unknown as GameUpdate;
  };

  const handleSaveDraft = async () => {
    const result = await saveUpdate('draft');
    if (result) {
      toast.success('Rascunho salvo!');
      resetForm();
      loadUpdates();
    }
  };

  const handleActivateUpdate = async () => {
    // Save as maintenance status + activate maintenance mode
    const fixes = fixesText.split('\n').filter(l => l.trim());
    const features = featuresText.split('\n').filter(l => l.trim());

    if (!title.trim() || !version.trim()) {
      toast.error('Título e versão são obrigatórios');
      return;
    }

    // Save update
    const { data: updateData, error: updateError } = await supabase.from('game_updates').insert([{
      title: title.trim(),
      version: version.trim(),
      description: description.trim(),
      fixes,
      features,
      status: 'maintenance',
      author_id: userId,
    }]).select().single();

    if (updateError) {
      toast.error('Erro ao salvar atualização');
      return;
    }

    // Activate maintenance mode
    await supabase.from('system_settings').upsert({
      key: 'maintenance_mode',
      value: { active: true, update_id: (updateData as any).id, activated_at: new Date().toISOString() } as any,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    });

    setMaintenanceActive(true);
    toast.success('🔧 Modo manutenção ativado! Jogadores estão bloqueados.');
    resetForm();
    loadUpdates();
  };

  const handleFinalizeUpdate = async (updateId: string) => {
    setGenerating(true);
    try {
      const update = updates.find(u => u.id === updateId);
      if (!update) return;

      // Generate AI summary
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Sessão expirada'); setGenerating(false); return; }

      let aiSummary = '';
      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            title: update.title,
            version: update.version,
            description: update.description,
            fixes: update.fixes,
            features: update.features,
          }),
        });
        const result = await res.json();
        aiSummary = result.summary || '';
      } catch {
        aiSummary = 'Atualização aplicada com sucesso! Confira as novidades.';
      }

      // Update the record to published
      await supabase.from('game_updates').update({
        status: 'published',
        ai_summary: aiSummary,
        published_at: new Date().toISOString(),
      }).eq('id', updateId);

      // Deactivate maintenance mode
      await supabase.from('system_settings').upsert({
        key: 'maintenance_mode',
        value: { active: false } as any,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      });

      setMaintenanceActive(false);
      toast.success('🚀 Atualização publicada! Jogadores verão o widget de novidades.');
      loadUpdates();
    } catch (e) {
      toast.error('Erro ao finalizar atualização');
    }
    setGenerating(false);
  };

  const handleToggleMaintenance = async () => {
    const newState = !maintenanceActive;
    await supabase.from('system_settings').upsert({
      key: 'maintenance_mode',
      value: { active: newState } as any,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    });
    setMaintenanceActive(newState);
    toast.success(newState ? '🔧 Manutenção ativada!' : '✅ Manutenção desativada!');
  };

  const handleDeleteUpdate = async (id: string) => {
    await supabase.from('game_updates').delete().eq('id', id);
    toast.success('Atualização removida');
    loadUpdates();
  };

  const handlePreview = (update?: GameUpdate) => {
    if (update) {
      setPreviewUpdate(update);
    } else {
      // Preview from form
      setPreviewUpdate({
        id: 'preview',
        title: title || 'Título',
        version: version || '0.0.0',
        description: description || '',
        fixes: fixesText.split('\n').filter(l => l.trim()),
        features: featuresText.split('\n').filter(l => l.trim()),
        ai_summary: null,
        status: 'draft',
        author_id: userId,
        created_at: new Date().toISOString(),
        published_at: null,
      });
    }
    setShowPreview(true);
  };

  const resetForm = () => {
    setTitle('');
    setVersion('');
    setDescription('');
    setFixesText('');
    setFeaturesText('');
    setShowCreate(false);
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    maintenance: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    published: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  const statusLabels: Record<string, string> = {
    draft: '📝 Rascunho',
    maintenance: '🔧 Em Manutenção',
    published: '🚀 Publicado',
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-bold">📢 Atualizações e Correções</p>
                <p className="text-[10px] text-muted-foreground">Gerencie atualizações e modo manutenção</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={maintenanceActive ? 'text-orange-400 border-orange-500/30 animate-pulse' : 'text-emerald-400 border-emerald-500/30'}>
                {maintenanceActive ? '🔧 Manutenção' : '✅ Online'}
              </Badge>
              <Button size="sm" variant="outline" onClick={loadUpdates} disabled={loading} className="h-7 w-7 p-0">
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={maintenanceActive ? 'destructive' : 'outline'}
          size="sm"
          className="h-10 text-xs gap-1.5"
          onClick={handleToggleMaintenance}
        >
          {maintenanceActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
          {maintenanceActive ? 'Desativar Manutenção' : 'Ativar Manutenção'}
        </Button>
        <Button
          size="sm"
          className="h-10 text-xs gap-1.5"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Nova Atualização
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showCreate && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Criar Atualização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-muted-foreground">Título</label>
                <Input placeholder="Ex: Atualização v2.4.0" value={title} onChange={e => setTitle(e.target.value)} className="text-xs h-8" maxLength={100} />
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">Versão</label>
                <Input placeholder="Ex: 2.4.0" value={version} onChange={e => setVersion(e.target.value)} className="text-xs h-8" maxLength={20} />
              </div>
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground">Descrição</label>
              <Textarea placeholder="Descreva o que mudou nesta atualização..." value={description} onChange={e => setDescription(e.target.value)} className="text-xs min-h-[60px]" maxLength={2000} />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground">🔧 Correções (uma por linha)</label>
              <Textarea placeholder="Bug corrigido no placar&#10;Erro na substituição resolvido" value={fixesText} onChange={e => setFixesText(e.target.value)} className="text-xs min-h-[60px]" maxLength={2000} />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground">✨ Novidades (uma por linha)</label>
              <Textarea placeholder="Nova simulação 2D&#10;Sistema de campeonatos" value={featuresText} onChange={e => setFeaturesText(e.target.value)} className="text-xs min-h-[60px]" maxLength={2000} />
            </div>
            <div className="flex gap-1.5 pt-1">
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={() => handlePreview()}>
                <Eye className="h-3 w-3" /> Ver Prévia
              </Button>
              <Button size="sm" variant="secondary" className="flex-1 h-8 text-xs gap-1" onClick={handleSaveDraft}>
                <FileText className="h-3 w-3" /> Salvar Rascunho
              </Button>
              <Button size="sm" className="flex-1 h-8 text-xs gap-1 bg-orange-600 hover:bg-orange-700 text-white" onClick={handleActivateUpdate}>
                <Wrench className="h-3 w-3" /> Ativar Atualização
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="w-full h-7 text-[10px] text-muted-foreground" onClick={resetForm}>
              Cancelar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Updates List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Atualizações ({updates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {updates.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhuma atualização criada ainda.</p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {updates.map(u => (
                  <div key={u.id} className="p-3 rounded-lg border border-border/50 bg-card/50 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Badge variant="outline" className={`text-[8px] ${statusColors[u.status] || ''}`}>
                            {statusLabels[u.status] || u.status}
                          </Badge>
                          <Badge variant="outline" className="text-[8px]">v{u.version}</Badge>
                        </div>
                        <p className="text-xs font-semibold">{u.title}</p>
                        {u.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{u.description}</p>}
                        <p className="text-[8px] text-muted-foreground mt-1">
                          {new Date(u.created_at).toLocaleString('pt-BR')}
                          {u.features.length > 0 && ` • ${u.features.length} novidade(s)`}
                          {u.fixes.length > 0 && ` • ${u.fixes.length} correção(ões)`}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[9px]" onClick={() => handlePreview(u)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        {u.status === 'maintenance' && (
                          <Button
                            size="sm"
                            className="h-6 px-2 text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={generating}
                            onClick={() => handleFinalizeUpdate(u.id)}
                          >
                            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />}
                          </Button>
                        )}
                        {u.status === 'draft' && (
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[9px] text-destructive" onClick={() => handleDeleteUpdate(u.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {u.ai_summary && (
                      <div className="p-2 rounded bg-primary/5 border border-primary/10">
                        <p className="text-[9px] font-semibold text-primary mb-1">🤖 Resumo IA:</p>
                        <p className="text-[10px] text-muted-foreground whitespace-pre-line">{u.ai_summary}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Prévia da Atualização
            </DialogTitle>
          </DialogHeader>
          {previewUpdate && (
            <UpdatePreviewContent update={previewUpdate} />
          )}
          <Button onClick={() => setShowPreview(false)} className="w-full gap-2">
            <CheckCircle className="h-4 w-4" /> Fechar Prévia
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UpdatePreviewContent({ update }: { update: GameUpdate }) {
  return (
    <div className="space-y-3">
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <Badge className="bg-emerald-500 text-white text-[10px]">🚀 Nova Atualização</Badge>
          <Badge variant="outline" className="text-[10px]">v{update.version}</Badge>
        </div>
        <h3 className="text-lg font-bold">{update.title}</h3>
      </div>

      {update.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{update.description}</p>
      )}

      {update.features.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Novidades:
          </p>
          {update.features.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      )}

      {update.fixes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-orange-400" /> Correções:
          </p>
          {update.fixes.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Wrench className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      )}

      {update.ai_summary && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Resumo IA:
          </p>
          <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{update.ai_summary}</p>
        </div>
      )}
    </div>
  );
}
