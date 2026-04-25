-- ============================================================
-- ETAPA 2: MIGRAÇÃO DESTRUTIVA + POVOAMENTO
-- ============================================================

-- ───────────── Helpers ─────────────

-- Normaliza país (ISO ou nome) para o nome canônico usado em world_leagues
CREATE OR REPLACE FUNCTION public.normalize_country(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE upper(trim(coalesce(_input, '')))
    WHEN 'BR' THEN 'Brasil' WHEN 'BRASIL' THEN 'Brasil'
    WHEN 'ES' THEN 'Espanha' WHEN 'ESPANHA' THEN 'Espanha'
    WHEN 'GB' THEN 'Inglaterra' WHEN 'EN' THEN 'Inglaterra' WHEN 'INGLATERRA' THEN 'Inglaterra' WHEN 'UK' THEN 'Inglaterra'
    WHEN 'IT' THEN 'Itália' WHEN 'ITALIA' THEN 'Itália' WHEN 'ITÁLIA' THEN 'Itália'
    WHEN 'DE' THEN 'Alemanha' WHEN 'ALEMANHA' THEN 'Alemanha'
    WHEN 'FR' THEN 'França' WHEN 'FRANCA' THEN 'França' WHEN 'FRANÇA' THEN 'França'
    WHEN 'PT' THEN 'Portugal' WHEN 'PORTUGAL' THEN 'Portugal'
    WHEN 'NL' THEN 'Holanda' WHEN 'HOLANDA' THEN 'Holanda'
    WHEN 'BE' THEN 'Bélgica' WHEN 'BELGICA' THEN 'Bélgica' WHEN 'BÉLGICA' THEN 'Bélgica'
    WHEN 'TR' THEN 'Turquia' WHEN 'TURQUIA' THEN 'Turquia'
    WHEN 'RU' THEN 'Rússia' WHEN 'RUSSIA' THEN 'Rússia' WHEN 'RÚSSIA' THEN 'Rússia'
    WHEN 'US' THEN 'Estados Unidos' WHEN 'USA' THEN 'Estados Unidos' WHEN 'ESTADOS UNIDOS' THEN 'Estados Unidos'
    WHEN 'MX' THEN 'México' WHEN 'MEXICO' THEN 'México' WHEN 'MÉXICO' THEN 'México'
    WHEN 'AR' THEN 'Argentina' WHEN 'ARGENTINA' THEN 'Argentina'
    WHEN 'JP' THEN 'Japão' WHEN 'JAPAO' THEN 'Japão' WHEN 'JAPÃO' THEN 'Japão'
    WHEN 'KR' THEN 'Coreia do Sul' WHEN 'COREIA DO SUL' THEN 'Coreia do Sul'
    WHEN 'SA' THEN 'Arábia Saudita' WHEN 'ARABIA SAUDITA' THEN 'Arábia Saudita' WHEN 'ARÁBIA SAUDITA' THEN 'Arábia Saudita'
    WHEN 'CN' THEN 'China' WHEN 'CHINA' THEN 'China'
    WHEN 'IN' THEN 'Índia' WHEN 'INDIA' THEN 'Índia' WHEN 'ÍNDIA' THEN 'Índia'
    WHEN 'AU' THEN 'Austrália' WHEN 'AUSTRALIA' THEN 'Austrália' WHEN 'AUSTRÁLIA' THEN 'Austrália'
    WHEN 'ZA' THEN 'África do Sul' WHEN 'AFRICA DO SUL' THEN 'África do Sul' WHEN 'ÁFRICA DO SUL' THEN 'África do Sul'
    WHEN 'NG' THEN 'Nigéria' WHEN 'NIGERIA' THEN 'Nigéria' WHEN 'NIGÉRIA' THEN 'Nigéria'
    WHEN 'EG' THEN 'Egito' WHEN 'EGITO' THEN 'Egito'
    WHEN 'SE' THEN 'Suécia' WHEN 'SUECIA' THEN 'Suécia' WHEN 'SUÉCIA' THEN 'Suécia'
    WHEN 'NO' THEN 'Noruega' WHEN 'NORUEGA' THEN 'Noruega'
    WHEN 'DK' THEN 'Dinamarca' WHEN 'DINAMARCA' THEN 'Dinamarca'
    WHEN 'CH' THEN 'Suíça' WHEN 'SUICA' THEN 'Suíça' WHEN 'SUÍÇA' THEN 'Suíça'
    WHEN 'AT' THEN 'Áustria' WHEN 'AUSTRIA' THEN 'Áustria' WHEN 'ÁUSTRIA' THEN 'Áustria'
    WHEN 'CL' THEN 'Chile' WHEN 'CHILE' THEN 'Chile'
    WHEN 'CO' THEN 'Colômbia' WHEN 'COLOMBIA' THEN 'Colômbia' WHEN 'COLÔMBIA' THEN 'Colômbia'
    ELSE NULL
  END;
$$;

-- ───────────── Limpeza destrutiva ─────────────

-- Apaga partidas e times de copas antigas (cascata cuida de matches/teams)
DELETE FROM public.cup_competitions;

-- Apaga ligas auto-criadas (cascata: league_members, league_matches)
DELETE FROM public.multiplayer_leagues WHERE auto_created = true;

-- ───────────── Função: gerar nome de bot ─────────────
CREATE OR REPLACE FUNCTION public.generate_bot_club_name(_country text, _idx int)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  prefixes text[] := ARRAY['Real','Atlético','Sporting','Olympic','United','City','Wanderers','FC','SC','AC','CD','CA','SE'];
  cities jsonb := '{
    "Brasil": ["São Paulo","Rio","Salvador","Brasília","Fortaleza","Belo Horizonte","Manaus","Curitiba","Recife","Goiânia","Porto Alegre","Campinas","Natal","Vitória","Florianópolis","Cuiabá","João Pessoa","Aracaju"],
    "Espanha": ["Madrid","Barcelona","Valencia","Sevilla","Bilbao","Zaragoza","Málaga","Murcia","Vigo","Cádiz","Granada","Toledo","Córdoba","Salamanca","Pamplona","Burgos","Tarragona","Almería"],
    "Inglaterra": ["London","Manchester","Liverpool","Birmingham","Leeds","Newcastle","Sheffield","Bristol","Nottingham","Leicester","Coventry","Hull","Stoke","Derby","Brighton","Sunderland","Bradford","Plymouth"],
    "Itália": ["Milano","Roma","Napoli","Torino","Firenze","Bologna","Genova","Palermo","Bari","Verona","Catania","Padova","Modena","Parma","Cagliari","Brescia","Pisa","Trieste"],
    "Alemanha": ["München","Berlin","Hamburg","Köln","Frankfurt","Stuttgart","Düsseldorf","Dortmund","Leipzig","Bremen","Hannover","Nürnberg","Mainz","Augsburg","Karlsruhe","Wiesbaden","Freiburg","Bochum"],
    "França": ["Paris","Lyon","Marseille","Nice","Toulouse","Bordeaux","Lille","Nantes","Strasbourg","Rennes","Reims","Saint-Étienne","Le Havre","Montpellier","Tours","Caen","Angers","Brest"],
    "Portugal": ["Lisboa","Porto","Braga","Coimbra","Faro","Aveiro","Funchal","Setúbal","Évora","Viseu","Guimarães","Leiria","Beja","Viana","Portimão","Algarve","Madeira","Açores"],
    "Holanda": ["Amsterdam","Rotterdam","Eindhoven","Utrecht","Groningen","Den Haag","Tilburg","Almere","Breda","Nijmegen","Enschede","Apeldoorn","Haarlem","Arnhem","Zwolle","Leiden","Maastricht","Dordrecht"],
    "Bélgica": ["Brussels","Antwerp","Gent","Charleroi","Liège","Bruges","Namur","Leuven","Mons","Aalst","Mechelen","La Louvière","Hasselt","Sint-Niklaas","Ostend","Tournai","Genk","Seraing"],
    "Turquia": ["Istanbul","Ankara","İzmir","Bursa","Adana","Gaziantep","Konya","Antalya","Kayseri","Mersin","Eskişehir","Diyarbakır","Samsun","Denizli","Şanlıurfa","Malatya","Erzurum","Trabzon"],
    "Rússia": ["Moscow","Saint Petersburg","Novosibirsk","Yekaterinburg","Kazan","Nizhny Novgorod","Samara","Omsk","Rostov","Krasnodar","Volgograd","Ufa","Perm","Voronezh","Saratov","Tolyatti","Krasnoyarsk","Sochi"],
    "Estados Unidos": ["New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia","San Antonio","San Diego","Dallas","Austin","Miami","Atlanta","Boston","Seattle","Denver","Portland","Tampa","Nashville"],
    "México": ["México","Guadalajara","Monterrey","Puebla","Tijuana","Toluca","Querétaro","Pachuca","León","Mérida","Veracruz","Cancún","Aguascalientes","Mexicali","Acapulco","Cuernavaca","Hermosillo","Saltillo"],
    "Argentina": ["Buenos Aires","Córdoba","Rosario","Mendoza","La Plata","Mar del Plata","San Miguel","Tucumán","Salta","Santa Fe","Corrientes","Resistencia","Posadas","Bahía Blanca","Neuquén","Río Cuarto","Paraná","Formosa"],
    "Japão": ["Tokyo","Osaka","Yokohama","Nagoya","Sapporo","Kobe","Kyoto","Fukuoka","Kawasaki","Saitama","Hiroshima","Sendai","Kitakyushu","Chiba","Sakai","Niigata","Hamamatsu","Okayama"],
    "Coreia do Sul": ["Seoul","Busan","Incheon","Daegu","Daejeon","Gwangju","Suwon","Ulsan","Goyang","Yongin","Changwon","Seongnam","Cheongju","Jeonju","Ansan","Anyang","Pohang","Gimhae"],
    "Arábia Saudita": ["Riyadh","Jeddah","Mecca","Medina","Dammam","Khobar","Tabuk","Buraidah","Khamis Mushait","Hofuf","Hail","Najran","Yanbu","Abha","Jubail","Taif","Qatif","Sakaka"],
    "China": ["Beijing","Shanghai","Guangzhou","Shenzhen","Tianjin","Chongqing","Wuhan","Chengdu","Xi''an","Hangzhou","Nanjing","Suzhou","Qingdao","Dalian","Shenyang","Jinan","Harbin","Changsha"],
    "Índia": ["Mumbai","Delhi","Bangalore","Hyderabad","Chennai","Kolkata","Pune","Ahmedabad","Surat","Jaipur","Lucknow","Kanpur","Nagpur","Indore","Bhopal","Patna","Vadodara","Ludhiana"],
    "Austrália": ["Sydney","Melbourne","Brisbane","Perth","Adelaide","Gold Coast","Newcastle","Canberra","Wollongong","Hobart","Geelong","Townsville","Cairns","Darwin","Toowoomba","Ballarat","Bendigo","Mackay"],
    "África do Sul": ["Johannesburg","Cape Town","Durban","Pretoria","Port Elizabeth","Bloemfontein","East London","Polokwane","Nelspruit","Kimberley","Pietermaritzburg","Rustenburg","George","Welkom","Newcastle","Mbombela","Soweto","Sandton"],
    "Nigéria": ["Lagos","Abuja","Kano","Ibadan","Port Harcourt","Benin","Kaduna","Enugu","Aba","Onitsha","Ilorin","Jos","Maiduguri","Zaria","Warri","Akure","Calabar","Sokoto"],
    "Egito": ["Cairo","Alexandria","Giza","Shubra","Port Said","Suez","Mansoura","Tanta","Asyut","Faiyum","Zagazig","Ismailia","Aswan","Damanhur","Damietta","Beni Suef","Hurghada","Luxor"],
    "Suécia": ["Stockholm","Göteborg","Malmö","Uppsala","Västerås","Örebro","Linköping","Helsingborg","Jönköping","Norrköping","Lund","Umeå","Gävle","Borås","Eskilstuna","Halmstad","Karlstad","Sundsvall"],
    "Noruega": ["Oslo","Bergen","Trondheim","Stavanger","Drammen","Fredrikstad","Kristiansand","Sandnes","Tromsø","Sarpsborg","Skien","Ålesund","Sandefjord","Haugesund","Tønsberg","Moss","Porsgrunn","Bodø"],
    "Dinamarca": ["Copenhagen","Aarhus","Odense","Aalborg","Esbjerg","Randers","Kolding","Horsens","Vejle","Roskilde","Herning","Helsingør","Silkeborg","Næstved","Fredericia","Viborg","Køge","Holstebro"],
    "Suíça": ["Zürich","Genève","Basel","Bern","Lausanne","Winterthur","St. Gallen","Lugano","Luzern","Biel","Thun","Köniz","La Chaux-de-Fonds","Schaffhausen","Fribourg","Chur","Neuchâtel","Vernier"],
    "Áustria": ["Wien","Graz","Linz","Salzburg","Innsbruck","Klagenfurt","Villach","Wels","Sankt Pölten","Dornbirn","Steyr","Wiener Neustadt","Feldkirch","Bregenz","Leonding","Klosterneuburg","Baden","Wolfsberg"],
    "Chile": ["Santiago","Valparaíso","Concepción","Antofagasta","Temuco","Rancagua","Iquique","Talca","Arica","Chillán","La Serena","Calama","Coquimbo","Osorno","Valdivia","Punta Arenas","Quilpué","Copiapó"],
    "Colômbia": ["Bogotá","Medellín","Cali","Barranquilla","Cartagena","Cúcuta","Bucaramanga","Pereira","Santa Marta","Ibagué","Manizales","Pasto","Neiva","Villavicencio","Armenia","Popayán","Sincelejo","Valledupar"]
  }'::jsonb;
  city_arr text[];
  city text;
  prefix text;
  suffix text[] := ARRAY['FC','SC','AC','CF','United','City','Athletic','Sporting','Olympic'];
