import { useState } from 'react';
import { Globe, Trophy, Users, UserCog, Settings, FlaskConical, Menu, Wallet, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type AdminCategory =
  | 'leagues'
  | 'cups'
  | 'clubs'
  | 'players'
  | 'finance'
  | 'customization'
  | 'system'
  | 'simulation';

interface CategoryDef {
  id: AdminCategory;
  label: string;
  icon: React.ElementType;
}

const CATEGORIES: CategoryDef[] = [
  { id: 'leagues',       label: 'Ligas',          icon: Globe },
  { id: 'cups',          label: 'Copas',          icon: Trophy },
  { id: 'clubs',         label: 'Clubes',         icon: Users },
  { id: 'players',       label: 'Players',        icon: UserCog },
  { id: 'finance',       label: 'Financeiro',     icon: Wallet },
  { id: 'customization', label: 'Personalização', icon: Palette },
  { id: 'system',        label: 'Sistema',        icon: Settings },
  { id: 'simulation',    label: 'Simulação',      icon: FlaskConical },
];

interface Props {
  active: AdminCategory;
  onChange: (c: AdminCategory) => void;
  children: React.ReactNode;
}

export function AdminLayout({ active, onChange, children }: Props) {
  const [open, setOpen] = useState(false);

  const NavList = ({ onSelect }: { onSelect?: () => void }) => (
    <nav className="space-y-1 p-2">
      {CATEGORIES.map(c => {
        const Icon = c.icon;
        const isActive = active === c.id;
        return (
          <button
            key={c.id}
            onClick={() => { onChange(c.id); onSelect?.(); }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{c.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex w-full gap-3">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-56 shrink-0 sticky top-2 self-start">
        <div className="rounded-lg border bg-card">
          <div className="px-3 py-2.5 border-b">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Painel Admin</p>
          </div>
          <NavList />
        </div>
      </aside>

      <div className="flex-1 min-w-0 space-y-2">
        {/* Mobile/Tablet header with drawer */}
        <div className="lg:hidden flex items-center gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur py-1.5 -mx-1 px-1 border-b">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                <Menu className="h-3.5 w-3.5" /> Menu
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="px-3 py-3 border-b">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Painel Admin</p>
              </div>
              <ScrollArea className="h-[calc(100vh-60px)]">
                <NavList onSelect={() => setOpen(false)} />
              </ScrollArea>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            {(() => {
              const cur = CATEGORIES.find(c => c.id === active);
              if (!cur) return null;
              const Icon = cur.icon;
              return <><Icon className="h-4 w-4 text-primary" /><span className="text-sm font-bold">{cur.label}</span></>;
            })()}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
