export interface MatchEvent {
  minute: number;
  type: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'substitution' | 'save' | 'chance';
  playerName: string;
  team: 'home' | 'away';
  description: string;
}

export interface MatchReport {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  passes: { home: number; away: number };
  fouls: { home: number; away: number };
  corners: { home: number; away: number };
  yellowCards: { home: number; away: number };
  redCards: { home: number; away: number };
  events: MatchEvent[];
  manOfTheMatch?: string;
  playerRatings: Record<string, number>; // playerId -> rating 1-10
  goalScorers: { name: string; minute: number; team: 'home' | 'away' }[];
  autoSimulated?: boolean;
}

export interface InterviewChoice {
  id: string;
  text: string;
  effect: {
    morale: number;
    reputation: number;
    fanChange: number;
  };
  tone: 'humble' | 'confident' | 'aggressive' | 'diplomatic';
}

export interface InterviewScenario {
  question: string;
  context: 'win' | 'draw' | 'loss' | 'rout_win' | 'rout_loss';
  choices: InterviewChoice[];
}

export function generateMatchReport(
  homeTeam: string,
  awayTeam: string,
  homeGoals: number,
  awayGoals: number,
  homePlayers: { id: string; name: string; position: string; overall: number }[],
  teamStrength: number,
  opponentStrength: number
): MatchReport {
  const totalGoals = homeGoals + awayGoals;
  const strengthRatio = teamStrength / (teamStrength + opponentStrength);

  const homePoss = Math.floor(strengthRatio * 100 * (0.8 + Math.random() * 0.4));
  const possession = { home: Math.min(75, Math.max(25, homePoss)), away: 0 };
  possession.away = 100 - possession.home;

  const homeShots = Math.floor(homeGoals * 2.5 + Math.random() * 8 + 3);
  const awayShots = Math.floor(awayGoals * 2.5 + Math.random() * 6 + 2);
  const shots = { home: homeShots, away: awayShots };
  const shotsOnTarget = { home: Math.max(homeGoals, Math.floor(homeShots * 0.45)), away: Math.max(awayGoals, Math.floor(awayShots * 0.4)) };

  const homePasses = Math.floor(possession.home * 4.5 + Math.random() * 50);
  const awayPasses = Math.floor(possession.away * 4.5 + Math.random() * 50);

  const homeFouls = Math.floor(Math.random() * 12 + 5);
  const awayFouls = Math.floor(Math.random() * 14 + 6);
  const homeCorners = Math.floor(Math.random() * 6 + homeGoals);
  const awayCorners = Math.floor(Math.random() * 5 + awayGoals);

  const homeYellows = Math.floor(Math.random() * 3);
  const awayYellows = Math.floor(Math.random() * 4);
  const homeReds = Math.random() < 0.05 ? 1 : 0;
  const awayReds = Math.random() < 0.08 ? 1 : 0;

  // Generate events
  const events: MatchEvent[] = [];
  const goalScorers: MatchReport['goalScorers'] = [];

  // Home goals
  const attackers = homePlayers.filter(p => ['ATA', 'MEI', 'VOL'].includes(p.position));
  const allOutfield = homePlayers.filter(p => p.position !== 'GOL');
  for (let i = 0; i < homeGoals; i++) {
    const minute = Math.floor(Math.random() * 90 + 1);
    const scorer = attackers.length > 0
      ? attackers[Math.floor(Math.random() * attackers.length)]
      : allOutfield[Math.floor(Math.random() * allOutfield.length)];
    if (scorer) {
      events.push({ minute, type: 'goal', playerName: scorer.name, team: 'home', description: `⚽ GOL! ${scorer.name} marca!` });
      goalScorers.push({ name: scorer.name, minute, team: 'home' });

      // Assist
      if (Math.random() < 0.7) {
        const assister = allOutfield.filter(p => p.id !== scorer.id)[Math.floor(Math.random() * (allOutfield.length - 1))];
        if (assister) {
          events.push({ minute, type: 'assist', playerName: assister.name, team: 'home', description: `🅰️ Assistência de ${assister.name}` });
        }
      }
    }
  }

  // Away goals
  for (let i = 0; i < awayGoals; i++) {
    const minute = Math.floor(Math.random() * 90 + 1);
    events.push({ minute, type: 'goal', playerName: 'Jogador adversário', team: 'away', description: `⚽ GOL do ${awayTeam}!` });
    goalScorers.push({ name: awayTeam, minute, team: 'away' });
  }

  // Yellow/red cards
  for (let i = 0; i < homeYellows; i++) {
    const p = allOutfield[Math.floor(Math.random() * allOutfield.length)];
    if (p) events.push({ minute: Math.floor(Math.random() * 90 + 1), type: 'yellow_card', playerName: p.name, team: 'home', description: `Cartão amarelo: ${p.name}` });
  }
  for (let i = 0; i < awayYellows; i++) {
    events.push({ minute: Math.floor(Math.random() * 90 + 1), type: 'yellow_card', playerName: 'Adversário', team: 'away', description: `Cartão amarelo` });
  }

  events.sort((a, b) => a.minute - b.minute);

  // Player ratings
  const playerRatings: Record<string, number> = {};
  const isWin = homeGoals > awayGoals;
  const isDraw = homeGoals === awayGoals;
  for (const p of homePlayers) {
    const base = isWin ? 7 : isDraw ? 6.5 : 5.5;
    const scorerBonus = goalScorers.some(g => g.name === p.name && g.team === 'home') ? 1.5 : 0;
    const assistBonus = events.some(e => e.playerName === p.name && e.type === 'assist') ? 0.8 : 0;
    const rating = Math.min(10, Math.max(3, base + (Math.random() * 2 - 1) + scorerBonus + assistBonus));
    playerRatings[p.id] = Math.round(rating * 10) / 10;
  }

  // Man of the match
  const bestPlayer = Object.entries(playerRatings).sort(([, a], [, b]) => b - a)[0];
  const manOfTheMatch = bestPlayer ? homePlayers.find(p => p.id === bestPlayer[0])?.name : undefined;

  return {
    matchId: '',
    homeTeam,
    awayTeam,
    homeGoals,
    awayGoals,
    possession,
    shots,
    shotsOnTarget,
    passes: { home: homePasses, away: awayPasses },
    fouls: { home: homeFouls, away: awayFouls },
    corners: { home: homeCorners, away: awayCorners },
    yellowCards: { home: homeYellows, away: awayYellows },
    redCards: { home: homeReds, away: awayReds },
    events,
    manOfTheMatch,
    playerRatings,
    goalScorers,
  };
}

