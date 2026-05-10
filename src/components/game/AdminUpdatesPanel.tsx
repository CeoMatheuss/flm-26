import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { RefreshCw, Play, Save, Trash2, Shield, Globe, Zap } from 'lucide-react';

export function AdminUpdatesPanel() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('feature');
  const [version, setVersion] = useState('');

  const loadUpdates = async () => {
    setLoading(true);
    const { data } = await supabase.from('game_updates').select('*').order('created_at', { ascending: false });
    if (data) setUpdates(data);
    setLoading(false);
  };

  useEffect(() => {
    loadUpdates();
  }, []);

  const createUpdate = async () => {
    if (!title || !content) return toast.error('Preencha título e conteúdo');
    setLoading(true);
    const { error } = await supabase.from('game_updates').insert([{ title, content, type, version }]);
    if (error) toast.error('Erro ao criar: ' + error.message);
    else {
      toast.success('Atualização publicada!');
      setTitle(''); setContent(''); setVersion('');
      loadUpdates();
    }
    setLoading(false);
  };

  const deleteUpdate = async (id: string) => {
    const { error } = await supabase.from('game_updates').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else {
      toast.success('Excluído');
      loadUpdates();
    }
  };

  return (
    <div className="space-y-4">
      {/* NOVO: National Cup Automation Control */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs uppercase flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-400" /> Automação de Copas Nacionais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-4 px-4">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Controle manual do novo sistema de Copas Nacionais (Brasil, Inglaterra, etc). 
            O sorteio ocorre automaticamente no Dia 10.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button 
              size="sm" 
              className="text-[10px] gap-1"
              onClick={async () => {
                setLoading(true);
                const { error } = await supabase.functions.invoke('national-cup-manager', { body: { action: 'generate_all' } });
                setLoading(false);
                if (error) toast.error(error.message); else toast.success('Novas copas geradas para todos os países!');
              }}
              disabled={loading}
            >
              <Zap className="h-3 w-3" /> Gerar Copas (Dia 10)
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              className="text-[10px] gap-1 border-blue-500/20 text-blue-400"
              onClick={async () => {
                setLoading(true);
                const { data: cups } = await supabase.from('cup_competitions').select('id').eq('is_national_cup', true).eq('status', 'in_progress');
                if (cups) {
                  for (const cup of cups) {
                    await supabase.functions.invoke('national-cup-manager', { body: { action: 'draw_round', cupId: cup.id } });
                  }
                }
                setLoading(false);
                toast.success('Próximas fases sorteadas!');
              }}
              disabled={loading}
            >
              <RefreshCw className="h-3 w-3" /> Avançar Todas Fases
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs uppercase flex items-center gap-2">
            <Play className="h-4 w-4" /> Nova Atualização UI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4 px-4">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Versão" value={version} onChange={e => setVersion(e.target.value)} className="h-8 text-xs" />
          </div>
          <Textarea placeholder="Descreva as mudanças..." value={content} onChange={e => setContent(e.target.value)} className="text-xs min-h-[60px]" />
          <Button size="sm" className="w-full h-8 text-xs" onClick={createUpdate} disabled={loading}>
            {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />} Publicar
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {updates.map(up => (
          <Card key={up.id} className="border-white/5 bg-white/[0.02]">
            <CardContent className="p-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[8px] h-4">{up.version || 'v?'}</Badge>
                    <span className="text-[11px] font-bold">{up.title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{up.content}</p>
                </div>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400/50 hover:text-red-400 hover:bg-red-400/10" onClick={() => deleteUpdate(up.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}