-- 1. Add tier column to cup_competitions
ALTER TABLE public.cup_competitions 
  ADD COLUMN IF NOT EXISTS tier text DEFAULT 'national';

CREATE INDEX IF NOT EXISTS idx_cup_competitions_tier 
  ON public.cup_competitions(tier);

CREATE INDEX IF NOT EXISTS idx_cup_competitions_continent_season 
  ON public.cup_competitions(continent, season_year, tier);

-- 2. Qualification RPC
CREATE OR REPLACE FUNCTION public.qualify_international_teams(
  _continent text,
  _season_year int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _country text;
  _league_id uuid;
  _cup_winner_user_id uuid;
  _cup_winner_club text;
  _principal jsonb := '[]'::jsonb;
  _secundaria jsonb := '[]'::jsonb;
  _seen_users uuid[] := ARRAY[]::uuid[];
  _seen_clubs text[] := ARRAY[]::text[];
  _member RECORD;
  _position int;
  _added_principal int;
  _added_secundaria int;
  _country_continent_map jsonb := '{
    "Brasil":"América do Sul","Argentina":"América do Sul","Uruguai":"América do Sul","Chile":"América do Sul","Colômbia":"América do Sul","Peru":"América do Sul","Equador":"América do Sul","Paraguai":"América do Sul","Bolívia":"América do Sul","Venezuela":"América do Sul",
    "Espanha":"Europa","Inglaterra":"Europa","Itália":"Europa","Alemanha":"Europa","França":"Europa","Portugal":"Europa","Holanda":"Europa","Bélgica":"Europa",
    "México":"América do Norte","Estados Unidos":"América do Norte","Canadá":"América do Norte",
    "Egito":"África","Marrocos":"África","Nigéria":"África","África do Sul":"África",
    "Japão":"Ásia","Coreia do Sul":"Ásia","Arábia Saudita":"Ásia","China":"Ásia",
    "Austrália":"Oceania","Nova Zelândia":"Oceania"
  }'::jsonb;
BEGIN
  FOR _country IN
    SELECT key FROM jsonb_object_keys(_country_continent_map) AS key
    WHERE _country_continent_map->>key = _continent
  LOOP
    -- Find Division 1 league for this country
    SELECT id INTO _league_id
    FROM multiplayer_leagues
    WHERE country = _country
      AND tier = 'nacional'
      AND division = 1
      AND auto_created = true
    ORDER BY created_at ASC
    LIMIT 1;

    IF _league_id IS NULL THEN CONTINUE; END IF;

    -- National cup winner (most recent finished cup)
    SELECT ct.user_id, ct.club_name 
    INTO _cup_winner_user_id, _cup_winner_club
    FROM cup_competitions cc
    JOIN cup_teams ct ON ct.cup_id = cc.id
    WHERE cc.country = _country
      AND cc.cup_type = 'national'
      AND cc.status = 'finished'
      AND ct.eliminated = false
    ORDER BY cc.season_year DESC NULLS LAST, cc.created_at DESC
    LIMIT 1;

    _position := 0;
    _added_principal := 0;
    _added_secundaria := 0;

    FOR _member IN
      SELECT user_id, club_name, club_logo
      FROM league_members
      WHERE league_id = _league_id
      ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC
      LIMIT 10
    LOOP
      _position := _position + 1;
      
      -- Skip duplicates
      IF (_member.user_id IS NOT NULL AND _member.user_id = ANY(_seen_users)) 
         OR _member.club_name = ANY(_seen_clubs) THEN
        CONTINUE;
      END IF;

      IF _added_principal < 4 THEN
        _principal := _principal || jsonb_build_object(
          'user_id', _member.user_id,
          'club_name', _member.club_name,
          'club_logo', _member.club_logo,
          'country', _country,
          'source', 'league_pos_' || _position
        );
        _seen_users := _seen_users || COALESCE(_member.user_id, '00000000-0000-0000-0000-000000000000'::uuid);
        _seen_clubs := _seen_clubs || _member.club_name;
        _added_principal := _added_principal + 1;
      ELSIF _added_secundaria < 4 THEN
        _secundaria := _secundaria || jsonb_build_object(
          'user_id', _member.user_id,
          'club_name', _member.club_name,
          'club_logo', _member.club_logo,
          'country', _country,
          'source', 'league_pos_' || _position
        );
        _seen_users := _seen_users || COALESCE(_member.user_id, '00000000-0000-0000-0000-000000000000'::uuid);
        _seen_clubs := _seen_clubs || _member.club_name;
        _added_secundaria := _added_secundaria + 1;
      END IF;
    END LOOP;

    -- Cup winner spot in principal (if not already in)
    IF _cup_winner_club IS NOT NULL 
       AND NOT (_cup_winner_club = ANY(_seen_clubs)) THEN
      _principal := _principal || jsonb_build_object(
        'user_id', _cup_winner_user_id,
        'club_name', _cup_winner_club,
        'club_logo', '🏆',
        'country', _country,
        'source', 'national_cup_winner'
      );
      _seen_clubs := _seen_clubs || _cup_winner_club;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'continent', _continent,
    'season_year', _season_year,
    'principal', _principal,
    'secundaria', _secundaria
  );
END;
$$;