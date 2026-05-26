
-- =========================================================
-- FASE 1: Catálogo expandido de eventos de partida
-- =========================================================

-- 1) match_event_catalog
CREATE TABLE IF NOT EXISTS public.match_event_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('attack','defense','midfield','goalkeeper','special')),
  subcategory text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('goal','shot_on','shot_off','chance','foul','card','injury','flavor','save','woodwork')),
  base_weight numeric NOT NULL DEFAULT 1.0,
  min_minute int NOT NULL DEFAULT 0,
  max_minute int NOT NULL DEFAULT 120,
  requires_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  narration_templates text[] NOT NULL DEFAULT '{}',
  headline_templates text[] NOT NULL DEFAULT '{}',
  stats_impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_event_catalog_cat ON public.match_event_catalog(category, enabled);
CREATE INDEX IF NOT EXISTS idx_match_event_catalog_outcome ON public.match_event_catalog(outcome);

ALTER TABLE public.match_event_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event catalog public read"
ON public.match_event_catalog FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "event catalog admin write"
ON public.match_event_catalog FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2) match_context_modifiers
CREATE TABLE IF NOT EXISTS public.match_context_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  weight_multiplier numeric NOT NULL DEFAULT 1.0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.match_context_modifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modifiers public read"
ON public.match_context_modifiers FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "modifiers admin write"
ON public.match_context_modifiers FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3) match_narratives
CREATE TABLE IF NOT EXISTS public.match_narratives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL,
  shared_match_id uuid,
  headline text NOT NULL,
  summary text,
  tactical_read text,
  man_of_the_match jsonb,
  key_moments jsonb NOT NULL DEFAULT '[]'::jsonb,
  event_diversity_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_narratives_match ON public.match_narratives(match_id);
CREATE INDEX IF NOT EXISTS idx_match_narratives_shared ON public.match_narratives(shared_match_id);

ALTER TABLE public.match_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "narratives public read"
ON public.match_narratives FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "narratives service insert"
ON public.match_narratives FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4) match_history extras
ALTER TABLE public.match_history
  ADD COLUMN IF NOT EXISTS narrative_id uuid REFERENCES public.match_narratives(id),
  ADD COLUMN IF NOT EXISTS event_diversity_score numeric,
  ADD COLUMN IF NOT EXISTS man_of_the_match jsonb;

-- =========================================================
-- SEED: catálogo inicial (~120 eventos)
-- =========================================================

INSERT INTO public.match_event_catalog
(code, category, subcategory, outcome, base_weight, min_minute, max_minute, requires_context, narration_templates, headline_templates, stats_impact) VALUES

-- ============ ATAQUE ============
('attack.counter', 'attack','counter','chance', 1.2, 0, 120, '{}',
 ARRAY['{minute}'' Contra-ataque fulminante! {player} dispara em velocidade.','{minute}'' {team} sai jogando rápido, {player} lidera o contragolpe.','{minute}'' Roubada e saída em velocidade: {player} avança pelo meio.'],
 ARRAY['{team} explora contra-ataques e domina a partida'], '{"shots":1}'::jsonb),

('attack.counter_goal','attack','counter','goal', 0.35, 0, 120, '{}',
 ARRAY['GOOOL! {minute}'' Contra-ataque mortal finalizado por {player}!','{minute}'' Contra-ataque modelo: {assist} lança, {player} marca!','{minute}'' Que ataque rápido! {player} balança as redes!'],
 ARRAY['Contra-ataque decide: {team} vence com {player} em destaque'], '{"shots":1,"shots_on":1}'::jsonb),

('attack.tiki_taka','attack','tiki_taka','chance', 1.0, 0, 120, '{}',
 ARRAY['{minute}'' Troca rápida de passes do {team}, bola corre no chão.','{minute}'' Tabelinha bonita entre {player} e {assist}!','{minute}'' {team} faz dez, doze toques antes de finalizar.'],
 ARRAY['{team} dá aula de toque de bola'], '{"possession":1}'::jsonb),

('attack.tiki_taka_goal','attack','tiki_taka','goal', 0.25, 10, 120, '{}',
 ARRAY['GOOOL! {minute}'' Jogada ensaiada! {assist} cruza rasteiro e {player} empurra!','{minute}'' Troca rápida termina em gol: {player} marca para o {team}!'],
 ARRAY['{team} bordando o gramado: {player} fecha jogada coletiva'], '{"shots":1,"shots_on":1}'::jsonb),

