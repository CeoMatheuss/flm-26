-- Update replica identities
ALTER TABLE public.world_player_stats REPLICA IDENTITY FULL;
ALTER TABLE public.cup_player_stats REPLICA IDENTITY FULL;
ALTER TABLE public.world_league_table REPLICA IDENTITY FULL;
ALTER TABLE public.world_matches REPLICA IDENTITY FULL;
ALTER TABLE public.national_cup_matches REPLICA IDENTITY FULL;

-- Recreate publication safely
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Create RPC for batch updating player statistics
CREATE OR REPLACE FUNCTION public.batch_upsert_player_stats(
  _table_name text,
  _comp_id_field text,
  _comp_id uuid,
  _team_id_field text,
  _updates jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _u jsonb;
BEGIN
  FOR _u IN SELECT * FROM jsonb_array_elements(_updates) LOOP
    PERFORM public.upsert_player_stats(
      _table_name,
      _comp_id_field,
      _comp_id,
      _team_id_field,
      (_u->>'team_id')::uuid,
      _u->>'player_name',
      _u
    );
  END LOOP;
END;
$$;
