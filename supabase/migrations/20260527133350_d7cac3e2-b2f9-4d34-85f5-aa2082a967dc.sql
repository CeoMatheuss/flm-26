-- Ajusta políticas da tabela world_teams para permitir takeover de bots
CREATE POLICY "Users can takeover bots" ON public.world_teams
FOR UPDATE
TO authenticated
USING (is_bot = true OR auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own world team" ON public.world_teams
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Ajusta políticas da tabela world_players para permitir gestão do elenco pelo dono do clube
CREATE POLICY "Owners can manage their players" ON public.world_players
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.world_teams
    WHERE world_teams.id = world_players.team_id
    AND world_teams.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.world_teams
    WHERE world_teams.id = world_players.team_id
    AND world_teams.user_id = auth.uid()
  )
);

-- Garantir GRANTs necessários
GRANT ALL ON public.world_teams TO authenticated;
GRANT ALL ON public.world_players TO authenticated;