BEGIN
  city_arr := ARRAY(SELECT jsonb_array_elements_text(coalesce(cities->_country, '["United","City","Athletic","Royal","Olympic","Wanderers","Pioneers","Phoenix","Eagles","Lions","Tigers","Sharks","Wolves","Hawks","Stars","Galaxy","Storm","Thunder"]'::jsonb)));
  city := city_arr[((_idx - 1) % array_length(city_arr, 1)) + 1];
  prefix := prefixes[((_idx * 7) % array_length(prefixes, 1)) + 1];
  -- Alterna: alguns clubes "Prefix Cidade", outros "Cidade Suffix"
  IF _idx % 2 = 0 THEN
    RETURN prefix || ' ' || city;
  ELSE
    RETURN city || ' ' || suffix[((_idx * 3) % array_length(suffix, 1)) + 1];
  END IF;
END;
$$;

-- ───────────── Função: força do bot por divisão ─────────────
CREATE OR REPLACE FUNCTION public.bot_strength_for_division(_division int)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE _division
    WHEN 1 THEN 70 + floor(random() * 21)::int  -- 70-90
    WHEN 2 THEN 60 + floor(random() * 21)::int  -- 60-80
    WHEN 3 THEN 50 + floor(random() * 21)::int  -- 50-70
    ELSE          40 + floor(random() * 21)::int  -- 40-60
  END;