('attack.cross','attack','cross','chance', 1.1, 0, 120, '{}',
 ARRAY['{minute}'' Cruzamento perigoso na área!','{minute}'' {player} cruza com perigo pela direita.','{minute}'' Bola levantada na área, defesa afasta com dificuldade.'],
 ARRAY[]::text[], '{"shots":1}'::jsonb),

('attack.cross_goal','attack','cross','goal', 0.30, 0, 120, '{}',
 ARRAY['GOOOL DE CABEÇA! {minute}'' {assist} cruza e {player} desvia para o gol!','{minute}'' Bola alçada na área, {player} aparece para marcar!'],
 ARRAY['{team} aproveita o jogo aéreo e leva a melhor'], '{"shots":1,"shots_on":1}'::jsonb),

('attack.long_shot','attack','long_shot','shot_off', 0.9, 0, 120, '{}',
 ARRAY['{minute}'' {player} arrisca de fora da área, bola passa rente.','{minute}'' Chute de longe de {player}, vai por cima do gol.','{minute}'' De fora, {player} bate firme — a bola sobe demais.'],
 ARRAY[]::text[], '{"shots":1}'::jsonb),

('attack.long_shot_on','attack','long_shot','shot_on', 0.6, 0, 120, '{}',
 ARRAY['{minute}'' Chute violento de {player}, {gk} encaixa!','{minute}'' Bomba de fora da área, defesa do goleiro!'],
 ARRAY[]::text[], '{"shots":1,"shots_on":1}'::jsonb),

('attack.long_shot_goal','attack','long_shot','goal', 0.18, 0, 120, '{}',
 ARRAY['GOLAÇO! {minute}'' {player} acerta um foguete de fora da área!','{minute}'' Que pintura! {player} marca de longe sem chance pro goleiro!'],
 ARRAY['Golaço de {player} ilumina partida do {team}'], '{"shots":1,"shots_on":1}'::jsonb),

('attack.dribble','attack','dribble','chance', 0.9, 0, 120, '{}',
 ARRAY['{minute}'' {player} parte para cima do marcador, drible desconcertante!','{minute}'' Que jogada individual de {player}! Passa por dois.','{minute}'' Drible curto de {player}, abre espaço.'],
 ARRAY[]::text[], '{}'::jsonb),

('attack.individual_goal','attack','individual','goal', 0.20, 0, 120, '{}',
 ARRAY['GOOOL! {minute}'' Jogada individual MAGNÍFICA de {player}!','{minute}'' {player} sai dos dois, finaliza e marca!','{minute}'' Tudo sozinho! {player} faz um golaço individual!'],
 ARRAY['{player} brilha sozinho e decide para o {team}'], '{"shots":1,"shots_on":1}'::jsonb),

('attack.through_ball','attack','through_ball','chance', 0.8, 0, 120, '{}',
 ARRAY['{minute}'' Lançamento em profundidade para {player}!','{minute}'' Bola enfiada perfeita encontra {player} entre os zagueiros.'],
 ARRAY[]::text[], '{}'::jsonb),

('attack.through_goal','attack','through_ball','goal', 0.22, 0, 120, '{}',
 ARRAY['GOL! {minute}'' {assist} lança nas costas da defesa e {player} marca!','{minute}'' Passe açucarado de {assist}, {player} fica cara a cara e não perdoa!'],
 ARRAY[]::text[], '{"shots":1,"shots_on":1}'::jsonb),

('attack.infiltration','attack','infiltration','chance', 0.7, 0, 120, '{}',
 ARRAY['{minute}'' {player} se infiltra pela área!','{minute}'' Movimentação inteligente de {player} sem bola.'],
 ARRAY[]::text[], '{}'::jsonb),

('attack.aerial','attack','aerial','chance', 0.7, 0, 120, '{}',
 ARRAY['{minute}'' Bola aérea, {player} sobe mais que todos!','{minute}'' Disputa pelo alto, {player} desvia de cabeça.'],
 ARRAY[]::text[], '{}'::jsonb),

