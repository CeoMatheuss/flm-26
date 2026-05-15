import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Wrench, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MaintenanceMode {
  active: boolean;
  blocked_tabs: string[];
  message?: string;
}

const normalizeMaintenance = (value: unknown): MaintenanceMode => {
  if (!value || typeof value !== 'object') {
    return { active: false, blocked_tabs: [] };
  }

  const raw = value as Partial<MaintenanceMode>;
  return {
    active: raw.active === true,
    blocked_tabs: Array.isArray(raw.blocked_tabs) ? raw.blocked_tabs : [],
    message: typeof raw.message === 'string' ? raw.message : undefined,
  };
};

const ALL_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'squad', label: 'Elenco' },
  { id: 'tactics', label: 'Tática' },
  { id: 'market', label: 'Mercado' },
  { id: 'leagues', label: 'Ligas' },
  { id: 'stadium', label: 'Estádio' },
  { id: 'finances', label: 'Finanças' },
  { id: 'shop', label: 'Loja' },
  { id: 'auctions', label: 'Leilões' },
  { id: 'chat', label: 'Chat' },
];

export function MaintenanceToggle() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenance, setMaintenance] = useState<MaintenanceMode>({
    active: false,
    blocked_tabs: [],
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle();

      if (error) throw error;
      setMaintenance(normalizeMaintenance(data?.value));
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar status de manutenção');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGlobal = async (active: boolean) => {
    const newVal = { ...maintenance, active };
    setMaintenance(newVal);
    await saveSettings(newVal);
  };

  const handleToggleTab = async (tabId: string) => {
    const blockedTabs = Array.isArray(maintenance.blocked_tabs) ? maintenance.blocked_tabs : [];
    const isBlocked = blockedTabs.includes(tabId);
    const newBlocked = isBlocked
      ? blockedTabs.filter(id => id !== tabId)
      : [...blockedTabs, tabId];
    
    const newVal = { ...maintenance, blocked_tabs: newBlocked };
    setMaintenance(newVal);
    await saveSettings(newVal);
  };

  const saveSettings = async (val: MaintenanceMode) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'maintenance_mode',
          value: val as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;
      toast.success(val.active ? 'Manutenção GLOBAL ativada!' : 'Configurações de manutenção salvas!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Carregando...</div>;

  return (
    <Card className="border-orange-500/20 bg-orange-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-500" />
              Controle de Manutenção
            </CardTitle>
            <CardDescription>
              Ative a manutenção global ou bloqueie abas específicas.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 bg-background/50 p-2 rounded-lg border border-orange-500/20">
            <Label htmlFor="global-maintenance" className="font-bold text-orange-500 cursor-pointer">
              {maintenance.active ? 'MANUTENÇÃO ATIVA' : 'SISTEMA ONLINE'}
            </Label>
            <Switch
              id="global-maintenance"
              checked={maintenance.active}
              onCheckedChange={handleToggleGlobal}
              disabled={saving}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-background/40 border space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <ShieldAlert className="h-4 w-4 text-orange-500" />
              Bloqueio por Aba
            </div>
            <p className="text-[10px] text-muted-foreground">
              Selecione quais abas ficarão inacessíveis para jogadores comuns.
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              {ALL_TABS.map(tab => {
                const isBlocked = maintenance.blocked_tabs.includes(tab.id);
                return (
                  <Button
                    key={tab.id}
                    variant={isBlocked ? "destructive" : "outline"}
                    size="sm"
                    className="justify-start gap-2 h-8 text-[10px]"
                    onClick={() => handleToggleTab(tab.id)}
                    disabled={saving || maintenance.active}
                  >
                    {isBlocked ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-background/40 border space-y-3">
            <div className="text-sm font-bold">Status Atual</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Status Global:</span>
                {maintenance.active ? (
                  <Badge variant="destructive" className="animate-pulse">MANUTENÇÃO</Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/50">ONLINE</Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Abas Bloqueadas:</span>
                <span className="font-mono text-orange-500">{maintenance.blocked_tabs.length}</span>
              </div>
              {maintenance.blocked_tabs.length > 0 && !maintenance.active && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {maintenance.blocked_tabs.map(id => (
                    <Badge key={id} variant="secondary" className="text-[9px] h-4">
                      {ALL_TABS.find(t => t.id === id)?.label || id}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="pt-2">
              <p className="text-[9px] text-muted-foreground italic leading-tight">
                * Administradores e Fundadores ignoram essas restrições e podem continuar testando o jogo normalmente.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
