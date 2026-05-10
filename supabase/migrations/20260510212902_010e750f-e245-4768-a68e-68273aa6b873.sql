-- Clean bugged club names in 'clubs' table
UPDATE public.clubs
SET name = 'Clube Sem Nome'
WHERE LOWER(name) IN ('solid', 'outline', 'bold', 'icon', 'component', 'undefined', 'null', 'nan', 'object', 'undefined undefined');

-- Clean logo_url if it's a pattern name
UPDATE public.clubs
SET logo_url = NULL
WHERE LOWER(logo_url) IN ('solid', 'outline', 'stripes', 'halves', 'diagonal', 'split', 'chevron', 'cross', 'waves', 'quarters', 'triband', 'sash', 'hoop');

-- Clean bugged club names in 'game_saves' JSONB
UPDATE public.game_saves
SET club_data = jsonb_set(
  club_data,
  '{club,name}',
  '"Clube Sem Nome"'
)
WHERE LOWER(club_data->'club'->>'name') IN ('solid', 'outline', 'bold', 'icon', 'component', 'undefined', 'null', 'nan', 'object', 'undefined undefined');

-- Also clean game_state if exists
UPDATE public.game_saves
SET game_state = jsonb_set(
  game_state,
  '{club,name}',
  '"Clube Sem Nome"'
)
WHERE LOWER(game_state->'club'->>'name') IN ('solid', 'outline', 'bold', 'icon', 'component', 'undefined', 'null', 'nan', 'object', 'undefined undefined');

-- Fix logoUrl in game_saves
UPDATE public.game_saves
SET club_data = jsonb_set(club_data, '{club,logoUrl}', '""')
WHERE LOWER(club_data->'club'->>'logoUrl') IN ('solid', 'outline', 'stripes', 'halves', 'diagonal', 'split', 'chevron', 'cross', 'waves', 'quarters', 'triband', 'sash', 'hoop');

-- Clean global_ranking names
UPDATE public.global_ranking
SET club_name = 'Clube Sem Nome'
WHERE LOWER(club_name) IN ('solid', 'outline', 'bold', 'icon', 'component', 'undefined', 'null', 'nan', 'object', 'undefined undefined');
