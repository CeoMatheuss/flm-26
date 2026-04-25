-- =====================================================
-- PADRONIZAÇÃO GLOBAL DOS NOMES DE LIGAS (sem apagar nada)
-- =====================================================

-- BRASIL — Brasileirão Série A/B/C/D
UPDATE public.world_leagues SET league_name = 'Brasileirão Série A' WHERE country = 'Brasil' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Brasileirão Série B' WHERE country = 'Brasil' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Brasileirão Série C' WHERE country = 'Brasil' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Brasileirão Série D' WHERE country = 'Brasil' AND division = 4;

-- INGLATERRA
UPDATE public.world_leagues SET league_name = 'Premier League' WHERE country = 'Inglaterra' AND division = 1;
UPDATE public.world_leagues SET league_name = 'EFL Championship' WHERE country = 'Inglaterra' AND division = 2;
UPDATE public.world_leagues SET league_name = 'EFL League One' WHERE country = 'Inglaterra' AND division = 3;
UPDATE public.world_leagues SET league_name = 'EFL League Two' WHERE country = 'Inglaterra' AND division = 4;

-- ESPANHA
UPDATE public.world_leagues SET league_name = 'La Liga' WHERE country = 'Espanha' AND division = 1;
UPDATE public.world_leagues SET league_name = 'La Liga 2' WHERE country = 'Espanha' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Primera Federación' WHERE country = 'Espanha' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Segunda Federación' WHERE country = 'Espanha' AND division = 4;

-- ITÁLIA
UPDATE public.world_leagues SET league_name = 'Serie A' WHERE country = 'Itália' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Serie B' WHERE country = 'Itália' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Serie C' WHERE country = 'Itália' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Serie D' WHERE country = 'Itália' AND division = 4;

-- ALEMANHA
UPDATE public.world_leagues SET league_name = 'Bundesliga' WHERE country = 'Alemanha' AND division = 1;
UPDATE public.world_leagues SET league_name = '2. Bundesliga' WHERE country = 'Alemanha' AND division = 2;
UPDATE public.world_leagues SET league_name = '3. Liga' WHERE country = 'Alemanha' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Regionalliga' WHERE country = 'Alemanha' AND division = 4;

-- FRANÇA
UPDATE public.world_leagues SET league_name = 'Ligue 1' WHERE country = 'França' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Ligue 2' WHERE country = 'França' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Championnat National' WHERE country = 'França' AND division = 3;
UPDATE public.world_leagues SET league_name = 'National 2' WHERE country = 'França' AND division = 4;

-- PORTUGAL
UPDATE public.world_leagues SET league_name = 'Primeira Liga' WHERE country = 'Portugal' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Liga Portugal 2' WHERE country = 'Portugal' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Liga 3' WHERE country = 'Portugal' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Campeonato de Portugal' WHERE country = 'Portugal' AND division = 4;

-- HOLANDA
UPDATE public.world_leagues SET league_name = 'Eredivisie' WHERE country = 'Holanda' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Eerste Divisie' WHERE country = 'Holanda' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Tweede Divisie' WHERE country = 'Holanda' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Derde Divisie' WHERE country = 'Holanda' AND division = 4;

-- BÉLGICA
UPDATE public.world_leagues SET league_name = 'Jupiler Pro League' WHERE country = 'Bélgica' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Challenger Pro League' WHERE country = 'Bélgica' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Belgian National Division 1' WHERE country = 'Bélgica' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Belgian Division 2' WHERE country = 'Bélgica' AND division = 4;

-- TURQUIA
UPDATE public.world_leagues SET league_name = 'Süper Lig' WHERE country = 'Turquia' AND division = 1;
UPDATE public.world_leagues SET league_name = '1. Lig' WHERE country = 'Turquia' AND division = 2;
UPDATE public.world_leagues SET league_name = '2. Lig' WHERE country = 'Turquia' AND division = 3;
UPDATE public.world_leagues SET league_name = '3. Lig' WHERE country = 'Turquia' AND division = 4;

-- RÚSSIA
UPDATE public.world_leagues SET league_name = 'Russian Premier League' WHERE country = 'Rússia' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Russian First League' WHERE country = 'Rússia' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Russian Second League' WHERE country = 'Rússia' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Russian Third League' WHERE country = 'Rússia' AND division = 4;