$$;

-- ───────────── Função: bot logo aleatório ─────────────
CREATE OR REPLACE FUNCTION public.random_bot_logo()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path TO 'public'
AS $$
  SELECT (ARRAY['⚽','🏆','⭐','🦁','🐅','🐺','🦅','🐂','🐎','🦈','🐊','🦌','🐘','🦏','🐃','🐉','🔥','⚡','🌟','💎','👑','🛡️','⚔️','🎯','🚀','🏰'])[floor(random() * 26 + 1)::int];
$$;

-- ───────────── Migração de humanos ─────────────
DO $$
DECLARE
  _hist RECORD;
  _country text;
  _target_league_id uuid;
  _shield jsonb;
  _logo text;
  _club_name text;
BEGIN
  FOR _hist IN
    -- Pega último estado de cada humano que estava em alguma liga antiga (que acabou de ser apagada).
    -- Usamos game_saves como fonte da verdade do clube.
    SELECT DISTINCT ON (gs.user_id)
      gs.user_id,
      gs.club_data
    FROM public.game_saves gs
    ORDER BY gs.user_id, gs.updated_at DESC
  LOOP
    _country := public.normalize_country(coalesce(_hist.club_data->'club'->>'country', _hist.club_data->>'country', ''));
    IF _country IS NULL THEN
      _country := 'Brasil'; -- fallback
    END IF;

    _club_name := coalesce(_hist.club_data->'club'->>'name', _hist.club_data->>'name', 'Manager FC');
    _logo := coalesce(_hist.club_data->'club'->>'logo', _hist.club_data->>'logo', '⚽');
    _shield := coalesce(_hist.club_data->'club'->'shield', _hist.club_data->'shield');

    -- Busca a divisão MAIS BAIXA do país (D4 > D3 > D2)
    SELECT id INTO _target_league_id
    FROM public.world_leagues
    WHERE country = _country AND season = 1
    ORDER BY division DESC
    LIMIT 1;

    IF _target_league_id IS NULL THEN
      -- Se não achou, joga em Brasil D4
      SELECT id INTO _target_league_id
      FROM public.world_leagues
      WHERE country = 'Brasil' AND division = 4 AND season = 1
      LIMIT 1;
    END IF;

    -- Insere humano no slot. Se já estiver lá (rerun), ignora.
    INSERT INTO public.world_league_teams (league_id, user_id, is_bot, club_name, club_logo, shield)
    VALUES (_target_league_id, _hist.user_id, false, _club_name, _logo, _shield)
    ON CONFLICT (league_id, club_name) DO NOTHING;
  END LOOP;
