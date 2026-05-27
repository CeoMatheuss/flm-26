
DO $$
DECLARE
  d1 uuid := 'b01ef2e0-298f-4313-a093-680715e25fec';
  d2 uuid := 'baaeea96-d1e0-4914-9255-8008a3059fb4';
  d3 uuid := '08284dd1-9064-4950-8f33-6c91cb68d532';
  user_team uuid := '52b34eb7-6757-49c1-94c4-219a75ad3e7e';
  v_team_id uuid;
  v_target uuid;
  v_counter int := 0;
BEGIN
  FOR v_team_id IN
    SELECT id FROM world_teams 
    WHERE league_id = d1 AND is_bot = true AND id <> user_team
    ORDER BY strength ASC NULLS LAST, created_at ASC
    OFFSET 15
  LOOP
    v_counter := v_counter + 1;
    IF v_counter <= 16 THEN v_target := d2;
    ELSIF v_counter <= 32 THEN v_target := d3;
    ELSE v_target := NULL;
    END IF;

    UPDATE world_teams SET league_id = v_target WHERE id = v_team_id;
    DELETE FROM world_league_table WHERE team_id = v_team_id AND league_id = d1;
    
    IF v_target IS NOT NULL THEN
      INSERT INTO world_league_table (league_id, team_id, points, wins, draws, losses, goals_for, goals_against, season_year, season_month, country)
      SELECT v_target, v_team_id, 0, 0, 0, 0, 0, 0, season_year, season_month, country
      FROM world_leagues WHERE id = v_target
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
