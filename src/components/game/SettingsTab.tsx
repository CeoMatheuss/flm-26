import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Sun, Moon, Monitor, GraduationCap } from 'lucide-react';
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
    </div>
  );
}