('attack.rebound_goal','attack','rebound','goal', 0.15, 0, 120, '{}',
 ARRAY['GOL DO REBOTE! {minute}'' {gk} espalma e {player} aproveita!','{minute}'' No rebote! {player} estava ligado e marcou!'],
 ARRAY[]::text[], '{"shots":1,"shots_on":1}'::jsonb),

('attack.pressing','attack','pressing','chance', 0.9, 0, 120, '{}',
 ARRAY['{minute}'' {team} pressiona alto, recupera no campo de ataque.','{minute}'' Pressão ofensiva funciona e {player} rouba a bola.'],
 ARRAY[]::text[], '{}'::jsonb),

('attack.blocked_shot','attack','blocked_shot','flavor', 0.8, 0, 120, '{}',
 ARRAY['{minute}'' Finalização de {player} travada na pequena área!','{minute}'' {player} chuta mas a defesa bloqueia no susto.'],
 ARRAY[]::text[], '{"shots":1}'::jsonb),

('attack.woodwork','attack','woodwork','woodwork', 0.20, 0, 120, '{}',
 ARRAY['NA TRAVE! {minute}'' {player} acerta a madeira!','{minute}'' Bola explode no travessão! {player} levou a mão à cabeça.','{minute}'' Quase, quase! {player} carimba o poste!'],
 ARRAY[]::text[], '{"shots":1}'::jsonb),

('attack.unexpected_goal','attack','unexpected','goal', 0.10, 0, 120, '{}',
 ARRAY['GOL INESPERADO! {minute}'' Em uma jogada estranha, {player} marca!','{minute}'' Bola desviou e enganou todo mundo: {player} comemora!'],
 ARRAY['Lance bizarro decide: gol inesperado de {player}'], '{"shots":1,"shots_on":1}'::jsonb),

('attack.golazo','attack','golazo','goal', 0.08, 0, 120, '{}',
 ARRAY['GOLAÇO ESPETACULAR! {minute}'' {player} faz um gol para a história!','{minute}'' QUE GOL! {player} acerta uma pintura inacreditável!','{minute}'' BIZARRO! {player} marca um golaço de placa!'],
 ARRAY['Pintura! {player} marca um golaço inesquecível pelo {team}'], '{"shots":1,"shots_on":1}'::jsonb),

('attack.howler_miss','attack','howler','shot_off', 0.12, 0, 120, '{}',
 ARRAY['{minute}'' INCRÍVEL! {player} estava livre e chutou para fora!','{minute}'' Que falha grotesca de {player}! Mandou pra arquibancada!','{minute}'' {player} desperdiça gol feito! Inacreditável!'],
 ARRAY[]::text[], '{"shots":1}'::jsonb),

-- ============ DEFESA ============
('def.tackle','defense','tackle','flavor', 1.1, 0, 120, '{}',
 ARRAY['{minute}'' Carrinho preciso de {player}, rouba a bola limpa!','{minute}'' {player} entra de carrinho e desarma sem falta.'],
 ARRAY[]::text[], '{}'::jsonb),

('def.tackle_foul','defense','tackle','foul', 0.6, 0, 120, '{}',
 ARRAY['{minute}'' Carrinho duro de {player}, juiz marca falta.','{minute}'' Entrada forte de {player}, perigosa.'],
 ARRAY[]::text[], '{"fouls":1}'::jsonb),

('def.interception','defense','interception','flavor', 1.0, 0, 120, '{}',
 ARRAY['{minute}'' {player} intercepta o passe e organiza a saída.','{minute}'' Leitura perfeita de {player}, rouba no meio.'],
 ARRAY[]::text[], '{}'::jsonb),

('def.decisive_clearance','defense','clearance','flavor', 0.9, 0, 120, '{}',
 ARRAY['{minute}'' Corte providencial de {player} antes do chute!','{minute}'' {player} salva o que era gol certo!'],
 ARRAY[]::text[], '{}'::jsonb),

('def.high_line','defense','high_line','flavor', 0.6, 0, 120, '{}',
 ARRAY['{minute}'' Linha alta do {team} funciona, deixa o atacante em impedimento.','{minute}'' Bandeira sobe! Linha defensiva do {team} bem ajustada.'],
 ARRAY[]::text[], '{"offsides":1}'::jsonb),

