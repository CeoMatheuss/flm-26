-- 1. Limpar tabelas relacionadas que podem causar conflitos de ID ou estado
TRUNCATE TABLE public.player_negotiations CASCADE;
TRUNCATE TABLE public.youth_prospects CASCADE;
TRUNCATE TABLE public.transfer_listings CASCADE;

-- 2. Função para gerar um elenco novo completo via SQL (usando a lógica de 35 jogadores)
-- Como a geração de atributos complexos é melhor no JS, vamos marcar os saves para "reparação"
-- ou atualizar o JSONB diretamente para quem já existe.

-- Para garantir que o usuário veja a mudança IMEDIATAMENTE, vamos limpar o campo club_data 
-- de modo que o front-end seja forçado a re-gerar o elenco inicial (initialClub + generateInitialSquad)
-- OU podemos injetar um estado vazio que dispare o useGame Rebuild.

UPDATE public.game_saves 
SET club_data = jsonb_set(
  club_data, 
  '{club,players}', 
  '[]'::jsonb
);

-- 3. Forçar reset de infraestrutura de base para garantir sincronia
UPDATE public.game_saves
SET club_data = jsonb_set(
  club_data,
  '{infrastructure,youthAcademy,level}',
  '1'::jsonb
);

-- Nota: O front-end ao detectar players=[] irá rodar o generateInitialSquad() 
-- que agora possui a estrutura de 35 jogadores (11+11+13).
