import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// --- Simulation helpers ---
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function rng() { return Math.random(); }
function pick<T>(arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }

interface SimPlayer {
  id: string; name: string; position: string; team: 'home' | 'away'; ovr: number;
  rating: number; goals: number; assists: number; yellowCards: number; isOnPitch: boolean;
  stamina: number; morale: number;
  speed: number; shooting: number; passing: number; defending: number; physical: number;
  dribbling: number; heading: number; marking: number; vision: number; crossing: number;
  longShots: number; workRate: number; composure: number; aggression: number;
  goalkeeping: number; setPieces: number; positioning: number;
}

interface SimEvent {
  minute: number; type: string; description: string; team: 'home' | 'away' | 'neutral';
  playerName?: string; assistName?: string; goalType?: string; isGoal?: boolean;
}

function genAwayAttrs(ovr: number, pos: string) {
  const variance = () => Math.floor(ovr + (rng() * 16 - 8));
  const isGK = pos === 'GOL'; const isDef = pos === 'ZAG' || pos === 'LAT'; const isAtt = pos === 'ATA';
  return {
    speed: variance(), shooting: isAtt ? variance() + 5 : variance() - 5,
    passing: variance(), defending: isDef ? variance() + 5 : variance() - 5,
    physical: variance(), dribbling: isAtt ? variance() + 3 : variance(),
    heading: isDef ? variance() + 3 : variance(), marking: isDef ? variance() + 5 : variance() - 5,
    vision: variance(), crossing: variance(), longShots: variance(),
    workRate: variance(), composure: variance(), aggression: variance(),
    goalkeeping: isGK ? variance() + 10 : 0, setPieces: variance(), positioning: variance(),
  };
}

function pickByAttr(pool: SimPlayer[], attr: keyof SimPlayer, posFilter?: string): SimPlayer | null {
  let filtered = pool.filter(p => p.isOnPitch);
  if (posFilter) { const f2 = filtered.filter(p => p.position === posFilter); if (f2.length > 0) filtered = f2; }
  if (filtered.length === 0) return null;
  const weights = filtered.map(p => Math.max(1, Number(p[attr]) || 50));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < filtered.length; i++) { r -= weights[i]; if (r <= 0) return filtered[i]; }
  return filtered[filtered.length - 1];
}

function teamAvgAttr(players: SimPlayer[], team: 'home' | 'away', attr: keyof SimPlayer): number {
  const pool = players.filter(p => p.team === team && p.isOnPitch);
  if (pool.length === 0) return 50;
  return pool.reduce((s, p) => s + (Number(p[attr]) || 50), 0) / pool.length;
}

