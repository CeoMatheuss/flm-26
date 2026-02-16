
-- Update process_season_transition with exact per-position rewards
CREATE OR REPLACE FUNCTION public.process_season_transition(_country text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _league RECORD;
  _player RECORD;
  _position integer := 0;
  _reward bigint;
  _base_rewards bigint[] := ARRAY[
    20000000, 17000000, 14500000, 12500000, 11000000,
    10000000,  9200000,  8400000,  7800000,  7200000,
     6600000,  6000000,  5400000,  4800000,  4200000,
     3600000,  3000000,  2400000,  1800000,  1200000
  ];
  _divisor numeric;
  _pos_index integer;
BEGIN
  FOR _league IN
    SELECT id, division, season, league_type
    FROM multiplayer_leagues
    WHERE country = _country
      AND season_status = 'in_progress'
      AND league_type = 'main'
  LOOP
    _position := 0;
    
    FOR _player IN
      SELECT lm.id as member_db_id, lm.user_id, lm.points, lm.goals_for, lm.goals_against
      FROM league_members lm
      WHERE lm.league_id = _league.id
      ORDER BY lm.points DESC, (lm.goals_for - lm.goals_against) DESC, lm.goals_for DESC
    LOOP
      _position := _position + 1;
      
      -- Determine division multiplier: A=100%, B=50%, C=25%, D=10%
      _divisor := CASE
        WHEN COALESCE(_league.division, 1) = 1 THEN 1.0
        WHEN _league.division = 2 THEN 2.0
        WHEN _league.division = 3 THEN 4.0
        ELSE 10.0
      END;
      
      -- Cap position index at 20 (positions 21-30 get same as 20th)
      _pos_index := LEAST(_position, 20);
      
      _reward := (_base_rewards[_pos_index] / _divisor)::bigint;
      
      UPDATE league_members SET budget = budget + _reward WHERE id = _player.member_db_id;
    END LOOP;

    -- Reset stats and advance season
    UPDATE league_members
    SET points = 0, wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0, played = 0
    WHERE league_id = _league.id;

    DELETE FROM league_matches WHERE league_id = _league.id;

    UPDATE multiplayer_leagues
    SET season = season + 1,
        season_status = 'registration',
        current_round = 0,
        season_start = NULL,
        season_end = NULL
    WHERE id = _league.id;
  END LOOP;
END;
$$;