-- ARGENTINA
UPDATE public.world_leagues SET league_name = 'Liga Profesional Argentina' WHERE country = 'Argentina' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Primera Nacional' WHERE country = 'Argentina' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Primera B Metropolitana' WHERE country = 'Argentina' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Primera C' WHERE country = 'Argentina' AND division = 4;

-- ESTADOS UNIDOS
UPDATE public.world_leagues SET league_name = 'MLS' WHERE country = 'Estados Unidos' AND division = 1;
UPDATE public.world_leagues SET league_name = 'USL Championship' WHERE country = 'Estados Unidos' AND division = 2;
UPDATE public.world_leagues SET league_name = 'USL League One' WHERE country = 'Estados Unidos' AND division = 3;
UPDATE public.world_leagues SET league_name = 'USL League Two' WHERE country = 'Estados Unidos' AND division = 4;

-- MÉXICO
UPDATE public.world_leagues SET league_name = 'Liga MX' WHERE country = 'México' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Liga de Expansión MX' WHERE country = 'México' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Liga Premier' WHERE country = 'México' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Liga TDP' WHERE country = 'México' AND division = 4;

-- JAPÃO
UPDATE public.world_leagues SET league_name = 'J1 League' WHERE country = 'Japão' AND division = 1;
UPDATE public.world_leagues SET league_name = 'J2 League' WHERE country = 'Japão' AND division = 2;
UPDATE public.world_leagues SET league_name = 'J3 League' WHERE country = 'Japão' AND division = 3;
UPDATE public.world_leagues SET league_name = 'JFL' WHERE country = 'Japão' AND division = 4;

-- COREIA DO SUL
UPDATE public.world_leagues SET league_name = 'K League 1' WHERE country = 'Coreia do Sul' AND division = 1;
UPDATE public.world_leagues SET league_name = 'K League 2' WHERE country = 'Coreia do Sul' AND division = 2;
UPDATE public.world_leagues SET league_name = 'K3 League' WHERE country = 'Coreia do Sul' AND division = 3;
UPDATE public.world_leagues SET league_name = 'K4 League' WHERE country = 'Coreia do Sul' AND division = 4;

-- ARÁBIA SAUDITA
UPDATE public.world_leagues SET league_name = 'Saudi Pro League' WHERE country = 'Arábia Saudita' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Saudi First Division League' WHERE country = 'Arábia Saudita' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Saudi Second Division League' WHERE country = 'Arábia Saudita' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Saudi Third Division League' WHERE country = 'Arábia Saudita' AND division = 4;

-- CHINA
UPDATE public.world_leagues SET league_name = 'Chinese Super League' WHERE country = 'China' AND division = 1;
UPDATE public.world_leagues SET league_name = 'China League One' WHERE country = 'China' AND division = 2;
UPDATE public.world_leagues SET league_name = 'China League Two' WHERE country = 'China' AND division = 3;
UPDATE public.world_leagues SET league_name = 'China Champions League' WHERE country = 'China' AND division = 4;

-- ÍNDIA
UPDATE public.world_leagues SET league_name = 'Indian Super League' WHERE country = 'Índia' AND division = 1;
UPDATE public.world_leagues SET league_name = 'I-League' WHERE country = 'Índia' AND division = 2;
UPDATE public.world_leagues SET league_name = 'I-League 2' WHERE country = 'Índia' AND division = 3;
UPDATE public.world_leagues SET league_name = 'I-League 3' WHERE country = 'Índia' AND division = 4;

-- AUSTRÁLIA
UPDATE public.world_leagues SET league_name = 'A-League Men' WHERE country = 'Austrália' AND division = 1;
UPDATE public.world_leagues SET league_name = 'NPL Australia' WHERE country = 'Austrália' AND division = 2;
UPDATE public.world_leagues SET league_name = 'NPL State League 1' WHERE country = 'Austrália' AND division = 3;
UPDATE public.world_leagues SET league_name = 'NPL State League 2' WHERE country = 'Austrália' AND division = 4;