function simulateFullMatch(
  homeTeam: string, awayTeam: string, homePlayers: any[], 
  homeStrength: number, awayStrength: number, tactics: any,
  stadiumName: string, isHome: boolean
) {
  // Build sim players
  const home: SimPlayer[] = homePlayers.slice(0, 11).map((p: any, i: number) => ({
    id: p.id, name: (p.name || '').split(' ').pop() || p.name || `Jog${i}`,
    position: p.position || 'MEI', team: 'home' as const, ovr: p.overall || 60,
    rating: 6.0, goals: 0, assists: 0, yellowCards: 0, isOnPitch: true,
    stamina: p.stamina || 80, morale: p.morale || 70,
    speed: p.attributes?.speed || 50, shooting: p.attributes?.shooting || 50,
    passing: p.attributes?.passing || 50, defending: p.attributes?.defending || 50,
    physical: p.attributes?.physical || 50, dribbling: p.attributes?.dribbling || 50,
    heading: p.attributes?.heading || 50, marking: p.attributes?.marking || 50,
    vision: p.attributes?.vision || 50, crossing: p.attributes?.crossing || 50,
    longShots: p.attributes?.longShots || 50, workRate: p.attributes?.workRate || 50,
    composure: p.attributes?.composure || 50, aggression: p.attributes?.aggression || 50,
    goalkeeping: p.attributes?.goalkeeping || 0, setPieces: p.attributes?.setPieces || 50,
    positioning: p.attributes?.positioning || 50,
  }));

  const awayNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Ribeiro', 'Gomes'];
  const away: SimPlayer[] = Array.from({ length: 11 }, (_, i) => {
    const pos = i === 0 ? 'GOL' : i < 5 ? 'ZAG' : i < 9 ? 'MEI' : 'ATA';
    const ovr = Math.floor(awayStrength + (rng() * 8 - 4));
    const attrs = genAwayAttrs(ovr, pos);
    return {
      id: `a${i}`, name: awayNames[i] || `Jog.${i + 1}`, position: pos,
      team: 'away' as const, ovr, rating: 6.0, goals: 0, assists: 0, yellowCards: 0,
      isOnPitch: true, stamina: 70 + Math.floor(rng() * 20), morale: 60 + Math.floor(rng() * 30),
      ...attrs,
    };
  });

  const allPlayers = [...home, ...away];

  // Tactical modifiers
  const pressing = tactics?.pressing || 'medio';
  const playStyle = tactics?.playStyle || 'equilibrado';
  const tempo = tactics?.tempo || 'normal';
  const passingStyle = tactics?.passingStyle || 'misto';
  const defenseLine = tactics?.defenseLine || 'media';

  const homeAdv = isHome ? 1.08 : 0.95;
  const avgMorale = home.reduce((s, p) => s + p.morale, 0) / Math.max(1, home.length);
  const moraleMod = 0.85 + (avgMorale / 100) * 0.3;
  const avgStamina = home.reduce((s, p) => s + p.stamina, 0) / 11;
  const fatigueMod = 0.8 + (avgStamina / 100) * 0.2;
  const pressingMod = pressing === 'ultra-alto' ? 1.3 : pressing === 'alto' ? 1.15 : pressing === 'medio' ? 1.0 : 0.85;
  const offensiveMod = playStyle === 'ofensivo' ? 1.25 : playStyle === 'contra-ataque' ? 1.1 : playStyle === 'equilibrado' ? 1.0 : playStyle === 'posse' ? 0.85 : 0.7;
  const tempoMod = tempo === 'muito-rapido' ? 1.2 : tempo === 'rapido' ? 1.1 : tempo === 'normal' ? 1.0 : 0.85;
  const longPassMod = passingStyle === 'longo' || passingStyle === 'direto' ? 1.4 : passingStyle === 'misto' ? 1.0 : 0.6;
  const shortPassMod = passingStyle === 'curto' ? 1.4 : passingStyle === 'misto' ? 1.0 : 0.7;
  const highLineMod = defenseLine === 'alta' ? 1.2 : defenseLine === 'media' ? 1.0 : 0.8;

  const events: SimEvent[] = [];
  let homeGoals = 0, awayGoals = 0;
  const stats = {
    possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0], corners: [0, 0],
    fouls: [0, 0], yellowCards: [0, 0], redCards: [0, 0], passes: [0, 0],
    tackles: [0, 0], saves: [0, 0], offsides: [0, 0],
  };
  const guarantees = { hasGoalOrChance: false, hasCard: false, hasSub: false };
  let lastEventMin = -1;

  // Kickoff
  events.push({ minute: 0, type: 'kickoff', description: `⚽ O árbitro apita e ${homeTeam} dá a saída de bola no ${stadiumName}! Público vibrando nas arquibancadas, a bola rola!`, team: 'home' });

  // Generate events for 90 minutes (+ added time)
  for (let min = 1; min <= 95; min++) {
    // Half-time at 45
    if (min === 46) {
      const addedTime1 = Math.floor(1 + rng() * 4);
      events.push({ minute: 45, type: 'added_time', description: `⏱️ O quarto árbitro sinaliza: +${addedTime1} minutos de acréscimos no primeiro tempo!`, team: 'neutral' });
      events.push({ minute: 45 + addedTime1, type: 'halftime', description: `⏱️ Fim do primeiro tempo! ${homeTeam} ${homeGoals} x ${awayGoals} ${awayTeam}. Os jogadores seguem para o vestiário. Hora dos ajustes táticos!`, team: 'neutral' });
    }

    // Multiple event chances per minute
    const ticksPerMin = 4 + Math.floor(rng() * 4); // 4-7 ticks per minute for more density
    for (let t = 0; t < ticksPerMin; t++) {
      if (rng() > 0.50 * tempoMod) continue;

      const homeOff = (teamAvgAttr(allPlayers, 'home', 'shooting') + teamAvgAttr(allPlayers, 'home', 'passing') + teamAvgAttr(allPlayers, 'home', 'speed')) / 3;
      const awayOff = (teamAvgAttr(allPlayers, 'away', 'shooting') + teamAvgAttr(allPlayers, 'away', 'passing') + teamAvgAttr(allPlayers, 'away', 'speed')) / 3;
      const effectiveHome = homeOff * homeAdv * moraleMod * fatigueMod;
      const ratio = effectiveHome / (effectiveHome + awayOff);
      const teamIdx: 0 | 1 = rng() < ratio ? 0 : 1;
      const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
      const tName = team === 'home' ? homeTeam : awayTeam;
      const opp = team === 'home' ? awayTeam : homeTeam;
      const oppTeamKey: 'home' | 'away' = team === 'home' ? 'away' : 'home';
      const homePlrs = allPlayers.filter(p => p.team === team && p.isOnPitch);
      const oppPlrs = allPlayers.filter(p => p.team === oppTeamKey && p.isOnPitch);
      const pName = homePlrs.length > 0 ? pick(homePlrs).name : 'Jogador';
      const pName2 = homePlrs.length > 0 ? pick(homePlrs).name : 'Jogador';
      const oppName = oppPlrs.length > 0 ? pick(oppPlrs).name : 'Adversário';
      const g = guarantees;

      // Force card if none yet and past minute 60
      if (!g.hasCard && min >= 60 && rng() < 0.3) {
        g.hasCard = true;
        stats.fouls[teamIdx]++; stats.yellowCards[teamIdx]++;
        const p = pick(homePlrs);
        if (p && team === 'home') { p.yellowCards++; p.rating = Math.max(3, p.rating - 0.4); }
        events.push({ minute: min, type: 'yellow_card', description: `🟨 CARTÃO AMARELO! ${pName} entra forte demais na dividida com ${oppName}, o árbitro não hesita e mostra o cartão. Falta perigosa na intermediária, ${opp} terá a cobrança.`, team, playerName: pName });
        continue;
      }

      // Force sub if none yet past 55
      if (!g.hasSub && min >= 55 && rng() < 0.25) {
        g.hasSub = true;
        events.push({ minute: min, type: 'substitution', description: `🔄 SUBSTITUIÇÃO! O técnico do ${tName} decide mexer na equipe. Troca tática buscando mais intensidade nesta reta final de jogo. A torcida aplaude o jogador que sai de campo.`, team });
        continue;
      }

      // Force chance if no goal/chance past 80
      if (!g.hasGoalOrChance && min >= 80 && rng() < 0.5) {
        g.hasGoalOrChance = true;
        stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
        events.push({ minute: min, type: 'great_save', description: `🧤 QUE CHANCE INCRÍVEL! ${pName} recebe livre na cara do gol, prepara a finalização com força e o goleiro do ${opp} se estica todo para fazer uma defesa sensacional! A torcida grita de espanto!`, team, playerName: pName });
        continue;
      }

      // Weighted event generation
      const r = rng();
      let cumul = 0;

      // Possession (8%)
      cumul += 0.08;
      if (r < cumul) {
        events.push({ minute: min, type: 'possession', description: pick([
          `⚽ ${tName} troca passes com tranquilidade na intermediária. ${pName} conduz a bola pelo setor central, esperando uma abertura na defesa adversária.`,
          `⚽ A bola circula de um lado para o outro no campo do ${tName}. ${pName} e ${pName2} trabalham a posse com inteligência, buscando espaços entre as linhas do ${opp}.`,
          `⚽ ${tName} domina as ações neste momento. ${pName} recebe na faixa central e distribui o jogo, ditando o ritmo da partida com passes curtos e objetivos.`,
          `⚽ O ${tName} não tem pressa. A equipe trabalha a bola no campo de defesa, esperando o momento certo para acelerar e surpreender o adversário.`,
          `⚽ Jogo equilibrado na intermediária. ${pName} do ${tName} busca a tabela com ${pName2} mas a defesa do ${opp} se posiciona bem e corta a jogada.`,
        ]), team });
        continue;
      }

      // Short pass OK (6%)
      cumul += 0.06 * shortPassMod;
      if (r < cumul) {
        stats.passes[teamIdx]++;
        events.push({ minute: min, type: 'short_pass_ok', description: pick([
          `📍 Toque de primeira! ${pName} recebe de costas e, com classe, gira e acha ${pName2} em posição perfeita para avançar. Jogada ensaiada que funcionou muito bem!`,
          `📍 ${pName} enfia a bola rasteira no corredor para ${pName2}, que domina no peito e segue em velocidade pela lateral. Que visão de jogo!`,
          `📍 Troca rápida de passes entre ${pName} e ${pName2}! A dupla combina bem e consegue avançar até o campo ofensivo com uma tabela curta e objetiva.`,
          `📍 ${pName} recebe na meia-lua e acha ${pName2} com um passe rasteiro perfeito, quebrando a primeira linha de marcação do ${opp}.`,
        ]), team });
        continue;
      }

      // Short pass fail (2%)
      cumul += 0.02;
      if (r < cumul) {
        stats.passes[teamIdx]++;
        events.push({ minute: min, type: 'short_pass_fail', description: pick([
          `❌ Erro de passe! ${pName} tenta o toque curto para ${pName2}, mas a bola é interceptada por ${oppName} do ${opp}. Posse recuperada na intermediária!`,
          `❌ ${pName} se atrapalha na saída de bola e entrega a posse. ${oppName} antecipa o passe e o ${opp} pode sair em contra-ataque perigoso!`,
        ]), team });
        continue;
      }

      // Long pass OK (4%)
      cumul += 0.04 * longPassMod;
      if (r < cumul) {
        stats.passes[teamIdx]++;
        events.push({ minute: min, type: 'long_pass_ok', description: pick([
          `🎯 LANÇAMENTO ESPETACULAR de ${pName}! A bola cruza 40 metros no ar e encontra ${pName2} que domina com maestria na entrada da área. Jogadaça do ${tName}!`,
          `🎯 ${pName} levanta a cabeça e acha ${pName2} nas costas da defesa com um lançamento milimétrico! A bola chega limpa e o atacante tem espaço para avançar!`,
          `🎯 Bola longa de ${pName} vinda lá de trás! ${pName2} ganha na velocidade do defensor e consegue o domínio. O ${tName} chega com perigo pela primeira vez no setor!`,
        ]), team });
        continue;
      }

      // Long pass fail (2.5%)
      cumul += 0.025;
      if (r < cumul) {
        events.push({ minute: min, type: 'long_pass_fail', description: pick([
          `💨 ${pName} tenta o lançamento longo mas calcula mal a força. A bola sai sem direção e a posse fica com o ${opp}. Precisava de mais capricho nessa hora.`,
          `💨 Lançamento de ${pName} passa por cima de todo mundo e sai pela linha de fundo. Tiro de meta para o ${opp}.`,
        ]), team });
        continue;
      }

      // Through ball (3%)
      cumul += 0.03 * highLineMod;
      if (r < cumul) {
        stats.passes[teamIdx]++;
        events.push({ minute: min, type: 'through_ball', description: pick([
          `🚀 BOLA ENFIADA GENIAL! ${pName} percebe o movimento de ${pName2} e coloca a bola no espaço entre os zagueiros! O atacante arranca em velocidade, será que vai ficar na cara do gol?`,
          `🚀 Passe de gênio de ${pName}! A bola passa como uma agulha entre os defensores e encontra ${pName2} em disparada. A torcida se levanta, é lance de perigo!`,
        ]), team });
        continue;
      }

      // Dribble (4%)
      cumul += 0.04;
      if (r < cumul) {
        const dribblerAttr = teamAvgAttr(allPlayers, team, 'dribbling');
        const defenderAttr = teamAvgAttr(allPlayers, oppTeamKey, 'marking');
        if (rng() < dribblerAttr / (dribblerAttr + defenderAttr)) {
          const p = pickByAttr(allPlayers.filter(pp => pp.team === team), 'dribbling');
          if (p) p.rating = Math.min(10, p.rating + 0.15);
          events.push({ minute: min, type: 'dribble_ok', description: pick([
            `✨ QUE JOGADA! ${p?.name || pName} puxa a bola para o corpo, faz o defensor ir pro lado errado e passa como se não houvesse marcação! A torcida vai à loucura!`,
            `✨ ${p?.name || pName} recebe a bola e parte pra cima! Corta pra dentro, deixa ${oppName} no chão com um drible desconcertante e segue em velocidade pela faixa central!`,
            `✨ Chapéu! ${p?.name || pName} humilha ${oppName} com uma jogada de habilidade pura! A bola passa por cima do defensor e ele segue livre para o ataque!`,
          ]), team, playerName: p?.name || pName });
        } else {
          events.push({ minute: min, type: 'dribble_fail', description: `🛑 ${pName} tenta a jogada individual mas ${oppName} lê o movimento, encaixa o corpo e desarma com firmeza! Boa recuperação defensiva do ${opp}!`, team });
        }
        continue;
      }

      // Cross OK (3%)
      cumul += 0.03;
      if (r < cumul) {
        events.push({ minute: min, type: 'cross_ok', description: pick([
          `↗️ ${pName} chega na linha de fundo e cruza na medida para a área! A bola passa por dois defensores e encontra companheiro bem posicionado no segundo pau!`,
          `↗️ Cruzamento perfeito de ${pName} pela ${rng() > 0.5 ? 'direita' : 'esquerda'}! A bola entra açucarada na grande área, e ${pName2} se prepara para cabecear!`,
        ]), team, playerName: pName });
        continue;
      }

      // Corner (3%)
      cumul += 0.03;
      if (r < cumul) {
        stats.corners[teamIdx]++;
        events.push({ minute: min, type: 'corner', description: pick([
          `🚩 Escanteio para o ${tName}! ${pName} vai para a cobrança. A defesa do ${opp} se organiza na área enquanto os jogadores se posicionam para disputar a bola aérea.`,
          `🚩 A bola desvia na zaga do ${opp} e sai pela linha de fundo. Escanteio! ${tName} pode aproveitar a bola parada para criar perigo.`,
        ]), team });
        continue;
      }

      // Corner danger (1.5%)
      cumul += 0.015;
      if (r < cumul) {
        stats.corners[teamIdx]++;
        g.hasGoalOrChance = true;
        events.push({ minute: min, type: 'corner_danger', description: pick([
          `🚩⚠️ ESCANTEIO PERIGOSÍSSIMO! ${pName} cobra fechado na primeira trave, ${pName2} sobe de cabeça sozinho mas a bola passa raspando a trave direita! Por muito pouco não foi gol!`,
          `🚩⚠️ Na cobrança do escanteio, ${pName} coloca a bola com efeito na segunda trave! ${pName2} aparece livre de marcação e cabeceia! A bola tira tinta da trave e sai! Quase gol do ${tName}!`,
        ]), team, playerName: pName });
        continue;
      }

      // Strong shot (2.5%)
      cumul += 0.025 * offensiveMod;
      if (r < cumul) {
        stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
        const p = pickByAttr(allPlayers.filter(pp => pp.team === team), 'shooting');
        if (p) p.rating = Math.min(10, p.rating + 0.15);
        events.push({ minute: min, type: 'strong_shot', description: pick([
          `🎯 ${p?.name || pName} arma o chute de fora da área e solta uma pancada! O goleiro do ${opp} se estica todo e consegue espalmar para escanteio! Que chute e que defesa!`,
          `🎯 FINALIZAÇÃO FORTE! ${p?.name || pName} recebe na entrada da área, ajeita para a perna boa e dispara um foguete! O goleiro defende em dois tempos, segurando firme!`,
          `🎯 ${p?.name || pName} pega de primeira após tabela e chuta forte no canto! O goleiro do ${opp} faz grande defesa voando para o lado direito! O ${tName} pressiona!`,
        ]), team, playerName: p?.name || pName });
        continue;
      }

      // Weak shot (2%)
      cumul += 0.02;
      if (r < cumul) {
        stats.shots[teamIdx]++;
        events.push({ minute: min, type: 'weak_shot', description: pick([
          `👟 ${pName} finaliza de longe mas a bola vai fraca, sem direção, e o goleiro acompanha tranquilamente. Precisava de mais potência nessa hora.`,
          `👟 Tentativa tímida de ${pName}. O chute sai mascado e nem exige esforço do goleiro do ${opp}. Tiro de meta.`,
        ]), team, playerName: pName });
        continue;
      }

      // Long shot (2%)
      cumul += 0.02;
      if (r < cumul) {
        stats.shots[teamIdx]++;
        events.push({ minute: min, type: 'long_shot', description: pick([
          `💣 ${pName} resolve arriscar de muito longe! A bola viaja em direção ao gol, mas sai à esquerda da meta. Não assustou o goleiro, mas mostrou coragem!`,
          `💣 CHUTE DE FORA DA ÁREA! ${pName} solta a bomba de uns 30 metros! A bola passa perto da trave e a torcida solta aquele "uuuhhh"! Por pouco!`,
        ]), team, playerName: pName });
        continue;
      }

      // Great save (1.5%)
      cumul += 0.015;
      if (r < cumul) {
        stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
        stats.saves[teamIdx === 0 ? 1 : 0]++;
        g.hasGoalOrChance = true;
        events.push({ minute: min, type: 'great_save', description: pick([
          `🧤🔥 DEFESAÇA MONUMENTAL! ${pName} chuta no ângulo, parecia gol certo, mas o goleiro do ${opp} voa e tira com a ponta dos dedos! A torcida não acredita no que viu!`,
          `🧤🔥 QUE DEFESA! ${pName} aparece cara a cara com o goleiro e finaliza forte! O arqueiro se fecha, faz o corpo grande e fecha o ângulo! Defesa sensacional!`,
        ]), team, playerName: pName });
        continue;
      }

      // Woodwork (1%)
      cumul += 0.01;
      if (r < cumul) {
        stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
        g.hasGoalOrChance = true;
        events.push({ minute: min, type: 'woodwork', description: pick([
          `📐 BOLA NA TRAVE! ${pName} solta um chute perfeito que vai morrendo no ângulo — e explode no ferro! O goleiro nem se mexeu, estava batido! A bola volta para o campo e a defesa afasta!`,
          `📐 TRAVESSÃO! ${pName} cabeceia com força e a bola carimbou a parte de cima do gol! O goleiro agradece, estava vendido na jogada!`,
        ]), team, playerName: pName });
        continue;
      }

      // === GOALS ===
      // Foot goal (2.5%)
      cumul += 0.025 * offensiveMod;
      if (r < cumul) {
        g.hasGoalOrChance = true;
        const scorer = pickByAttr(allPlayers.filter(pp => pp.team === team), 'shooting', rng() > 0.6 ? 'ATA' : undefined);
        const gk = pickByAttr(allPlayers.filter(pp => pp.team === oppTeamKey), 'goalkeeping', 'GOL');
        const shooterSkill = scorer ? (scorer.shooting * 0.6 + scorer.composure * 0.2 + scorer.positioning * 0.2) : 60;
        const gkSkill = gk ? (gk.goalkeeping * 0.7 + gk.positioning * 0.3) : 55;
        const goalProb = clamp(shooterSkill / (shooterSkill + gkSkill) + 0.05, 0.25, 0.75);
        if (rng() < goalProb) {
          const goalTypes = ['chute rasteiro no canto', 'chute colocado', 'voleio espetacular', 'toque de primeira', 'chute cruzado', 'cobrança de pênalti', 'chute de trivela'];
          const goalType = pick(goalTypes);
          let assistName: string | undefined;
          if (scorer) {
            scorer.goals++; scorer.rating = Math.min(10, scorer.rating + 1.2);
            if (team === 'home') homeGoals++; else awayGoals++;
            const others = allPlayers.filter(p => p.team === team && p.id !== scorer.id && p.isOnPitch);
            if (others.length > 0 && rng() < 0.65) {
              const assister = pickByAttr(others, 'vision') || pick(others);
              assister.assists++; assister.rating = Math.min(10, assister.rating + 0.6);
              assistName = assister.name;
            }
          } else {
            if (team === 'home') homeGoals++; else awayGoals++;
          }
          stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
          const assistText = assistName ? ` Assistência perfeita de ${assistName}, que deixou tudo mastigado!` : ' Jogada individual brilhante, sem precisar de ajuda!';
          const celebrations = pick([
            'Ele corre para a torcida e desliza de joelhos comemorando!',
            'A equipe inteira pula em cima dele na comemoração!',
            'Ele aponta para o céu e a torcida explode de alegria!',
            'Comemoração emocionante! O jogador abraça o técnico na beira do campo!',
          ]);
          events.push({ minute: min, type: 'foot_goal', description: `⚽ GOOOOOOL DO ${tName.toUpperCase()}! ${scorer?.name || pName} recebe, ajusta o corpo e finaliza com um ${goalType}! A bola beija a rede e é gol! ${celebrations}${assistText} ${homeTeam} ${homeGoals} x ${awayGoals} ${awayTeam}!`, team, playerName: scorer?.name || pName, assistName, goalType, isGoal: true });
        } else {
          stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
          stats.saves[teamIdx === 0 ? 1 : 0]++;
          if (gk) gk.rating = Math.min(10, gk.rating + 0.3);
          events.push({ minute: min, type: 'great_save', description: `🧤🔥 QUASE GOL! ${scorer?.name || pName} fica cara a cara com o goleiro e chuta forte no canto! Mas o arqueiro do ${opp} adivinha o lado e faz uma defesa espetacular! Incrível!`, team, playerName: scorer?.name || pName });
        }
        continue;
      }

      // Header goal (0.8%)
      cumul += 0.008;
      if (r < cumul) {
        g.hasGoalOrChance = true;
        const scorer = pickByAttr(allPlayers.filter(pp => pp.team === team), 'heading');
        const gk = pickByAttr(allPlayers.filter(pp => pp.team === oppTeamKey), 'goalkeeping', 'GOL');
        const headingSkill = scorer ? (scorer.heading * 0.7 + scorer.physical * 0.3) : 55;
        const gkSkill = gk ? gk.goalkeeping : 55;
        const goalProb = clamp(headingSkill / (headingSkill + gkSkill) + 0.05, 0.3, 0.7);
        if (rng() < goalProb) {
          let assistName: string | undefined;
          if (scorer) {
            scorer.goals++; scorer.rating = Math.min(10, scorer.rating + 1.2);
            if (team === 'home') homeGoals++; else awayGoals++;
            const others = allPlayers.filter(p => p.team === team && p.id !== scorer.id && p.isOnPitch);
            if (others.length > 0 && rng() < 0.7) {
              const assister = pickByAttr(others, 'crossing') || pick(others);
              assister.assists++; assister.rating = Math.min(10, assister.rating + 0.6);
              assistName = assister.name;
            }
          } else {
            if (team === 'home') homeGoals++; else awayGoals++;
          }
          stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
          const assistText = assistName ? ` Cruzamento perfeito de ${assistName} na cabeça do goleador!` : '';
          events.push({ minute: min, type: 'header_goal', description: `⚽🤕 GOL DE CABEÇA SENSACIONAL! ${scorer?.name || pName} sobe mais alto que toda a defesa e cabeceia com força no canto! O goleiro não tem chance! É gol do ${tName}!${assistText} ${homeTeam} ${homeGoals} x ${awayGoals} ${awayTeam}!`, team, playerName: scorer?.name || pName, assistName, goalType: 'cabeceio', isGoal: true });
        } else {
          stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
          stats.saves[teamIdx === 0 ? 1 : 0]++;
          events.push({ minute: min, type: 'great_save', description: `🧤 ${pName} sobe para cabecear mas o goleiro do ${opp} sai no tempo certo e encaixa a bola no alto! Boa leitura do arqueiro!`, team, playerName: pName });
        }
        continue;
      }

      // Own goal (0.2%)
      cumul += 0.002;
      if (r < cumul) {
        const oppTeam: 'home' | 'away' = team === 'home' ? 'away' : 'home';
        if (oppTeam === 'home') homeGoals++; else awayGoals++;
        g.hasGoalOrChance = true;
        events.push({ minute: min, type: 'own_goal', description: `⚽🔴 GOL CONTRA! Que infelicidade! ${pName} do ${tName} tenta cortar o cruzamento mas desvia contra o próprio gol! A bola entra mansa e o goleiro não consegue alcançar! Gol contra que muda o placar! ${homeTeam} ${homeGoals} x ${awayGoals} ${awayTeam}!`, team: oppTeam, playerName: pName, goalType: 'gol contra', isGoal: true });
        continue;
      }

      // Fouls & cards
      cumul += 0.03 * pressingMod;
      if (r < cumul) {
        stats.fouls[teamIdx]++;
        events.push({ minute: min, type: 'midfield_foul', description: pick([
          `⚠️ Falta de ${pName}! Entrada atrasada no meio-campo sobre ${oppName}. O árbitro marca e pede atenção ao jogador. Bola parada para o ${opp} na intermediária.`,
          `⚠️ ${pName} não alcança a bola e derruba ${oppName} com o corpo. Falta marcada. O jogo fica um pouco mais truncado neste momento.`,
        ]), team, playerName: pName });
        continue;
      }

      cumul += 0.02;
      if (r < cumul) {
        stats.fouls[teamIdx]++; stats.yellowCards[teamIdx]++; g.hasCard = true;
        const p = pick(homePlrs);
        if (p && team === 'home') { p.yellowCards++; p.rating = Math.max(3, p.rating - 0.4); }
        events.push({ minute: min, type: 'yellow_card', description: pick([
          `🟨 CARTÃO AMARELO para ${pName}! Falta dura em ${oppName}, o árbitro vai direto ao bolso e mostra a advertência. O jogador reclama mas aceita a decisão. Precisa ter cuidado agora!`,
          `🟨 ${pName} faz falta tática em ${oppName} que saía em velocidade no contra-ataque! Cartão amarelo merecido! O árbitro não perdoa e o jogador fica pendurado!`,
        ]), team, playerName: pName });
        continue;
      }

      cumul += 0.002;
      if (r < cumul) {
        stats.redCards[teamIdx]++; stats.fouls[teamIdx]++; g.hasCard = true;
        events.push({ minute: min, type: 'red_card', description: `🟥 CARTÃO VERMELHO DIRETO! ${pName} entra de sola em ${oppName} e o árbitro não hesita! Expulsão direta! O ${tName} ficará com um a menos pelo resto da partida! Lance muito duro que poderia ter machucado gravemente o adversário!`, team, playerName: pName });
        continue;
      }

      // Tackles
      cumul += 0.03 * pressingMod;
      if (r < cumul) {
        stats.tackles[teamIdx]++;
        const p = pickByAttr(allPlayers.filter(pp => pp.team === team), 'defending');
        if (p) p.rating = Math.min(10, p.rating + 0.1);
        events.push({ minute: min, type: 'dribble_fail', description: pick([
          `💪 DESARME PERFEITO de ${p?.name || pName}! O defensor lê a jogada, antecipa o movimento do atacante e recupera a posse de bola com um carrinho limpo! Grande atuação defensiva!`,
          `💪 ${p?.name || pName} fecha o espaço e rouba a bola com um tackle impecável! A torcida aplaude a dedicação do jogador que não deixa nada passar!`,
        ]), team, playerName: p?.name || pName });
        continue;
      }

      // Medical (0.8%)
      cumul += 0.008;
      if (r < cumul) {
        events.push({ minute: min, type: 'medical', description: `🏥 O jogo é paralisado! ${pName} fica caído no gramado sentindo dores na coxa. A equipe médica entra correndo para avaliar a situação. Os companheiros pedem calma. Após o atendimento, o jogador se levanta e indica que pode continuar.`, team, playerName: pName });
        continue;
      }

      // Substitution (1.5%)
      cumul += 0.015;
      if (r < cumul) {
        g.hasSub = true;
        events.push({ minute: min, type: 'substitution', description: pick([
          `🔄 SUBSTITUIÇÃO no ${tName}! O técnico faz uma mudança tática. O jogador que entra aquece rapidamente na lateral e entra correndo, cheio de vontade de mostrar serviço!`,
          `🔄 Mexida no ${tName}! O treinador decide trocar peças para dar mais fôlego ao time. O jogador que sai recebe aplausos da torcida pelo esforço durante o jogo.`,
        ]), team, playerName: pName });
        continue;
      }

      // Offside (2%)
      cumul += 0.02;
      if (r < cumul) {
        stats.offsides[teamIdx]++;
        events.push({ minute: min, type: 'through_ball', description: `🏳️ IMPEDIMENTO! ${pName} tenta a corrida nas costas da defesa mas a bandeirinha levanta e sinaliza posição irregular. O atacante do ${tName} estava cerca de um metro adiantado. Lance anulado pelo auxiliar.`, team, playerName: pName });
        continue;
      }

      // Counterattack (2%)
      cumul += 0.02;
      if (r < cumul) {
        events.push({ minute: min, type: 'through_ball', description: pick([
          `🏃 CONTRA-ATAQUE VELOZ! ${pName} rouba a bola no campo de defesa e sai em disparada! O ${tName} tem três contra dois, a torcida se levanta! ${pName} conduz em alta velocidade buscando a opção de passe!`,
          `🏃 O ${tName} sai em velocidade máxima no contra-ataque! ${pName} puxa a transição carregando a bola pelo meio e tem ${pName2} livre pela ponta! Situação de perigo!`,
        ]), team });
        continue;
      }

      // One-two (2%)
      cumul += 0.02;
      if (r < cumul) {
        stats.passes[teamIdx]++;
        events.push({ minute: min, type: 'one_two', description: `🔄⚡ Tabela sensacional! ${pName} dá a parede com ${pName2} e recebe de volta em velocidade! Jogada ensaiada que desorganizou a defesa do ${opp}! O ${tName} avança com qualidade!`, team });
        continue;
      }

      // Dangerous foul (1.5%)
      cumul += 0.015;
      if (r < cumul) {
        stats.fouls[teamIdx]++;
        events.push({ minute: min, type: 'dangerous_foul', description: `⚠️🔥 FALTA PERIGOSA! ${pName} derruba ${oppName} na entrada da área! Falta em posição privilegiada para o ${opp}! A barreira se forma, momento de tensão no ${stadiumName}!`, team, playerName: pName });
        continue;
      }

      // Default: possession
      stats.passes[teamIdx]++;
      events.push({ minute: min, type: 'possession', description: `⚽ ${tName} trabalha a bola com paciência na intermediária, movimentando o jogo de um lado para o outro. ${pName} toca para ${pName2} que tenta achar um espaço na defesa adversária.`, team });
    }
  }

  // End of match
  const addedTime2 = Math.floor(1 + rng() * 5);
  events.push({ minute: 90, type: 'added_time', description: `⏱️ O quarto árbitro sinaliza: +${addedTime2} minutos de acréscimos no segundo tempo! O jogo entra na reta final!`, team: 'neutral' });
  events.push({ minute: 90 + addedTime2, type: 'final_whistle', description: `🏁 APITO FINAL! O árbitro encerra a partida! ${homeTeam} ${homeGoals} x ${awayGoals} ${awayTeam}! Fim de jogo no ${stadiumName}!`, team: 'neutral' });

  // Update possession
  const effectiveHome2 = homeStrength * homeAdv * moraleMod;
  const possRatio = effectiveHome2 / (effectiveHome2 + awayStrength);
  stats.possession = [Math.round(possRatio * 100), Math.round((1 - possRatio) * 100)];

  // Player ratings
  const playerRatings: Record<string, number> = {};
  allPlayers.filter(p => p.team === 'home').forEach(p => {
    playerRatings[p.id] = Math.round(p.rating * 10) / 10;
  });

  return { events, homeGoals, awayGoals, stats, playerRatings };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { homeTeam, awayTeam, homePlayers, homeStrength, awayStrength, matchId, tactics, stadiumName, stadiumCapacity, isHome, competition } = body;

    if (!homeTeam || !awayTeam || !matchId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check for existing active match
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: existing } = await adminClient
      .from('live_matches')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'live')
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Já existe uma partida em andamento', matchDbId: existing.id }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Run full simulation server-side
    const result = simulateFullMatch(
      homeTeam, awayTeam, homePlayers || [],
      homeStrength || 60, awayStrength || 60,
      tactics || {}, stadiumName || 'Estádio', isHome !== false
    );

    // Match duration: 12 minutes real-time (720 seconds) for 90 game minutes
    const durationSeconds = 720;
    const now = new Date();
    const finishedAt = new Date(now.getTime() + durationSeconds * 1000);

    // Store in DB
    const { data: match, error: insertError } = await adminClient
      .from('live_matches')
      .insert({
        user_id: userId,
        match_id: matchId,
        home_team: homeTeam,
        away_team: awayTeam,
        home_strength: homeStrength || 60,
        away_strength: awayStrength || 60,
        stadium_name: stadiumName || 'Estádio',
        stadium_capacity: stadiumCapacity || 5000,
        is_home: isHome !== false,
        competition: competition || 'Amistoso',
        status: 'live',
        started_at: now.toISOString(),
        duration_seconds: durationSeconds,
        home_goals: result.homeGoals,
        away_goals: result.awayGoals,
        current_minute: 0,
        events: result.events,
        stats: result.stats,
        player_ratings: result.playerRatings,
        home_players: (homePlayers || []).slice(0, 11).map((p: any) => ({ id: p.id, name: p.name, position: p.position, overall: p.overall })),
        tactics: tactics || {},
        finished_at: finishedAt.toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: 'Failed to create match', details: insertError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: true,
      matchDbId: match.id,
      startedAt: now.toISOString(),
      durationSeconds,
      finishedAt: finishedAt.toISOString(),
      totalEvents: result.events.length,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
