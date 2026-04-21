import { useState } from 'react';
import { ClubProfile, defaultClubProfile } from '@/types/clubProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShieldCrest } from './ShieldCrest';
import { shieldPropsFromClub, hasShield } from './shieldHelpers';
import { Instagram, User, Edit3, Save, Quote, Calendar, Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  club: { name: string; primaryColor?: string; secondaryColor?: string; shieldPattern?: string; shieldShape?: string; shieldIcon?: string; shieldConfig?: any; detailColor?: string; logoUrl?: string; fans: number; reputation: number; country?: string };
  season: number;
  profile: ClubProfile;
  onSave: (profile: ClubProfile) => void;
}

export function ClubProfileTab({ club, season, profile, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);

  const handleSave = () => {
    onSave(form);
    setEditing(false);
    toast.success('Perfil do clube atualizado!');
  };

  // Format instagram as link
  const getInstagramUrl = (val: string) => {
    if (!val) return '';
    // If it's already a full URL
    if (val.startsWith('http')) return val;
    // If it's @username or just username
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
              {hasShield(club as any) ? (
                <ShieldCrest {...shieldPropsFromClub(club as any)} size={72} />
              ) : club.logoUrl ? (
                <img src={club.logoUrl} alt={club.name} className="w-16 h-16 rounded-xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center text-2xl">⚽</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black">{club.name}</h2>
              {profile.motto && <p className="text-[10px] text-muted-foreground italic mt-0.5">"{profile.motto}"</p>}
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

      {/* Owner info */}
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
                    // Auto-format DD/MM/YYYY
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
    </div>
  );
}
