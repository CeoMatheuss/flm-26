import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Settings, Sun, Moon, Monitor, GraduationCap, Bell, BellOff, Volume2, VolumeX, Download, Smartphone, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SettingsTab() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('flm-theme') as 'dark' | 'light') || 'dark';
  });
  const [tutorialCompleted, setTutorialCompleted] = useState<boolean>(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  
  const [matchNotifications, setMatchNotifications] = useState<boolean>(() => {
    return localStorage.getItem('flm-notifications-match') === 'true';
  });
  const [generalNotifications, setGeneralNotifications] = useState<boolean>(() => {
    return localStorage.getItem('flm-notifications-general') !== 'false'; // Default true
  });
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    return localStorage.getItem('flm-push-enabled') === 'true';
  });
  const [gameSounds, setGameSounds] = useState<boolean>(() => {
    return localStorage.getItem('flm-game-sounds') !== 'false'; // Default true
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    localStorage.setItem('flm-theme', theme);
  }, [theme]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('tutorial_completed').eq('user_id', user.id).maybeSingle();
      setTutorialCompleted(!!(data as any)?.tutorial_completed);
    })();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check current notification permission
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('flm-notifications-match', String(matchNotifications));
  }, [matchNotifications]);

  useEffect(() => {
    localStorage.setItem('flm-notifications-general', String(generalNotifications));
  }, [generalNotifications]);

  useEffect(() => {
    localStorage.setItem('flm-push-enabled', String(pushEnabled));
  }, [pushEnabled]);

  useEffect(() => {
    localStorage.setItem('flm-game-sounds', String(gameSounds));
  }, [gameSounds]);

  const toggleMatchNotifications = (checked: boolean) => {
    setMatchNotifications(checked);
    if (checked) {
      toast.success('Notificações de partida ativadas!');
    } else {
      toast.info('Notificações de partida desativadas.');
    }
  };

  const toggleGeneralNotifications = (checked: boolean) => {
    setGeneralNotifications(checked);
    if (checked) {
      toast.success('Notificações gerais ativadas!');
    } else {
      toast.info('Notificações gerais desativadas.');
    }
  };

  const toggleGameSounds = (checked: boolean) => {
    setGameSounds(checked);
    if (checked) {
      toast.success('Sons do jogo ativados!');
    } else {
      toast.info('Sons do jogo desativados.');
    }
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      toast.info('Para instalar, use a opção "Adicionar à tela de início" do seu navegador.');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('Obrigado por instalar o Football Life Manager!');
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleTogglePush = async (checked: boolean) => {
    if (!('Notification' in window)) {
      toast.error('Seu navegador não suporta notificações push.');
      return;
    }

    if (checked) {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === 'granted') {
        setPushEnabled(true);
        toast.success('Notificações Push ativadas com sucesso!');
      } else {
        setPushEnabled(false);
        toast.error('Permissão de notificação negada.');
      }
    } else {
      setPushEnabled(false);
      toast.info('Notificações Push desativadas.');
    }
  };

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">Sistema</h2>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Aparência
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Escolha o visual do jogo.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`relative rounded-xl border-2 p-3 transition-all duration-300 text-left ${
                theme === 'dark'
                  ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                  : 'border-border hover:border-muted-foreground/30 hover:bg-accent/50'
              }`}
            >
              <div className="rounded-lg overflow-hidden mb-2.5 border border-border/50">
                <div className="bg-[hsl(220,30%,8%)] p-2 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[hsl(42,90%,55%)]" />
                    <div className="h-1.5 w-12 rounded bg-[hsl(210,40%,95%)] opacity-80" />
                  </div>
                  <div className="h-1 w-full rounded bg-[hsl(220,25%,18%)]" />
                  <div className="h-1 w-3/4 rounded bg-[hsl(220,25%,18%)]" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Escuro</span>
              </div>
              {theme === 'dark' && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[8px] text-primary-foreground font-bold">✓</span>
                </div>
              )}
            </button>

            <button
              onClick={() => setTheme('light')}
              className={`relative rounded-xl border-2 p-3 transition-all duration-300 text-left ${
                theme === 'light'
                  ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                  : 'border-border hover:border-muted-foreground/30 hover:bg-accent/50'
              }`}
            >
              <div className="rounded-lg overflow-hidden mb-2.5 border border-border/50">
                <div className="bg-[hsl(210,60%,94%)] p-2 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[hsl(250,80%,62%)]" />
                    <div className="h-1.5 w-12 rounded bg-[hsl(220,40%,15%)] opacity-80" />
                  </div>
                  <div className="h-1 w-full rounded bg-[hsl(180,45%,88%)]" />
                  <div className="h-1 w-3/4 rounded bg-[hsl(170,50%,85%)]" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Sun className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">Claro</span>
              </div>
              {theme === 'light' && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[8px] text-primary-foreground font-bold">✓</span>
                </div>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Notificações
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Escolha quais alertas deseja receber.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">Início de Partida</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Aviso visual ao iniciar um jogo.</p>
            </div>
            <Switch 
              checked={matchNotifications} 
              onCheckedChange={toggleMatchNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">Notificações Gerais</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Leilões, propostas e mercado.</p>
            </div>
            <Switch 
              checked={generalNotifications} 
              onCheckedChange={toggleGeneralNotifications}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/10 pt-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">Notificações Push</span>
                {pushPermission === 'denied' && (
                  <span className="text-[8px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full uppercase font-bold">Bloqueado</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Alertas diretos no seu dispositivo.</p>
            </div>
            <Switch 
              checked={pushEnabled} 
              onCheckedChange={handleTogglePush}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            Aplicativo
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Instale o jogo para uma experiência completa.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            size="sm"
            className="w-full text-xs gap-2 bg-primary hover:bg-primary/90"
            onClick={handleInstallApp}
          >
            <Download className="h-3.5 w-3.5" />
            Instalar Web App (PWA)
          </Button>
          <p className="text-[9px] text-center text-muted-foreground">
            Instalando o app, você terá acesso rápido, modo tela cheia e melhor performance.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-primary" />
            Áudio
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Configure os efeitos sonoros.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">Sons do Jogo</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Efeitos de clique e interface.</p>
            </div>
            <Switch 
              checked={gameSounds} 
              onCheckedChange={toggleGameSounds}
            />
          </div>
        </CardContent>
      </Card>

      {!tutorialCompleted && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Tutorial
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">Conclua o tutorial para ganhar R$ 200.000.</p>
          </CardHeader>
          <CardContent>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs gap-2"
              onClick={() => window.dispatchEvent(new CustomEvent('flm:open-tutorial'))}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Abrir tutorial
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}