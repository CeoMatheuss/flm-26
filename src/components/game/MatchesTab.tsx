import { Match, Player } from '@/types/game';
import { TacticsConfig } from '@/types/tactics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Play, Check, Home, Swords, Clock, Calendar, Plane, Globe, Trophy, LogIn, Shuffle, Scale, Users, DollarSign } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ClubShield } from './ClubShield';
import { OnlineFriendliesTab } from './OnlineFriendliesTab';
import { MatchCalendarTab } from './MatchCalendarTab';
import { MatchLobbyScreen } from './MatchLobbyScreen';
import { simulateInstantFriendly, type InstantFriendlyResult } from '@/match/instantFriendly';
import { updateGlobalRanking } from '@/match/rankingUpdater';
import { toast } from 'sonner';

export function MatchesTab(props: any) {
  // Amistosos e Partidas simplificadas
  return (
    <div className="p-4 text-center">
      <h2 className="text-xl font-bold">Partidas e Amistosos</h2>
      <p className="text-sm text-muted-foreground">Sistema em manutenção para foco exclusivo em Ligas.</p>
    </div>
  );
}