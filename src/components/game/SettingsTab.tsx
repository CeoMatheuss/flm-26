import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Settings, Sun, Moon, Monitor, GraduationCap, Bell, BellOff, Volume2, VolumeX, Download, Smartphone, Share2, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos de senha.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setIsChangingPassword(true);
    try {
      // First, we need to verify the current password. 
      // Supabase auth doesn't have a direct "verify password" for the current session without re-signing in or using updateCredentials which might trigger other flows.
      // The standard way in Supabase to update password is using updateUser.
      // However, for extra security (ensuring they know the current password), we can try to sign in again with the current password.
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Usuário não encontrado.');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        toast.error('Senha atual incorreta.');
        setIsChangingPassword(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswords(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Erro ao alterar a senha. Tente novamente.');
    } finally {
      setIsChangingPassword(false);
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
            <Lock className="h-4 w-4 text-primary" />
            Segurança
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Mantenha sua conta protegida.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Senha Atual</label>
                  <button 
                    type="button" 
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    {showPasswords ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showPasswords ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type={showPasswords ? "text" : "password"}
                    placeholder="Sua senha atual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10 h-11 bg-muted/30 border-border/50 focus:border-primary/50 transition-all rounded-xl text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Nova Senha</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      type={showPasswords ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 h-11 bg-muted/30 border-border/50 focus:border-primary/50 transition-all rounded-xl text-sm"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Confirmar Nova Senha</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      type={showPasswords ? "text" : "password"}
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pl-10 h-11 bg-muted/30 border-border/50 focus:border-primary/50 transition-all rounded-xl text-sm ${
                        confirmPassword && newPassword !== confirmPassword ? 'border-destructive/50' : ''
                      }`}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </div>
              
              {confirmPassword && newPassword !== confirmPassword && (
                <div className="flex items-center gap-1.5 px-1">
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  <p className="text-[10px] text-destructive font-medium">As senhas não coincidem.</p>
                </div>
              )}

              {newPassword && newPassword.length < 6 && (
                <div className="flex items-center gap-1.5 px-1">
                  <AlertCircle className="h-3 w-3 text-orange-400" />
                  <p className="text-[10px] text-orange-400 font-medium">A senha está muito curta (mínimo 6).</p>
                </div>
              )}
              
              {newPassword && newPassword.length >= 6 && newPassword === confirmPassword && (
                <div className="flex items-center gap-1.5 px-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <p className="text-[10px] text-emerald-500 font-medium">Nova senha válida!</p>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 font-bold transition-all shadow-lg shadow-primary/20 group overflow-hidden"
              disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  Alterar Senha
                  <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
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

// Helper to keep imports clean
const ChevronRight = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m9 18 6-6-6-6"/>
  </svg>
);