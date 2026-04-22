import { useState } from 'react';
import { StaffMember } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, Trash2, Star, RefreshCw } from 'lucide-react';
import { useLiveMatchGuard } from './LiveMatchGuard';

const roleLabels: Record<string, { label: string; emoji: string; desc: string }> = {
  assistente: { label: 'Assistente Técnico', emoji: '📋', desc: 'Fornece dicas em tempo real durante as partidas' },
  medico: { label: 'Médico', emoji: '🏥', desc: 'Reduz tempo de recuperação de lesões' },
  preparador_fisico: { label: 'Preparador Físico', emoji: '💪', desc: 'Melhora recuperação de stamina entre jogos' },
};

interface StaffTabProps {
  staff: StaffMember[];
  budget: number;
  staffMarket?: StaffMember[];
  lastStaffMarketRefreshAt?: string;
  onHireStaff: (member: Omit<StaffMember, 'id'> & { id?: string }) => void;
  onFireStaff: (id: string) => void;
  onRefreshMarket?: () => void;
}

export function StaffTab({
  staff,
  budget,
  staffMarket = [],
  lastStaffMarketRefreshAt,
  onHireStaff: _onHireStaff,
  onFireStaff: _onFireStaff,
  onRefreshMarket,
}: StaffTabProps) {
  const { guard } = useLiveMatchGuard();
  const onHireStaff = guard(_onHireStaff);
  const onFireStaff = guard(_onFireStaff);
  const [showMarket, setShowMarket] = useState(false);

  const hasRole = (role: string) => staff.some(s => s.role === role);
  const availableStaff = staffMarket.filter(s => !hasRole(s.role));

  // Próximo refresh disponível
  const cooldownMs = 24 * 60 * 60 * 1000;
  const lastTs = lastStaffMarketRefreshAt ? new Date(lastStaffMarketRefreshAt).getTime() : 0;
  const elapsed = lastTs ? Date.now() - lastTs : cooldownMs;
  const canRefresh = !lastTs || elapsed >= cooldownMs;
  const refreshLabel = canRefresh
    ? 'Disponível'
    : `${Math.ceil((cooldownMs - elapsed) / (60 * 60 * 1000))}h`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Equipe Técnica
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {staff.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum membro na equipe técnica</p>
              <p className="text-xs text-muted-foreground mt-1">Contrate um assistente para receber dicas durante as partidas!</p>
            </div>
          ) : (
            staff.map(member => {
              const roleInfo = roleLabels[member.role] || { label: member.role, emoji: '👤', desc: '' };
              return (
                <div key={member.id} className="flex items-center gap-3 bg-card/60 border border-border/20 rounded-xl px-3 py-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                    {roleInfo.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{roleInfo.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <Star key={i} className={`h-2.5 w-2.5 ${i < member.skill ? 'text-yellow-400 fill-yellow-400' : 'text-muted/30'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">R${(member.salary / 1000).toFixed(0)}k/mês</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => onFireStaff(member.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}

          <Button variant="outline" className="w-full gap-2" onClick={() => setShowMarket(!showMarket)}>
            <UserPlus className="h-4 w-4" /> {showMarket ? 'Fechar Mercado' : 'Contratar Staff'}
          </Button>
        </CardContent>
      </Card>

      {showMarket && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" /> Mercado de Staff
              </CardTitle>
              {onRefreshMarket && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1"
                  disabled={!canRefresh}
                  onClick={onRefreshMarket}
                >
                  <RefreshCw className="h-3 w-3" /> {canRefresh ? 'Atualizar' : refreshLabel}
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Renovação automática a cada 15 dias • Manual: 1x ao dia
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {availableStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {staffMarket.length === 0
                  ? 'Mercado vazio — aguardando geração automática.'
                  : 'Todas as posições disponíveis já estão preenchidas!'}
              </p>
            ) : (
              availableStaff.map((candidate) => {
                const roleInfo = roleLabels[candidate.role] || { label: candidate.role, emoji: '👤', desc: '' };
                const canAfford = budget >= candidate.salary * 3;
                return (
                  <div key={candidate.id} className="flex items-center gap-3 bg-muted/10 border border-border/15 rounded-xl px-3 py-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                      {roleInfo.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{candidate.name}</p>
                      <p className="text-xs text-muted-foreground">{roleInfo.label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 10 }).map((_, j) => (
                            <Star key={j} className={`h-2 w-2 ${j < candidate.skill ? 'text-yellow-400 fill-yellow-400' : 'text-muted/30'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{roleInfo.desc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold">R${(candidate.salary / 1000).toFixed(0)}k/mês</p>
                      <Button
                        size="sm"
                        className="mt-1 h-7 text-xs"
                        disabled={!canAfford}
                        onClick={() => { onHireStaff(candidate); setShowMarket(false); }}
                      >
                        Contratar
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
