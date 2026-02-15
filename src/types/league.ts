export interface LeagueTeam {
  name: string;
  logo: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  played: number;
  strength?: number; // AI bot strength 1-100
}

const emptyStats = { points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, played: 0 };

export const leaguesByCountry: Record<string, LeagueTeam[]> = {
  BR: [
    { name: 'Flamengo SC', logo: '🔴', ...emptyStats, strength: 85 },
    { name: 'Palmeiras FC', logo: '🌴', ...emptyStats, strength: 83 },
    { name: 'Corinthians SP', logo: '🦅', ...emptyStats, strength: 78 },
    { name: 'São Paulo EC', logo: '🏟️', ...emptyStats, strength: 77 },
    { name: 'Santos FC', logo: '🐟', ...emptyStats, strength: 72 },
    { name: 'Grêmio RS', logo: '⚡', ...emptyStats, strength: 75 },
    { name: 'Internacional RS', logo: '🔴', ...emptyStats, strength: 74 },
    { name: 'Atlético MG', logo: '🐓', ...emptyStats, strength: 76 },
    { name: 'Cruzeiro MG', logo: '🌟', ...emptyStats, strength: 70 },
  ],
  AR: [
    { name: 'Boca Juniors', logo: '🟡', ...emptyStats, strength: 84 },
    { name: 'River Plate', logo: '🔴', ...emptyStats, strength: 83 },
    { name: 'Racing Club', logo: '🏁', ...emptyStats, strength: 74 },
    { name: 'Independiente', logo: '👑', ...emptyStats, strength: 73 },
    { name: 'San Lorenzo', logo: '🔵', ...emptyStats, strength: 71 },
    { name: 'Vélez Sarsfield', logo: '⚪', ...emptyStats, strength: 70 },
    { name: 'Estudiantes LP', logo: '📚', ...emptyStats, strength: 72 },
    { name: 'Newell\'s Old Boys', logo: '🔴', ...emptyStats, strength: 68 },
    { name: 'Rosario Central', logo: '🟡', ...emptyStats, strength: 67 },
  ],
  ES: [
    { name: 'Real Madrid CF', logo: '👑', ...emptyStats, strength: 92 },
    { name: 'FC Barcelona', logo: '🔵', ...emptyStats, strength: 90 },
    { name: 'Atlético Madrid', logo: '🔴', ...emptyStats, strength: 82 },
    { name: 'Sevilla FC', logo: '⚪', ...emptyStats, strength: 76 },
    { name: 'Real Betis', logo: '🟢', ...emptyStats, strength: 74 },
    { name: 'Real Sociedad', logo: '🔵', ...emptyStats, strength: 75 },
    { name: 'Valencia CF', logo: '🦇', ...emptyStats, strength: 73 },
    { name: 'Villarreal CF', logo: '🟡', ...emptyStats, strength: 74 },
    { name: 'Athletic Bilbao', logo: '🦁', ...emptyStats, strength: 72 },
  ],
  FR: [
    { name: 'Paris SG', logo: '🗼', ...emptyStats, strength: 90 },
    { name: 'Olympique Marseille', logo: '🔵', ...emptyStats, strength: 78 },
    { name: 'Olympique Lyon', logo: '🦁', ...emptyStats, strength: 76 },
    { name: 'AS Monaco', logo: '🔴', ...emptyStats, strength: 77 },
    { name: 'LOSC Lille', logo: '🐕', ...emptyStats, strength: 74 },
    { name: 'Stade Rennais', logo: '🔴', ...emptyStats, strength: 71 },
    { name: 'OGC Nice', logo: '🌴', ...emptyStats, strength: 72 },
    { name: 'RC Lens', logo: '🟡', ...emptyStats, strength: 73 },
    { name: 'FC Nantes', logo: '🟢', ...emptyStats, strength: 68 },
  ],
  IT: [
    { name: 'Juventus FC', logo: '⚫', ...emptyStats, strength: 84 },
    { name: 'AC Milan', logo: '🔴', ...emptyStats, strength: 82 },
    { name: 'Inter Milan', logo: '🔵', ...emptyStats, strength: 85 },
    { name: 'SSC Napoli', logo: '🔵', ...emptyStats, strength: 80 },
    { name: 'AS Roma', logo: '🐺', ...emptyStats, strength: 76 },
    { name: 'SS Lazio', logo: '🦅', ...emptyStats, strength: 74 },
    { name: 'Atalanta BC', logo: '🔵', ...emptyStats, strength: 78 },
    { name: 'ACF Fiorentina', logo: '🟣', ...emptyStats, strength: 73 },
    { name: 'Torino FC', logo: '🐂', ...emptyStats, strength: 68 },
  ],
  DE: [
    { name: 'Bayern München', logo: '🔴', ...emptyStats, strength: 90 },
    { name: 'Borussia Dortmund', logo: '🟡', ...emptyStats, strength: 82 },
    { name: 'RB Leipzig', logo: '🔴', ...emptyStats, strength: 78 },
    { name: 'Bayer Leverkusen', logo: '⚫', ...emptyStats, strength: 80 },
    { name: 'VfB Stuttgart', logo: '🔴', ...emptyStats, strength: 72 },
    { name: 'Eintracht Frankfurt', logo: '🦅', ...emptyStats, strength: 74 },
    { name: 'VfL Wolfsburg', logo: '🐺', ...emptyStats, strength: 71 },
    { name: 'SC Freiburg', logo: '🔴', ...emptyStats, strength: 70 },
    { name: 'Borussia M\'gladbach', logo: '🟢', ...emptyStats, strength: 69 },
  ],
  EN: [
    { name: 'Manchester City', logo: '🔵', ...emptyStats, strength: 92 },
    { name: 'Arsenal FC', logo: '🔴', ...emptyStats, strength: 88 },
    { name: 'Liverpool FC', logo: '🔴', ...emptyStats, strength: 87 },
    { name: 'Chelsea FC', logo: '🔵', ...emptyStats, strength: 80 },
    { name: 'Manchester United', logo: '🔴', ...emptyStats, strength: 78 },
    { name: 'Tottenham', logo: '⚪', ...emptyStats, strength: 76 },
    { name: 'Newcastle United', logo: '⚫', ...emptyStats, strength: 77 },
    { name: 'Aston Villa', logo: '🟣', ...emptyStats, strength: 74 },
    { name: 'West Ham United', logo: '🔨', ...emptyStats, strength: 72 },
  ],
  PT: [
    { name: 'SL Benfica', logo: '🦅', ...emptyStats, strength: 82 },
    { name: 'FC Porto', logo: '🐉', ...emptyStats, strength: 81 },
    { name: 'Sporting CP', logo: '🦁', ...emptyStats, strength: 80 },
    { name: 'SC Braga', logo: '🔴', ...emptyStats, strength: 72 },
    { name: 'Vitória SC', logo: '⚪', ...emptyStats, strength: 67 },
    { name: 'Rio Ave FC', logo: '🟢', ...emptyStats, strength: 64 },
    { name: 'Gil Vicente FC', logo: '🔴', ...emptyStats, strength: 62 },
    { name: 'Boavista FC', logo: '⚫', ...emptyStats, strength: 63 },
    { name: 'Marítimo FC', logo: '🟢', ...emptyStats, strength: 61 },
  ],
  NL: [
    { name: 'Ajax Amsterdam', logo: '🔴', ...emptyStats, strength: 80 },
    { name: 'PSV Eindhoven', logo: '🔴', ...emptyStats, strength: 79 },
    { name: 'Feyenoord', logo: '🔴', ...emptyStats, strength: 77 },
    { name: 'AZ Alkmaar', logo: '🔴', ...emptyStats, strength: 72 },
    { name: 'FC Twente', logo: '🔴', ...emptyStats, strength: 70 },
    { name: 'FC Utrecht', logo: '🔴', ...emptyStats, strength: 68 },
    { name: 'Vitesse', logo: '🟡', ...emptyStats, strength: 66 },
    { name: 'SC Heerenveen', logo: '🔵', ...emptyStats, strength: 64 },
    { name: 'FC Groningen', logo: '🟢', ...emptyStats, strength: 63 },
  ],
  MX: [
    { name: 'Club América', logo: '🦅', ...emptyStats, strength: 80 },
    { name: 'Chivas Guadalajara', logo: '🔴', ...emptyStats, strength: 78 },
    { name: 'Cruz Azul', logo: '🔵', ...emptyStats, strength: 76 },
    { name: 'UNAM Pumas', logo: '🐆', ...emptyStats, strength: 72 },
    { name: 'Tigres UANL', logo: '🐯', ...emptyStats, strength: 79 },
    { name: 'CF Monterrey', logo: '🔵', ...emptyStats, strength: 77 },
    { name: 'Santos Laguna', logo: '🟢', ...emptyStats, strength: 71 },
    { name: 'León FC', logo: '🟢', ...emptyStats, strength: 70 },
    { name: 'Toluca FC', logo: '🔴', ...emptyStats, strength: 69 },
  ],
  CO: [
    { name: 'Atlético Nacional', logo: '🟢', ...emptyStats, strength: 78 },
    { name: 'Millonarios FC', logo: '🔵', ...emptyStats, strength: 76 },
    { name: 'América de Cali', logo: '🔴', ...emptyStats, strength: 74 },
    { name: 'Deportivo Cali', logo: '🟢', ...emptyStats, strength: 72 },
    { name: 'Junior Barranquilla', logo: '🔴', ...emptyStats, strength: 73 },
    { name: 'Independiente Medellín', logo: '🔴', ...emptyStats, strength: 71 },
    { name: 'Santa Fe', logo: '🔴', ...emptyStats, strength: 70 },
    { name: 'Once Caldas', logo: '⚪', ...emptyStats, strength: 67 },
    { name: 'Deportes Tolima', logo: '🟡', ...emptyStats, strength: 68 },
  ],
  JP: [
    { name: 'Vissel Kobe', logo: '🔴', ...emptyStats, strength: 76 },
    { name: 'Yokohama F. Marinos', logo: '🔵', ...emptyStats, strength: 75 },
    { name: 'Kawasaki Frontale', logo: '🔵', ...emptyStats, strength: 74 },
    { name: 'Urawa Red Diamonds', logo: '🔴', ...emptyStats, strength: 73 },
    { name: 'Kashima Antlers', logo: '🦌', ...emptyStats, strength: 72 },
    { name: 'FC Tokyo', logo: '🔵', ...emptyStats, strength: 70 },
    { name: 'Gamba Osaka', logo: '🔵', ...emptyStats, strength: 69 },
    { name: 'Nagoya Grampus', logo: '🐬', ...emptyStats, strength: 68 },
    { name: 'Cerezo Osaka', logo: '🌸', ...emptyStats, strength: 67 },
  ],
};

export function getLeagueTeams(country: string, clubName: string): LeagueTeam[] {
  const teams = leaguesByCountry[country] || leaguesByCountry['BR'];
  const playerTeam: LeagueTeam = { name: clubName, logo: '⚽', ...emptyStats, strength: 60 };
  return [playerTeam, ...teams];
}

// Keep backward compatibility
export const initialLeagueTeams = leaguesByCountry['BR'].map(t => ({ ...t }));
initialLeagueTeams.unshift({ name: 'FLM 26', logo: '⚽', ...emptyStats });