('def.error_goal','defense','error','goal', 0.18, 0, 120, '{}',
 ARRAY['GOL! {minute}'' Erro defensivo de {player} entrega o gol para o adversário!','{minute}'' Que falha do zagueiro! {player} se complica e o rival agradece!'],
 ARRAY['Falha defensiva de {player} pesa no resultado'], '{"shots":1,"shots_on":1}'::jsonb),

('def.defender_blunder','defense','blunder','flavor', 0.25, 0, 120, '{}',
 ARRAY['{minute}'' Recuo errado de {player}, quase entrega para o atacante!','{minute}'' {player} se atrapalha na saída, sorte que {gk} resolveu.'],
 ARRAY[]::text[], '{}'::jsonb),

('def.miracle_block','defense','miracle','flavor', 0.30, 0, 120, '{}',
 ARRAY['{minute}'' BLOQUEIO MILAGROSO de {player}!','{minute}'' Salvou o time! {player} se joga e tira a bola da linha!'],
 ARRAY['{player} salva o {team} com bloqueio milagroso'], '{}'::jsonb),

('def.aerial_clearance','defense','aerial','flavor', 0.7, 0, 120, '{}',
 ARRAY['{minute}'' {player} sobe firme e afasta de cabeça.','{minute}'' Domínio aéreo de {player} pela zaga.'],
 ARRAY[]::text[], '{}'::jsonb),

('def.pressing_mark','defense','pressing','flavor', 0.7, 0, 120, '{}',
 ARRAY['{minute}'' {team} marca por pressão, dificulta a saída adversária.','{minute}'' Marcação asfixiante do {team} sufoca o ataque.'],
 ARRAY[]::text[], '{}'::jsonb),

-- ============ MEIO-CAMPO ============
('mid.possession','midfield','possession','flavor', 1.0, 0, 120, '{}',
 ARRAY['{minute}'' {team} mantém a posse, troca passes no meio.','{minute}'' Bola rolando com {player}, controle absoluto.'],
 ARRAY[]::text[], '{"possession":1}'::jsonb),

('mid.slow_tempo','midfield','tempo','flavor', 0.6, 0, 120, '{}',
 ARRAY['{minute}'' Jogo cadenciado, {team} segura o ritmo.','{minute}'' Ritmo mais lento, {player} segura a bola para esfriar.'],
 ARRAY[]::text[], '{}'::jsonb),

('mid.bad_pass','midfield','bad_pass','flavor', 0.9, 0, 120, '{}',
 ARRAY['{minute}'' Passe errado de {player}, entrega a posse.','{minute}'' Atrapalhou-se: {player} passa errado no meio.'],
 ARRAY[]::text[], '{}'::jsonb),

('mid.playmaker_shine','midfield','playmaker','chance', 0.7, 0, 120, '{}',
 ARRAY['{minute}'' {player} pinta no meio, distribui e organiza o jogo.','{minute}'' Que partida do meia armador {player}! Inspirado.'],
 ARRAY['{player} comanda o meio-campo do {team}'], '{}'::jsonb),

('mid.lose_control','midfield','control_loss','flavor', 0.6, 0, 120, '{}',
 ARRAY['{minute}'' {team} perde o controle do meio, adversário cresce.','{minute}'' Meio-campo do {team} desorganizado nesse momento.'],
 ARRAY[]::text[], '{}'::jsonb),

('mid.creative_chance','midfield','creation','chance', 0.8, 0, 120, '{}',
 ARRAY['{minute}'' {player} cria do nada e abre o jogo!','{minute}'' Lance de criatividade: {player} pensa diferente.'],
 ARRAY[]::text[], '{}'::jsonb),

-- ============ GOLEIRO ============
('gk.save_easy','goalkeeper','save','save', 1.0, 0, 120, '{}',
 ARRAY['{minute}'' {gk} faz a defesa sem maiores problemas.','{minute}'' Bola nas mãos de {gk}, sem sustos.'],
 ARRAY[]::text[], '{"saves":1}'::jsonb),

('gk.save_close_range','goalkeeper','save','save', 0.4, 0, 120, '{}',
 ARRAY['{minute}'' DEFESAÇA de {gk} à queima-roupa!','{minute}'' {gk} salva de perto! Reflexo impressionante!'],
 ARRAY[]::text[], '{"saves":1}'::jsonb),

