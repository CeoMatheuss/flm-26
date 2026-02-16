import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Pencil, Landmark, Check } from 'lucide-react';

interface Props {
  clubName: string;
  stadiumName: string;
  onRenameClub: (name: string) => void;
  onRenameStadium: (name: string) => void;
}

export function ClubSettingsTab({ clubName, stadiumName, onRenameClub, onRenameStadium }: Props) {
  const [editingClub, setEditingClub] = useState(false);
  const [editingStadium, setEditingStadium] = useState(false);
  const [newClubName, setNewClubName] = useState(clubName);
  const [newStadiumName, setNewStadiumName] = useState(stadiumName);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm sm:text-lg">⚙️ Configurações do Clube</h3>

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

    </div>
  );
}