END $$;

-- ───────────── Povoamento com bots ─────────────
DO $$
DECLARE
  _league RECORD;
  _current_count int;
  _bots_needed int;
  _i int;
  _bot_name text;
  _attempt int;
BEGIN
  FOR _league IN
    SELECT id, country, division, total_slots
    FROM public.world_leagues
    WHERE season = 1
    ORDER BY country, division
  LOOP
    SELECT COUNT(*) INTO _current_count
    FROM public.world_league_teams
    WHERE league_id = _league.id;

    _bots_needed := _league.total_slots - _current_count;
    IF _bots_needed <= 0 THEN CONTINUE; END IF;

    _i := 1;
    WHILE _bots_needed > 0 AND _i < 200 LOOP
      _bot_name := public.generate_bot_club_name(_league.country, _i);
      -- Tenta inserir; se conflitar (nome duplicado), aumenta i
      BEGIN
        INSERT INTO public.world_league_teams (
          league_id, user_id, is_bot, bot_strength,
          club_name, club_logo
        ) VALUES (
          _league.id, NULL, true,
          public.bot_strength_for_division(_league.division),
          _bot_name,
          public.random_bot_logo()
        );
        _bots_needed := _bots_needed - 1;
      EXCEPTION WHEN unique_violation THEN
        -- nome colidiu, tenta o próximo
      END;
      _i := _i + 1;
    END LOOP;
  END LOOP;
END $$;

-- ───────────── Ativa as ligas ─────────────
UPDATE public.world_leagues
SET status = 'in_progress',
    current_matchday = 0,
    season_started_at = now(),
    season_ends_at = now() + interval '30 days'
WHERE season = 1 AND status = 'pending';