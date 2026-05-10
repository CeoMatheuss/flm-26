import { useState } from 'react';
import { ClubProfile, defaultClubProfile } from '@/types/clubProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { ShieldCrest, ShieldConfig } from './ShieldCrest';
import { CrestBuilder, defaultShieldConfig } from './CrestBuilder';
import { shieldPropsFromClub, hasShield } from './shieldHelpers';
import { Instagram, User, Edit3, Save, Quote, Calendar, Link2, Shield, Pencil, Landmark, Lock, Sparkles, Check, X, Copy } from 'lucide-react';
import { ClubShield } from './ClubShield';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/formatMoney';

interface Props {
  club: { name: string; stadiumName?: string; primaryColor?: string; secondaryColor?: string; shieldPattern?: string; shieldShape?: string; shieldIcon?: string; shieldConfig?: any; detailColor?: string; logoUrl?: string; fans: number; reputation: number; country?: string; budget?: number };
  season: number;
  profile: ClubProfile;
  onSave: (profile: ClubProfile) => void;
  onRenameClub?: (name: string) => void;
  onRenameStadium?: (name: string) => void;
  onUpdateShield?: (cfg: ShieldConfig) => void;
}

export function ClubProfileTab({ club, season, profile, onSave, onRenameClub, onRenameStadium, onUpdateShield }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);

  // Identity editing state
  const [editingClubName, setEditingClubName] = useState(false);
  const [editingStadium, setEditingStadium] = useState(false);
  const [newClubName, setNewClubName] = useState(club.name);
  const [newStadiumName, setNewStadiumName] = useState(club.stadiumName || 'Arena');
  const [shieldOpen, setShieldOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);

  const canEdit = !!profile.customizationUnlocked;

  const initialShieldConfig: ShieldConfig = (club as any).shieldConfig ?? defaultShieldConfig({
    shape: ((club as any).shieldShape as any) || 'classic',
    pattern: (club.shieldPattern as any) || 'solid',
    icon: ((club as any).shieldIcon as any) || 'star',
    primaryColor: club.primaryColor || '#2563EB',
    secondaryColor: club.secondaryColor || '#FFFFFF',
    detailColor: (club as any).detailColor || '#DC2626',
  });
  const [draftShield, setDraftShield] = useState<ShieldConfig>(initialShieldConfig);

  const handleSave = () => {
    onSave(form);
    setEditing(false);
    toast.success('Perfil do clube atualizado!');
  };

  const requireUnlock = (action: () => void) => {
    if (!canEdit) {
      setUnlockOpen(true);
      return;
    }
    action();
  };

  const openShieldEditor = () => requireUnlock(() => {
    setDraftShield(initialShieldConfig);
    setShieldOpen(true);
  });

  const handleSaveShield = () => {
    onUpdateShield?.(draftShield);
    setShieldOpen(false);
    toast.success('Escudo atualizado!');
  };

  const copyPix = () => {
    navigator.clipboard.writeText('flm26@pix.com');
    toast.success('Chave Pix copiada!');
  };

  // Format instagram as link
  const getInstagramUrl = (val: string) => {
    if (!val) return '';
    if (val.startsWith('http')) return val;
    const username = val.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
    return `https://instagram.com/${username}`;
  };

  const getInstagramDisplay = (val: string) => {
    if (!val) return '';
    if (val.startsWith('http')) {
      const match = val.match(/instagram\.com\/([^/?]+)/);
      return match ? `@${match[1]}` : val;
    }
    return val.startsWith('@') ? val : `@${val}`;
  };

  return (
    <div className="space-y-3">
      {/* Club card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <ClubShield club={club as any} size={72} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black">{club.name}</h2>
              {profile.motto && <p className="text-[10px] text-muted-foreground italic mt-0.5">"{profile.motto}"</p>}
              {/* Saldo Total — único valor financeiro exibido aqui (detalhes em Finanças) */}
              {typeof club.budget === 'number' && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 font-semibold">💰 Saldo</span>
                  <span className="text-xs font-black text-emerald-300">{formatMoney(club.budget)}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="outline" className="text-[8px]">👥 {club.fans.toLocaleString()} torcedores</Badge>
                <Badge variant="outline" className="text-[8px]">⭐ {club.reputation} reputação</Badge>
                <Badge variant="outline" className="text-[8px]">📅 T{season}</Badge>
                {club.country && <Badge variant="outline" className="text-[8px]">🌍 {club.country}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─────────── Identidade Visual ─────────── */}
      {(onRenameClub || onRenameStadium || onUpdateShield) && (
        <>
          <div className="flex items-center gap-2 px-1 pt-1">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Identidade Visual</h3>
            {canEdit ? (
              <Badge variant="outline" className="text-[8px] border-emerald-500/40 text-emerald-400 ml-auto">
                <Check className="h-2.5 w-2.5 mr-0.5" /> Desbloqueado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[8px] border-amber-500/40 text-amber-400 ml-auto">
                <Lock className="h-2.5 w-2.5 mr-0.5" /> Bloqueado
              </Badge>
            )}
          </div>

          {/* Upsell card */}
          {!canEdit && (
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-amber-500/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-400">Personalização Premium — R$ 10</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Desbloqueie para mudar o nome do clube, nome do estádio e escudo quantas vezes quiser.
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => setUnlockOpen(true)} className="w-full bg-amber-500 hover:bg-amber-600 text-black gap-1.5">
                  <Lock className="h-3 w-3" /> Desbloquear (R$ 10)
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Shield Card */}
          {onUpdateShield && (
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Escudo do Clube
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 p-2 rounded-lg bg-card/60 border border-border/30">
                      {hasShield(club as any) ? (
                        <ShieldCrest {...shieldPropsFromClub(club as any)} size={48} />
                      ) : (
                        <ShieldCrest primaryColor="#2563EB" secondaryColor="#FFF" pattern="solid" shape="classic" size={48} />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Forma, cores, símbolo e mais.</p>
                  </div>
                  <Button size="sm" onClick={openShieldEditor} variant={canEdit ? 'default' : 'outline'} className="shrink-0 gap-1">
                    {canEdit ? <Pencil className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {canEdit ? 'Editar' : 'R$ 10'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Club name card */}
          {onRenameClub && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-primary" /> Nome do Clube
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editingClubName ? (
                  <div className="flex gap-2">
                    <Input value={newClubName} onChange={e => setNewClubName(e.target.value)} className="h-8 text-xs" maxLength={30} />
                    <Button size="sm" onClick={() => { onRenameClub(newClubName); setEditingClubName(false); }} disabled={!newClubName.trim()} className="h-8">
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingClubName(false)} className="h-8">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm truncate">{club.name}</p>
                    <Button size="sm" variant={canEdit ? 'outline' : 'outline'} onClick={() => requireUnlock(() => { setNewClubName(club.name); setEditingClubName(true); })} className="shrink-0 h-7 px-2 gap-1 text-[10px]">
                      {canEdit ? <Pencil className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {canEdit ? 'Editar' : 'R$ 10'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stadium name card */}
          {onRenameStadium && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-emerald-400" /> Nome do Estádio
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editingStadium ? (
                  <div className="flex gap-2">
                    <Input value={newStadiumName} onChange={e => setNewStadiumName(e.target.value)} className="h-8 text-xs" maxLength={40} />
                    <Button size="sm" onClick={() => { onRenameStadium(newStadiumName); setEditingStadium(false); }} disabled={!newStadiumName.trim()} className="h-8">
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingStadium(false)} className="h-8">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm truncate">{club.stadiumName || 'Arena'}</p>
                    <Button size="sm" variant="outline" onClick={() => requireUnlock(() => { setNewStadiumName(club.stadiumName || 'Arena'); setEditingStadium(true); })} className="shrink-0 h-7 px-2 gap-1 text-[10px]">
                      {canEdit ? <Pencil className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {canEdit ? 'Editar' : 'R$ 10'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ─────────── Owner info ─────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Dados do Clube
            </div>
            <Button size="sm" variant="outline" onClick={() => editing ? handleSave() : setEditing(true)} className="h-7 px-2 text-[10px] gap-1">
              {editing ? <><Save className="h-3 w-3" /> Salvar</> : <><Edit3 className="h-3 w-3" /> Editar</>}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {editing ? (
            <>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium">Nome do Presidente</label>
                <Input value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))} placeholder="Nome completo do presidente" className="h-8 text-xs mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium">Data de Fundação (DD/MM/AAAA)</label>
                <Input
                  value={form.foundedDate || ''}
                  onChange={e => {
                    let val = e.target.value.replace(/[^\d/]/g, '');
                    if (val.length === 2 && !val.includes('/')) val += '/';
                    if (val.length === 5 && val.split('/').length === 2) val += '/';
                    if (val.length > 10) val = val.slice(0, 10);
                    setForm(f => ({ ...f, foundedDate: val }));
                  }}
                  placeholder="Ex: 15/03/2024"
                  className="h-8 text-xs mt-1"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium">Instagram (link ou @usuario)</label>
                <Input
                  value={form.instagram}
                  onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                  placeholder="https://instagram.com/seutime ou @seutime"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium">Bio do Clube</label>
                <Input value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Uma frase sobre o clube..." className="h-8 text-xs mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium">Lema do Clube</label>
                <Input value={form.motto} onChange={e => setForm(f => ({ ...f, motto: e.target.value }))} placeholder="Ex: Nascido para vencer" className="h-8 text-xs mt-1" />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/50">
                <User className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Presidente</p>
                  <p className="text-xs font-bold">{profile.ownerName || 'Não definido'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/50">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Fundação</p>
                  <p className="text-xs font-bold">{profile.foundedDate || `Temporada ${profile.foundedSeason || 1}`}</p>
                </div>
              </div>

              {profile.instagram ? (
                <a
                  href={getInstagramUrl(profile.instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-pink-500/5 border border-pink-500/20 hover:bg-pink-500/10 transition-colors"
                >
                  <Instagram className="h-4 w-4 text-pink-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">Instagram</p>
                    <p className="text-xs font-bold text-pink-400 truncate">{getInstagramDisplay(profile.instagram)}</p>
                  </div>
                  <Link2 className="h-3 w-3 text-pink-400/50 shrink-0" />
                </a>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/10 border border-border/30">
                  <Instagram className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Instagram</p>
                    <p className="text-[10px] text-muted-foreground/50">Clique em "Editar" para vincular</p>
                  </div>
                </div>
              )}

              {profile.bio && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/50">
                  <Quote className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Bio</p>
                    <p className="text-xs">{profile.bio}</p>
                  </div>
                </div>
              )}

              {profile.motto && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-base shrink-0">🏳️</span>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Lema</p>
                    <p className="text-xs font-bold italic">"{profile.motto}"</p>
                  </div>
                </div>
              )}

              {!profile.ownerName && !profile.instagram && (
                <p className="text-[10px] text-muted-foreground text-center py-2">
                  Clique em "Editar" para preencher os dados do seu clube!
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─────────── Unlock Dialog ─────────── */}
      <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" /> Personalização Premium
            </DialogTitle>
            <DialogDescription>
              Desbloqueie a edição completa de identidade do clube por <span className="font-bold text-amber-400">R$ 10</span> (pagamento único).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
              <p className="text-xs font-bold text-amber-400">O que você desbloqueia:</p>
              <ul className="text-[11px] space-y-1 text-muted-foreground">
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" /> Mudar o nome do clube quantas vezes quiser</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" /> Mudar o nome do estádio</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" /> Editar escudo (forma, cores, ícone, etc.)</li>
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <p className="text-xs font-bold">Como pagar:</p>
              <ol className="text-[11px] space-y-1 text-muted-foreground list-decimal list-inside">
                <li>Envie <span className="font-bold text-foreground">R$ 10,00</span> via Pix para a chave abaixo</li>
                <li>Inclua seu <span className="font-bold text-foreground">e-mail de cadastro</span> na mensagem</li>
                <li>O admin libera em até <span className="font-bold text-foreground">24h</span></li>
              </ol>
              <div className="flex items-center gap-2 mt-2 p-2 rounded bg-muted/40 border border-border/50">
                <span className="text-[11px] font-mono flex-1 truncate">flm26@pix.com</span>
                <Button size="sm" variant="ghost" onClick={copyPix} className="h-6 px-2">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockOpen(false)} className="w-full">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────── Shield Editor Sheet ─────────── */}
      <Sheet open={shieldOpen} onOpenChange={setShieldOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Editor de Escudo
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <CrestBuilder value={draftShield} onChange={setDraftShield} showSaveButton={false} />
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
