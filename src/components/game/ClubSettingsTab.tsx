import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Pencil, Landmark, Ticket, Check } from 'lucide-react';

interface Props {
  clubName: string;
  stadiumName: string;
  ticketPrice: number;
  onRenameClub: (name: string) => void;
  onRenameStadium: (name: string) => void;
  onSetTicketPrice: (price: number) => void;
}

export function ClubSettingsTab({ clubName, stadiumName, ticketPrice, onRenameClub, onRenameStadium, onSetTicketPrice }: Props) {
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

      {/* Ticket Price */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Ticket className="h-4 w-4 text-yellow-400" /> Preço do Ingresso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-primary">R$ {ticketPrice}</p>
            <p className="text-[10px] text-muted-foreground">por torcedor</p>
          </div>
          <Slider
            value={[ticketPrice]}
            onValueChange={([v]) => onSetTicketPrice(v)}
            min={5}
            max={200}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>R$ 5</span>
            <span>R$ 200</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            ⚠️ Preços altos geram mais receita mas podem afastar torcedores. Preços baixos atraem mais público.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