export function generateInterviewScenario(homeGoals: number, awayGoals: number): InterviewScenario {
  const diff = homeGoals - awayGoals;
  let context: InterviewScenario['context'];
  if (diff >= 3) context = 'rout_win';
  else if (diff > 0) context = 'win';
  else if (diff === 0) context = 'draw';
  else if (diff <= -3) context = 'rout_loss';
  else context = 'loss';

  const scenarios: Record<string, InterviewScenario[]> = {
    win: [
      {
        question: 'Parabéns pela vitória! Como avalia a partida?',
        context: 'win',
        choices: [
          { id: '1', text: 'Trabalhamos duro e merecemos. Crédito ao elenco.', effect: { morale: 5, reputation: 1, fanChange: 200 }, tone: 'humble' },
          { id: '2', text: 'Somos o melhor time da liga, era esperado.', effect: { morale: 3, reputation: 2, fanChange: 100 }, tone: 'confident' },
          { id: '3', text: 'Vencemos mas precisamos melhorar muito ainda.', effect: { morale: -2, reputation: 0, fanChange: 50 }, tone: 'diplomatic' },
          { id: '4', text: 'Adversário fraco, qualquer um ganharia.', effect: { morale: -3, reputation: -1, fanChange: -100 }, tone: 'aggressive' },
        ],
      },
    ],
    rout_win: [
      {
        question: 'Goleada! O que dizer sobre esse resultado impressionante?',
        context: 'rout_win',
        choices: [
          { id: '1', text: 'Dia especial! Os jogadores estão de parabéns.', effect: { morale: 8, reputation: 3, fanChange: 500 }, tone: 'humble' },
          { id: '2', text: 'Esse é o nível que exijo. Nada menos.', effect: { morale: 5, reputation: 2, fanChange: 300 }, tone: 'confident' },
          { id: '3', text: 'Não podemos relaxar. Próximo jogo já é foco.', effect: { morale: 2, reputation: 1, fanChange: 200 }, tone: 'diplomatic' },
          { id: '4', text: 'Avisem os próximos adversários: estamos com fome!', effect: { morale: 6, reputation: 2, fanChange: 400 }, tone: 'aggressive' },
        ],
      },
    ],
    draw: [
      {
        question: 'Empate hoje. Satisfeito com o resultado?',
        context: 'draw',
        choices: [
          { id: '1', text: 'Merecíamos mais, mas seguimos fortes.', effect: { morale: 1, reputation: 0, fanChange: 0 }, tone: 'humble' },
          { id: '2', text: 'Inaceitável. Temos que vencer sempre.', effect: { morale: -3, reputation: 0, fanChange: -50 }, tone: 'aggressive' },
          { id: '3', text: 'Um ponto fora é bom resultado. Próximo jogo venceremos.', effect: { morale: 3, reputation: 0, fanChange: 50 }, tone: 'diplomatic' },
          { id: '4', text: 'O time jogou bem, faltou sorte nos momentos decisivos.', effect: { morale: 2, reputation: 0, fanChange: 30 }, tone: 'confident' },
        ],
      },
    ],
    loss: [
      {
        question: 'Derrota difícil. O que aconteceu?',
        context: 'loss',
        choices: [
          { id: '1', text: 'Falhamos. A responsabilidade é minha, vou corrigir.', effect: { morale: 2, reputation: 1, fanChange: 50 }, tone: 'humble' },
          { id: '2', text: 'O time não correspondeu. Vou cobrar fortemente.', effect: { morale: -5, reputation: 0, fanChange: -100 }, tone: 'aggressive' },
          { id: '3', text: 'Dia ruim, mas confio no grupo. Vamos reagir.', effect: { morale: 3, reputation: 0, fanChange: 0 }, tone: 'diplomatic' },
          { id: '4', text: 'Precisamos de reforços. O elenco é curto.', effect: { morale: -4, reputation: -1, fanChange: -50 }, tone: 'confident' },
        ],
      },
    ],
    rout_loss: [
      {
        question: 'Goleada sofrida. Quais palavras para a torcida?',
        context: 'rout_loss',
        choices: [
          { id: '1', text: 'Peço desculpas à torcida. Isso não pode se repetir.', effect: { morale: 0, reputation: 0, fanChange: -100 }, tone: 'humble' },
          { id: '2', text: 'Vergonha! Quem não quer vestir a camisa pode sair!', effect: { morale: -8, reputation: -1, fanChange: -200 }, tone: 'aggressive' },
          { id: '3', text: 'Momento difícil. Precisamos de calma e trabalho.', effect: { morale: 2, reputation: 0, fanChange: -50 }, tone: 'diplomatic' },
          { id: '4', text: 'Vamos aprender com isso e voltar mais fortes.', effect: { morale: 3, reputation: 1, fanChange: 0 }, tone: 'confident' },
        ],
      },
    ],
  };

  const options = scenarios[context] || scenarios.draw;
  return options[Math.floor(Math.random() * options.length)];
}