('gk.miracle_save','goalkeeper','miracle','save', 0.25, 0, 120, '{}',
 ARRAY['{minute}'' DEFESA MILAGROSA de {gk}! Salvou o {team}!','{minute}'' Que defesa! {gk} faz milagre e segura o resultado!'],
 ARRAY['{gk} salva o {team} com defesa milagrosa'], '{"saves":1}'::jsonb),

('gk.penalty_save','goalkeeper','penalty_save','save', 0.5, 0, 120, '{"penalty": true}',
 ARRAY['{minute}'' DEFENDEU! {gk} pega o pênalti e leva o {team} à loucura!','{minute}'' PEGOU! {gk} adivinha o canto e defende a cobrança!'],
 ARRAY['{gk} heroico: defende pênalti e garante o {team}'], '{"saves":1}'::jsonb),

('gk.howler','goalkeeper','howler','goal', 0.10, 0, 120, '{}',
 ARRAY['FRANGO! {minute}'' {gk} aceita um chute fácil, bola entra mansa!','{minute}'' Que vacilo de {gk}! A bola escorrega por baixo do corpo!'],
 ARRAY['Frangaço de {gk} pesa para o {team}'], '{"shots":1,"shots_on":1}'::jsonb),

('gk.quick_throw','goalkeeper','distribution','flavor', 0.6, 0, 120, '{}',
 ARRAY['{minute}'' Reposição rápida de {gk} arma contra-ataque.','{minute}'' {gk} lança rápido, surpreende a marcação.'],
 ARRAY[]::text[], '{}'::jsonb),

('gk.bad_exit','goalkeeper','bad_exit','flavor', 0.25, 0, 120, '{}',
 ARRAY['{minute}'' Saída errada de {gk}, defesa precisa salvar!','{minute}'' {gk} se atrapalha ao sair do gol!'],
 ARRAY[]::text[], '{}'::jsonb),

('gk.legendary','goalkeeper','legendary','save', 0.15, 60, 120, '{}',
 ARRAY['{minute}'' ATUAÇÃO LENDÁRIA de {gk}! Mais uma defesa absurda!','{minute}'' {gk} está jogando MUITO! Defesa após defesa!'],
 ARRAY['{gk} faz partida histórica no gol do {team}'], '{"saves":1}'::jsonb),

-- ============ ESPECIAIS ============
('special.crowd_hype','special','crowd','flavor', 0.5, 0, 120, '{"crowd_pressure_gte": 0.7}',
 ARRAY['{minute}'' Torcida do {team} inflama o time! Estádio fervendo!','{minute}'' A torcida empurra! Cântico ensurdecedor no estádio!'],
 ARRAY[]::text[], '{}'::jsonb),

('special.boo','special','boo','flavor', 0.4, 30, 120, '{"morale_lt": 40}',
 ARRAY['{minute}'' Torcida vaia o {team}, clima pesado!','{minute}'' Vaias na arquibancada, paciência se esgotando.'],
 ARRAY[]::text[], '{}'::jsonb),

('special.weather','special','weather','flavor', 0.3, 0, 120, '{"weather_any": true}',
 ARRAY['{minute}'' Chuva forte atrapalha a troca de passes!','{minute}'' Vento no estádio dificulta os cruzamentos.','{minute}'' Gramado pesado: bola não corre como deveria.'],
 ARRAY[]::text[], '{}'::jsonb),

('special.nervous','special','nervous','foul', 0.3, 0, 120, '{}',
 ARRAY['{minute}'' {player} nervoso em campo, comete falta boba.','{minute}'' Cabeça quente: {player} reclama com o juiz.'],
 ARRAY[]::text[], '{"fouls":1}'::jsonb),

('special.inspired','special','inspired','chance', 0.4, 0, 120, '{"morale_gte": 80}',
 ARRAY['{minute}'' {player} inspirado! Joga muito hoje!','{minute}'' Que noite de {player}! Está em outro nível!'],
 ARRAY[]::text[], '{}'::jsonb),

('special.in_match_injury','special','injury','injury', 0.18, 0, 120, '{}',
 ARRAY['{minute}'' {player} cai no gramado! Pode estar lesionado.','{minute}'' Departamento médico em campo: {player} sente dores.'],
 ARRAY['{player} sai lesionado e preocupa o {team}'], '{"injuries":1}'::jsonb),

