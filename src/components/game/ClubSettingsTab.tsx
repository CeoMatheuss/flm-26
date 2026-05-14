import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Pencil, Landmark, Check, Shield, X, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShieldCrest, ShieldConfig } from './ShieldCrest';
import { CrestBuilder, defaultShieldConfig } from './CrestBuilder';
import { shieldPropsFromClub, hasShield } from './shieldHelpers';

interface Props {
  clubName: string;
  stadiumName: string;
  shieldConfig?: ShieldConfig;
  // Legacy fallback fields
  primaryColor?: string;
  secondaryColor?: string;
  detailColor?: string;
  shieldPattern?: string;
  shieldShape?: string;
  shieldIcon?: string;
  onRenameClub: (name: string) => void;
  onRenameStadium: (name: string) => void;
  onUpdateShield?: (cfg: ShieldConfig) => void;
}

export function ClubSettingsTab({
  clubName, stadiumName, shieldConfig,
  primaryColor, secondaryColor, detailColor, shieldPattern, shieldShape, shieldIcon,
  onRenameClub, onRenameStadium, onUpdateShield,
}: Props) {
  const [editingClub, setEditingClub] = useState(false);
  const [editingStadium, setEditingStadium] = useState(false);
  const [newClubName, setNewClubName] = useState(clubName);
  const [newStadiumName, setNewStadiumName] = useState(stadiumName);
  const [shieldOpen, setShieldOpen] = useState(false);
  const [hasColorProduct, setHasColorProduct] = useState(false);
  const [newDetailColor, setNewDetailColor] = useState(detailColor || '#ffffff');

  useEffect(() => {
    async function checkProduct() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('shop_purchases').select('id').eq('user_id', user.id).eq('product_id', 'custom_name').eq('status', 'completed').maybeSingle();
      setHasColorProduct(!!data);
    }
    checkProduct();
  }, []);

  const handleUpdateColor = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('clubs').update({ detail_color: newDetailColor }).eq('user_id', user.id);
    if (!error) {
      toast.success('Cor do nome atualizada!');
    } else {
      toast.error('Erro ao atualizar cor.');
    }
  };

  // Build initial config for the editor: prefer shieldConfig, fallback to legacy fields
  const initialConfig: ShieldConfig = shieldConfig ?? defaultShieldConfig({
    shape: (shieldShape as any) || 'classic',
    pattern: (shieldPattern as any) || 'solid',
    icon: (shieldIcon as any) || 'star',
    primaryColor: primaryColor || '#2563EB',
    secondaryColor: secondaryColor || '#FFFFFF',
    detailColor: detailColor || '#DC2626',
  });

  const [draftConfig, setDraftConfig] = useState<ShieldConfig>(initialConfig);

  const openShieldEditor = () => {
    setDraftConfig(initialConfig);
    setShieldOpen(true);
  };

  const handleSaveShield = () => {
    onUpdateShield?.(draftConfig);
    setShieldOpen(false);
  };

  const clubLike = { shieldConfig, primaryColor, secondaryColor, detailColor, shieldPattern, shieldShape, shieldIcon };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm sm:text-lg">⚙️ Configurações do Clube</h3>

      {/* Shield Editor Card */}
      {onUpdateShield && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Escudo do Clube
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0 p-2 rounded-lg bg-card/60 border border-border/30">
                  {hasShield(clubLike as any) ? (
                    <ShieldCrest {...shieldPropsFromClub(clubLike as any)} size={56} />
                  ) : (
                    <ShieldCrest primaryColor="#2563EB" secondaryColor="#FFF" pattern="solid" shape="classic" size={56} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Personalize forma, cores, símbolo e mais.</p>
                </div>
              </div>
              <Button size="sm" onClick={openShieldEditor} className="shrink-0">
                <Pencil className="h-3 w-3 mr-1" /> Editar Escudo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Club Name */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" /> Nome do Clube
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editingClub ? (
            <div className="flex gap-2">
              <Input value={newClubName} onChange={e => setNewClubName(e.target.value)} className="text-sm" maxLength={30} />
              <Button size="sm" onClick={() => { onRenameClub(newClubName); setEditingClub(false); }} disabled={!newClubName.trim()}>
                <Check className="h-3 w-3 mr-1" /> Salvar
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="font-bold text-lg">{clubName}</p>
              <Button size="sm" variant="outline" onClick={() => { setNewClubName(clubName); setEditingClub(true); }}>
                <Pencil className="h-3 w-3 mr-1" /> Editar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stadium Name */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Landmark className="h-4 w-4 text-emerald-400" /> Nome do Estádio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editingStadium ? (
            <div className="flex gap-2">
              <Input value={newStadiumName} onChange={e => setNewStadiumName(e.target.value)} className="text-sm" maxLength={40} />
              <Button size="sm" onClick={() => { onRenameStadium(newStadiumName); setEditingStadium(false); }} disabled={!newStadiumName.trim()}>
                <Check className="h-3 w-3 mr-1" /> Salvar
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="font-bold text-lg">{stadiumName}</p>
              <Button size="sm" variant="outline" onClick={() => { setNewStadiumName(stadiumName); setEditingStadium(true); }}>
                <Pencil className="h-3 w-3 mr-1" /> Editar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Color Name Customization */}
      {hasColorProduct && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4 text-emerald-600" /> Cor Customizada do Nome
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                value={newDetailColor} 
                onChange={e => setNewDetailColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
              />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-2">Seu clube agora tem acesso a cores premium!</p>
                <Button size="sm" onClick={handleUpdateColor} className="bg-emerald-600 hover:bg-emerald-700">
                  <Check className="h-3 w-3 mr-1" /> Aplicar Cor
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shield Editor Sheet */}
      <Sheet open={shieldOpen} onOpenChange={setShieldOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-5xl xl:max-w-6xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Editor de Escudo
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <CrestBuilder value={draftConfig} onChange={setDraftConfig} showSaveButton={false} />
          </div>
          <SheetFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setShieldOpen(false)}>
              <X className="h-3 w-3 mr-1" /> Cancelar
            </Button>
            <Button onClick={handleSaveShield}>
              <Check className="h-3 w-3 mr-1" /> Salvar Escudo
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
