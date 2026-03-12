import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function SettingsTab() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('flm-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    localStorage.setItem('flm-theme', theme);
  }, [theme]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">Configurações</h2>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Tema do Jogo
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Escolha entre o modo escuro ou claro.</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setTheme('dark')}
            >
              <Moon className="h-3.5 w-3.5" />
              Escuro
            </Button>
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setTheme('light')}
            >
              <Sun className="h-3.5 w-3.5" />
              Claro
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