('special.dissent_card','special','card','card', 0.35, 0, 120, '{}',
 ARRAY['{minute}'' Cartão amarelo para {player} por reclamação!','{minute}'' {player} discute com o juiz e leva o amarelo.'],
 ARRAY[]::text[], '{"cards_yellow":1}'::jsonb),

('special.brawl','special','brawl','foul', 0.15, 30, 120, '{}',
 ARRAY['{minute}'' Confusão generalizada em campo! Jogadores se empurram!','{minute}'' Briga feia! Juiz precisa separar a confusão!'],
 ARRAY['Confusão marca jogo entre {team} e adversário'], '{"fouls":2,"cards_yellow":1}'::jsonb),

('special.var_disallowed','special','var','flavor', 0.20, 0, 120, '{}',
 ARRAY['{minute}'' VAR anula o gol! {player} estava em impedimento!','{minute}'' Após revisão, o juiz invalida o lance!'],
 ARRAY['VAR anula gol e muda o rumo da partida'], '{"shots_on":1,"offsides":1}'::jsonb),

('special.last_minute_winner','special','last_minute','goal', 0.35, 88, 120, '{}',
 ARRAY['GOL NO ÚLTIMO MINUTO! {minute}'' {player} marca e leva o {team} à loucura!','{minute}'' NO FIM! {player} aparece para decidir!'],
 ARRAY['{player} marca no apagar das luzes e decide para o {team}'], '{"shots":1,"shots_on":1}'::jsonb),

('special.dramatic_stoppage','special','stoppage','flavor', 0.4, 88, 120, '{}',
 ARRAY['{minute}'' Acréscimos dramáticos! Cinco minutos para tudo acontecer!','{minute}'' Jogo eletrizante nos minutos finais!'],
 ARRAY[]::text[], '{}'::jsonb),

('special.comeback','special','comeback','flavor', 0.20, 60, 120, '{}',
 ARRAY['{minute}'' {team} cresce no jogo e busca virada histórica!','{minute}'' Reação espetacular do {team}!'],
 ARRAY['Virada histórica! {team} reage e leva o resultado'], '{}'::jsonb),

('special.upset','special','upset','flavor', 0.15, 70, 120, '{"underdog": true}',
 ARRAY['{minute}'' ZEBRA! {team} segura o resultado contra o favorito!','{minute}'' Zebra no ar! O {team} surpreende!'],
 ARRAY['Zebra! {team} surpreende e vence o favorito'], '{}'::jsonb),

('special.dominance','special','dominance','flavor', 0.5, 20, 120, '{}',
 ARRAY['{minute}'' {team} domina completamente as ações!','{minute}'' Não tem para ninguém! {team} controla o jogo.'],
 ARRAY['{team} dá show e domina o adversário'], '{}'::jsonb),

('special.scrappy','special','scrappy','flavor', 0.5, 0, 120, '{}',
 ARRAY['{minute}'' Jogo truncado, muitas faltas no meio!','{minute}'' Partida feia, equipes erram passes simples.'],
 ARRAY[]::text[], '{"fouls":1}'::jsonb),

('special.fatigue','special','fatigue','flavor', 0.6, 65, 120, '{"low_stamina": true}',
 ARRAY['{minute}'' Desgaste físico aparece, ritmo cai bastante.','{minute}'' Jogadores cansados, partida fica mais lenta.'],
 ARRAY[]::text[], '{}'::jsonb)

ON CONFLICT (code) DO NOTHING;

-- =========================================================
-- SEED: modificadores de contexto (~25)
-- =========================================================

INSERT INTO public.match_context_modifiers
(code, description, condition, event_filter, weight_multiplier) VALUES

('derby_fouls','Clássico aumenta faltas e cartões',
 '{"derby":true}'::jsonb, '{"outcome":["foul","card"]}'::jsonb, 1.4),

('derby_pressing','Clássico aumenta pressão e marcação',
 '{"derby":true}'::jsonb, '{"subcategory":["pressing"]}'::jsonb, 1.3),

('derby_brawl','Clássico aumenta confusões',
 '{"derby":true}'::jsonb, '{"code":["special.brawl"]}'::jsonb, 1.8),

('rain_no_tiki','Chuva forte reduz toque de bola',
 '{"weather":"heavy_rain"}'::jsonb, '{"subcategory":["tiki_taka"]}'::jsonb, 0.6),