-- ÁFRICA DO SUL
UPDATE public.world_leagues SET league_name = 'Premier Soccer League' WHERE country = 'África do Sul' AND division = 1;
UPDATE public.world_leagues SET league_name = 'National First Division' WHERE country = 'África do Sul' AND division = 2;
UPDATE public.world_leagues SET league_name = 'ABC Motsepe League' WHERE country = 'África do Sul' AND division = 3;
UPDATE public.world_leagues SET league_name = 'SAFA Regional League' WHERE country = 'África do Sul' AND division = 4;

-- NIGÉRIA
UPDATE public.world_leagues SET league_name = 'Nigeria Premier Football League' WHERE country = 'Nigéria' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Nigeria National League' WHERE country = 'Nigéria' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Nigeria Nationwide League One' WHERE country = 'Nigéria' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Nigeria Amateur League' WHERE country = 'Nigéria' AND division = 4;

-- EGITO
UPDATE public.world_leagues SET league_name = 'Egyptian Premier League' WHERE country = 'Egito' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Egyptian Second Division A' WHERE country = 'Egito' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Egyptian Second Division B' WHERE country = 'Egito' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Egyptian Third Division' WHERE country = 'Egito' AND division = 4;

-- SUÉCIA
UPDATE public.world_leagues SET league_name = 'Allsvenskan' WHERE country = 'Suécia' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Superettan' WHERE country = 'Suécia' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Ettan' WHERE country = 'Suécia' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Division 2' WHERE country = 'Suécia' AND division = 4;

-- NORUEGA
UPDATE public.world_leagues SET league_name = 'Eliteserien' WHERE country = 'Noruega' AND division = 1;
UPDATE public.world_leagues SET league_name = 'OBOS-ligaen' WHERE country = 'Noruega' AND division = 2;
UPDATE public.world_leagues SET league_name = 'PostNord-ligaen' WHERE country = 'Noruega' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Norsk Tipping-Ligaen' WHERE country = 'Noruega' AND division = 4;

-- DINAMARCA
UPDATE public.world_leagues SET league_name = 'Superliga' WHERE country = 'Dinamarca' AND division = 1;
UPDATE public.world_leagues SET league_name = '1. Division' WHERE country = 'Dinamarca' AND division = 2;
UPDATE public.world_leagues SET league_name = '2. Division' WHERE country = 'Dinamarca' AND division = 3;
UPDATE public.world_leagues SET league_name = '3. Division' WHERE country = 'Dinamarca' AND division = 4;

-- SUÍÇA
UPDATE public.world_leagues SET league_name = 'Super League' WHERE country = 'Suíça' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Challenge League' WHERE country = 'Suíça' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Promotion League' WHERE country = 'Suíça' AND division = 3;
UPDATE public.world_leagues SET league_name = '1. Liga Classic' WHERE country = 'Suíça' AND division = 4;

-- ÁUSTRIA
UPDATE public.world_leagues SET league_name = 'Bundesliga (Áustria)' WHERE country = 'Áustria' AND division = 1;
UPDATE public.world_leagues SET league_name = '2. Liga (Áustria)' WHERE country = 'Áustria' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Regionalliga (Áustria)' WHERE country = 'Áustria' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Landesliga (Áustria)' WHERE country = 'Áustria' AND division = 4;

-- CHILE
UPDATE public.world_leagues SET league_name = 'Primera División Chile' WHERE country = 'Chile' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Primera B Chile' WHERE country = 'Chile' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Segunda División Chile' WHERE country = 'Chile' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Tercera División Chile' WHERE country = 'Chile' AND division = 4;

-- COLÔMBIA
UPDATE public.world_leagues SET league_name = 'Liga BetPlay Dimayor' WHERE country = 'Colômbia' AND division = 1;
UPDATE public.world_leagues SET league_name = 'Torneo BetPlay Dimayor' WHERE country = 'Colômbia' AND division = 2;
UPDATE public.world_leagues SET league_name = 'Primera C Colombia' WHERE country = 'Colômbia' AND division = 3;
UPDATE public.world_leagues SET league_name = 'Segunda C Colombia' WHERE country = 'Colômbia' AND division = 4;