('rain_howler','Chuva aumenta falhas e frangos',
 '{"weather":"heavy_rain"}'::jsonb, '{"subcategory":["howler","blunder","bad_exit","error"]}'::jsonb, 1.5),

('rain_long','Chuva aumenta chutes de fora',
 '{"weather":"heavy_rain"}'::jsonb, '{"subcategory":["long_shot"]}'::jsonb, 1.2),

('wind_cross_down','Vento reduz cruzamentos',
 '{"weather":"windy"}'::jsonb, '{"subcategory":["cross","aerial"]}'::jsonb, 0.75),

('offensive_coach_counter','Técnico ofensivo aumenta contra-ataques',
 '{"coach_style":"offensive"}'::jsonb, '{"subcategory":["counter","long_shot","through_ball","golazo"]}'::jsonb, 1.25),

('defensive_coach_block','Técnico defensivo aumenta bloqueios e marcação',
 '{"coach_style":"defensive"}'::jsonb, '{"subcategory":["clearance","blocked_shot","pressing","miracle"]}'::jsonb, 1.3),

('defensive_coach_slow','Técnico defensivo reduz chances de gol',
 '{"coach_style":"defensive"}'::jsonb, '{"outcome":["goal"]}'::jsonb, 0.8),

('high_morale_goals','Moral alta aumenta gols e jogadas inspiradas',
 '{"morale_gte":80}'::jsonb, '{"outcome":["goal"]}'::jsonb, 1.15),

('high_morale_inspired','Moral alta libera lances inspirados',
 '{"morale_gte":80}'::jsonb, '{"subcategory":["inspired","playmaker","golazo"]}'::jsonb, 1.4),

('low_morale_errors','Moral baixa aumenta erros',
 '{"morale_lt":40}'::jsonb, '{"subcategory":["bad_pass","blunder","howler","error","bad_exit"]}'::jsonb, 1.5),

('low_morale_boo','Moral baixa aumenta vaias',
 '{"morale_lt":40}'::jsonb, '{"code":["special.boo"]}'::jsonb, 2.0),

('crowd_full_hype','Estádio cheio inflama torcida',
 '{"crowd_pressure_gte":0.8}'::jsonb, '{"code":["special.crowd_hype"]}'::jsonb, 1.8),

('crowd_full_home_boost','Estádio cheio favorece mandante',
 '{"crowd_pressure_gte":0.8,"side":"home"}'::jsonb, '{"outcome":["goal","chance"]}'::jsonb, 1.1),

('low_stamina_errors','Fadiga aumenta erros e cansaço',
 '{"low_stamina":true}'::jsonb, '{"subcategory":["bad_pass","blunder","fatigue"]}'::jsonb, 1.4),

('low_stamina_no_press','Fadiga reduz pressão',
 '{"low_stamina":true}'::jsonb, '{"subcategory":["pressing"]}'::jsonb, 0.7),

('big_rep_dominance','Time muito mais forte domina',
 '{"reputation_gap_gte":15}'::jsonb, '{"subcategory":["dominance","possession"]}'::jsonb, 1.3),

('big_rep_underdog','Underdog tem menos chances de gol',
 '{"underdog":true}'::jsonb, '{"outcome":["goal"]}'::jsonb, 0.85),

('upset_window','Janela de zebra no fim do jogo',
 '{"underdog":true,"phase":"late"}'::jsonb, '{"code":["special.upset","special.last_minute_winner"]}'::jsonb, 1.6),

('stoppage_drama','Acréscimos elevam emoção',
 '{"phase":"stoppage"}'::jsonb, '{"category":["special"]}'::jsonb, 1.3),

('first_minutes_calm','Primeiros minutos mais cadenciados',
 '{"phase":"opening"}'::jsonb, '{"subcategory":["tempo","possession"]}'::jsonb, 1.2),

('first_minutes_no_drama','Sem viradas/zebras no início',
 '{"phase":"opening"}'::jsonb, '{"subcategory":["last_minute","comeback","upset"]}'::jsonb, 0.0),

('late_phase_pressure','Fim de jogo aumenta pressão e chances',
 '{"phase":"late"}'::jsonb, '{"subcategory":["pressing","counter","cross"]}'::jsonb, 1.2)

ON CONFLICT (code) DO NOTHING;
