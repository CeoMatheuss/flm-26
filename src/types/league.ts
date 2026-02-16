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
  strength?: number;
}

const emptyStats = { points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, played: 0 };

// Helper to generate teams quickly
function t(name: string, logo: string, strength: number): LeagueTeam {
  return { name, logo, ...emptyStats, strength };
}

export const countryNames: Record<string, string> = {
  // South America
  BR: 'Brasil', AR: 'Argentina', UY: 'Uruguai', PY: 'Paraguai', CL: 'Chile',
  CO: 'Colômbia', PE: 'Peru', EC: 'Equador', BO: 'Bolívia', VE: 'Venezuela',
  // Europe
  EN: 'Inglaterra', ES: 'Espanha', DE: 'Alemanha', IT: 'Itália', FR: 'França',
  PT: 'Portugal', NL: 'Holanda', BE: 'Bélgica', TR: 'Turquia', SC: 'Escócia',
  // North/Central America
  US: 'Estados Unidos', MX: 'México', CA: 'Canadá', CR: 'Costa Rica',
  HN: 'Honduras', PA: 'Panamá',
  // Africa
  EG: 'Egito', MA: 'Marrocos', TN: 'Tunísia', NG: 'Nigéria',
  SN: 'Senegal', ZA: 'África do Sul', GH: 'Gana', CM: 'Camarões',
  // Asia / Oceania
  JP: 'Japão', KR: 'Coreia do Sul', CN: 'China', SA: 'Arábia Saudita',
  QA: 'Catar', IR: 'Irã', AU: 'Austrália', AE: 'Emirados Árabes',
};

export const countryFlags: Record<string, string> = {
  BR: '🇧🇷', AR: '🇦🇷', UY: '🇺🇾', PY: '🇵🇾', CL: '🇨🇱',
  CO: '🇨🇴', PE: '🇵🇪', EC: '🇪🇨', BO: '🇧🇴', VE: '🇻🇪',
  EN: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', ES: '🇪🇸', DE: '🇩🇪', IT: '🇮🇹', FR: '🇫🇷',
  PT: '🇵🇹', NL: '🇳🇱', BE: '🇧🇪', TR: '🇹🇷', SC: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  US: '🇺🇸', MX: '🇲🇽', CA: '🇨🇦', CR: '🇨🇷', HN: '🇭🇳', PA: '🇵🇦',
  EG: '🇪🇬', MA: '🇲🇦', TN: '🇹🇳', NG: '🇳🇬', SN: '🇸🇳', ZA: '🇿🇦', GH: '🇬🇭', CM: '🇨🇲',
  JP: '🇯🇵', KR: '🇰🇷', CN: '🇨🇳', SA: '🇸🇦', QA: '🇶🇦', IR: '🇮🇷', AU: '🇦🇺', AE: '🇦🇪',
};

export const countryLeagueNames: Record<string, string> = {
  BR: 'Brasileirão', AR: 'Liga Profesional', UY: 'Primera División', PY: 'División de Honor',
  CL: 'Primera División', CO: 'Liga BetPlay', PE: 'Liga 1', EC: 'LigaPro',
  BO: 'División Profesional', VE: 'Liga FUTVE',
  EN: 'Premier League', ES: 'La Liga', DE: 'Bundesliga', IT: 'Serie A', FR: 'Ligue 1',
  PT: 'Liga Portugal', NL: 'Eredivisie', BE: 'Pro League', TR: 'Süper Lig', SC: 'Premiership',
  US: 'MLS', MX: 'Liga MX', CA: 'Canadian Premier', CR: 'Primera División',
  HN: 'Liga Nacional', PA: 'Liga Panameña',
  EG: 'Egyptian Premier', MA: 'Botola Pro', TN: 'Ligue 1', NG: 'NPFL',
  SN: 'Ligue 1', ZA: 'PSL', GH: 'GPL', CM: 'Elite One',
  JP: 'J1 League', KR: 'K League 1', CN: 'Chinese Super League', SA: 'Saudi Pro League',
  QA: 'Qatar Stars League', IR: 'Persian Gulf Pro', AU: 'A-League', AE: 'UAE Pro League',
};

// Continent mapping for continental competitions
export const countryContinents: Record<string, string> = {
  BR: 'south_america', AR: 'south_america', UY: 'south_america', PY: 'south_america',
  CL: 'south_america', CO: 'south_america', PE: 'south_america', EC: 'south_america',
  BO: 'south_america', VE: 'south_america',
  EN: 'europe', ES: 'europe', DE: 'europe', IT: 'europe', FR: 'europe',
  PT: 'europe', NL: 'europe', BE: 'europe', TR: 'europe', SC: 'europe',
  US: 'north_america', MX: 'north_america', CA: 'north_america', CR: 'north_america',
  HN: 'north_america', PA: 'north_america',
  EG: 'africa', MA: 'africa', TN: 'africa', NG: 'africa',
  SN: 'africa', ZA: 'africa', GH: 'africa', CM: 'africa',
  JP: 'asia', KR: 'asia', CN: 'asia', SA: 'asia',
  QA: 'asia', IR: 'asia', AU: 'asia', AE: 'asia',
};

export const leaguesByCountry: Record<string, LeagueTeam[]> = {
  // ===== SOUTH AMERICA =====
  BR: [
    t('Flamengo SC', '🔴', 86), t('Palmeiras FC', '🌴', 84), t('Atlético MG', '🐓', 80),
    t('Corinthians SP', '🦅', 78), t('São Paulo EC', '🏟️', 77), t('Internacional RS', '🔴', 76),
    t('Grêmio RS', '⚡', 75), t('Botafogo RJ', '⭐', 74), t('Fluminense RJ', '🟢', 73),
    t('Santos FC', '🐟', 72), t('Cruzeiro MG', '🌟', 71), t('Fortaleza EC', '🦁', 70),
    t('Bahia EC', '🔵', 69), t('Vasco da Gama', '⚓', 68), t('Athletico PR', '🔴', 67),
    t('Bragantino SP', '🐂', 66), t('Cuiabá EC', '🟡', 62), t('Goiás EC', '🟢', 61),
    t('Coritiba FC', '🟢', 60),
  ],
  AR: [
    t('Boca Juniors', '🟡', 84), t('River Plate', '🔴', 83), t('Racing Club', '🏁', 76),
    t('Independiente', '👑', 74), t('Estudiantes LP', '📚', 73), t('San Lorenzo', '🔵', 72),
    t('Vélez Sarsfield', '⚪', 71), t('Talleres Córdoba', '🔵', 71), t('Defensa y Justicia', '🟢', 70),
    t('Lanús', '🔴', 69), t("Newell's Old Boys", '🔴', 69), t('Rosario Central', '🟡', 68),
    t('Argentinos Juniors', '🔴', 67), t('Huracán', '⚪', 66), t('Godoy Cruz', '⚪', 66),
    t('Banfield', '🟢', 65), t('Colón Santa Fe', '🔴', 64), t('Unión Santa Fe', '🔴', 63),
    t('Central Córdoba', '⚫', 61),
  ],
  UY: [
    t('Peñarol', '🟡', 78), t('Nacional', '🔵', 77), t('Liverpool FC UY', '🔵', 69),
    t('Defensor Sporting', '🟣', 67), t('Danubio FC', '⚪', 65), t('Wanderers', '⚫', 64),
    t('Cerro Largo', '🟡', 63), t('Rentistas', '🔴', 62), t('Plaza Colonia', '🟢', 61),
    t('River Plate UY', '🔴', 60), t('Boston River', '🔵', 59), t('Fénix', '🟣', 58),
    t('Cerrito', '🔵', 57), t('Progreso', '🔴', 56), t('Sud América', '🔴', 55),
  ],
  PY: [
    t('Olimpia', '⚪', 76), t('Cerro Porteño', '🔴', 75), t('Libertad', '⚪', 72),
    t('Guaraní', '🟡', 68), t('Nacional PY', '🔵', 66), t('Sol de América', '🔵', 64),
    t('Sportivo Luqueño', '🔵', 63), t('General Caballero', '🔴', 61), t('12 de Octubre', '🔴', 60),
    t('Resistencia', '🟢', 59), t('Tacuary', '🔵', 58), t('Ameliano', '🔴', 57),
  ],
  CL: [
    t('Colo-Colo', '⚪', 78), t('Universidad de Chile', '🔵', 76), t('Universidad Católica', '🔵', 74),
    t('Cobreloa', '🟠', 68), t('Huachipato', '🔵', 66), t('Unión Española', '🔴', 65),
    t('Audax Italiano', '🟢', 64), t('O\'Higgins', '🔵', 63), t('Everton Viña', '🔵', 62),
    t('Palestino', '🟢', 61), t('Cobresal', '🟡', 60), t('Ñublense', '🔴', 59),
    t('Curicó Unido', '🟡', 58), t('La Serena', '🔴', 57), t('Deportes Iquique', '🔵', 56),
  ],
  CO: [
    t('Atlético Nacional', '🟢', 79), t('Millonarios FC', '🔵', 77), t('América de Cali', '🔴', 75),
    t('Junior Barranquilla', '🔴', 74), t('Deportivo Cali', '🟢', 73), t('Independiente Medellín', '🔴', 72),
    t('Santa Fe', '🔴', 71), t('Deportes Tolima', '🟡', 70), t('Once Caldas', '⚪', 68),
    t('Bucaramanga', '🟡', 67), t('La Equidad', '🟢', 66), t('Envigado FC', '🟠', 65),
    t('Águilas Doradas', '🦅', 64), t('Pereira FC', '🔴', 64), t('Pasto', '🔴', 63),
    t('Alianza Petrolera', '🟡', 62), t('Patriotas FC', '🔴', 61), t('Jaguares Córdoba', '🐆', 60),
    t('Boyacá Chicó', '🟢', 59),
  ],
  PE: [
    t('Alianza Lima', '🔵', 74), t('Universitario', '🔴', 73), t('Sporting Cristal', '🔵', 72),
    t('Melgar', '🔴', 68), t('Cienciano', '🔴', 65), t('Sport Huancayo', '🔴', 64),
    t('César Vallejo', '🔵', 63), t('ADT', '🟢', 62), t('Municipal', '🔴', 61),
    t('Sport Boys', '🔴', 60), t('Carlos Mannucci', '🔵', 59), t('UTC', '🟡', 58),
  ],
  EC: [
    t('Barcelona SC', '🟡', 75), t('Liga de Quito', '⚪', 74), t('Independiente del Valle', '⚫', 73),
    t('Emelec', '🔵', 71), t('Deportivo Cuenca', '🔴', 66), t('Aucas', '🟡', 65),
    t('El Nacional', '🔴', 64), t('Delfín SC', '🔵', 63), t('Mushuc Runa', '🟢', 62),
    t('Orense SC', '🟡', 61), t('Macará', '🔵', 60), t('Técnico Universitario', '🔴', 59),
  ],
  BO: [
    t('Bolívar', '🔵', 72), t('The Strongest', '🟡', 71), t('Jorge Wilstermann', '🔴', 68),
    t('Oriente Petrolero', '🟢', 65), t('Blooming', '🔵', 63), t('Always Ready', '🔴', 64),
    t('Royal Pari', '🔵', 61), t('Nacional Potosí', '🔴', 60), t('Guabirá', '🔴', 59),
    t('Aurora', '🔵', 58), t('Real Tomayapo', '🔴', 57), t('Independiente Petrolero', '🟢', 56),
  ],
  VE: [
    t('Caracas FC', '🔴', 72), t('Deportivo Táchira', '🟡', 71), t('Zamora FC', '⚪', 68),
    t('Monagas SC', '🔵', 65), t('Deportivo La Guaira', '🔴', 64), t('Carabobo FC', '🟢', 63),
    t('Estudiantes Mérida', '🔴', 62), t('Academia Puerto Cabello', '🔵', 61),
    t('Metropolitanos', '🟣', 60), t('Mineros Guayana', '⚫', 59), t('Portuguesa FC', '🔴', 58),
    t('Aragua FC', '🟡', 57),
  ],

  // ===== EUROPE =====
  EN: [
    t('Manchester City', '🔵', 92), t('Arsenal FC', '🔴', 89), t('Liverpool FC', '🔴', 88),
    t('Chelsea FC', '🔵', 81), t('Manchester United', '🔴', 79), t('Newcastle United', '⚫', 78),
    t('Tottenham', '⚪', 77), t('Aston Villa', '🟣', 76), t('Brighton', '🔵', 74),
    t('West Ham United', '🔨', 73), t('Wolverhampton', '🟠', 70), t('Crystal Palace', '🦅', 69),
    t('Brentford FC', '🐝', 69), t('Fulham FC', '⚪', 68), t('Bournemouth', '🍒', 67),
    t('Nottingham Forest', '🌳', 67), t('Everton FC', '🔵', 66), t('Burnley FC', '🔴', 62),
    t('Sheffield United', '🔴', 61),
  ],
  ES: [
    t('Real Madrid CF', '👑', 93), t('FC Barcelona', '🔵', 91), t('Atlético Madrid', '🔴', 83),
    t('Sevilla FC', '⚪', 77), t('Real Sociedad', '🔵', 76), t('Real Betis', '🟢', 75),
    t('Villarreal CF', '🟡', 75), t('Athletic Bilbao', '🦁', 74), t('Valencia CF', '🦇', 73),
    t('Girona FC', '🔴', 72), t('Celta de Vigo', '🔵', 69), t('Osasuna', '🔴', 68),
    t('Getafe CF', '🔵', 67), t('Rayo Vallecano', '⚡', 66), t('Mallorca', '🔴', 65),
    t('Espanyol', '🔵', 64), t('Las Palmas', '🟡', 63), t('Alavés', '🔵', 62),
    t('Cádiz CF', '🟡', 61),
  ],
  DE: [
    t('Bayern München', '🔴', 91), t('Borussia Dortmund', '🟡', 83), t('Bayer Leverkusen', '⚫', 82),
    t('RB Leipzig', '🔴', 79), t('Eintracht Frankfurt', '🦅', 75), t('VfB Stuttgart', '🔴', 74),
    t('VfL Wolfsburg', '🐺', 72), t('SC Freiburg', '🔴', 71), t("Borussia M'gladbach", '🟢', 70),
    t('Union Berlin', '🔴', 69), t('Hoffenheim', '🔵', 68), t('Werder Bremen', '🟢', 67),
    t('Mainz 05', '🔴', 66), t('FC Köln', '⚪', 65), t('FC Augsburg', '🔴', 64),
    t('Bochum', '🔵', 62), t('Heidenheim', '🔴', 61), t('Darmstadt 98', '🔵', 60),
    t('Holstein Kiel', '🔵', 59),
  ],
  IT: [
    t('Inter Milan', '🔵', 86), t('Juventus FC', '⚫', 84), t('AC Milan', '🔴', 83),
    t('SSC Napoli', '🔵', 81), t('Atalanta BC', '🔵', 79), t('AS Roma', '🐺', 77),
    t('SS Lazio', '🦅', 75), t('ACF Fiorentina', '🟣', 74), t('Bologna FC', '🔴', 72),
    t('Torino FC', '🐂', 69), t('Udinese', '⚫', 67), t('Sassuolo', '🟢', 66),
    t('Monza', '🔴', 65), t('Genoa CFC', '🔴', 64), t('Empoli FC', '🔵', 64),
    t('Cagliari', '🔴', 63), t('Lecce', '🟡', 62), t('Hellas Verona', '🟡', 61),
    t('Frosinone', '🟡', 60),
  ],
  FR: [
    t('Paris SG', '🗼', 91), t('AS Monaco', '🔴', 78), t('Olympique Marseille', '🔵', 79),
    t('Olympique Lyon', '🦁', 77), t('LOSC Lille', '🐕', 75), t('RC Lens', '🟡', 74),
    t('OGC Nice', '🌴', 73), t('Stade Rennais', '🔴', 72), t('Stade Brestois', '🔴', 69),
    t('FC Nantes', '🟢', 68), t('Toulouse FC', '🟣', 67), t('RC Strasbourg', '🔵', 67),
    t('Montpellier HSC', '🔵', 66), t('Reims', '🔴', 65), t('Le Havre AC', '🔵', 63),
    t('FC Lorient', '🟠', 62), t('FC Metz', '🔴', 61), t('Clermont Foot', '🔴', 60),
    t('AJ Auxerre', '🔵', 60),
  ],
  PT: [
    t('SL Benfica', '🦅', 83), t('FC Porto', '🐉', 82), t('Sporting CP', '🦁', 81),
    t('SC Braga', '🔴', 73), t('Vitória SC', '⚪', 68), t('Famalicão', '🔵', 66),
    t('Rio Ave FC', '🟢', 65), t('Boavista FC', '⚫', 64), t('Casa Pia AC', '🟢', 64),
    t('Gil Vicente FC', '🔴', 63), t('Moreirense FC', '🟢', 63), t('Marítimo FC', '🟢', 62),
    t('Estoril Praia', '🟡', 62), t('Arouca FC', '🟡', 61), t('Estrela Amadora', '⭐', 60),
    t('Portimonense', '⚫', 60), t('Vizela FC', '🔵', 59), t('Chaves', '🔴', 58),
    t('Farense', '⚪', 57),
  ],
  NL: [
    t('Ajax Amsterdam', '🔴', 81), t('PSV Eindhoven', '🔴', 80), t('Feyenoord', '🔴', 78),
    t('AZ Alkmaar', '🔴', 73), t('FC Twente', '🔴', 71), t('FC Utrecht', '🔴', 69),
    t('Sparta Rotterdam', '🔴', 66), t('Vitesse', '🟡', 67), t('NEC Nijmegen', '🔴', 65),
    t('SC Heerenveen', '🔵', 65), t('FC Groningen', '🟢', 64), t('Go Ahead Eagles', '🦅', 63),
    t('Fortuna Sittard', '🟡', 62), t('Heracles Almelo', '⚫', 62), t('PEC Zwolle', '🔵', 61),
    t('RKC Waalwijk', '🟡', 60), t('Excelsior', '🔴', 59), t('Cambuur Leeuwarden', '🔵', 58),
    t('Volendam', '🟠', 57),
  ],
  BE: [
    t('Club Brugge', '🔵', 79), t('RSC Anderlecht', '🟣', 76), t('Union SG', '🟡', 73),
    t('KRC Genk', '🔵', 74), t('Royal Antwerp', '🔴', 72), t('AA Gent', '🔵', 71),
    t('Standard Liège', '🔴', 69), t('Cercle Brugge', '🟢', 65), t('KV Mechelen', '🟡', 64),
    t('OH Leuven', '🟢', 63), t('Charleroi', '⚫', 64), t('Westerlo', '🟡', 62),
    t('STVV', '🟡', 61), t('KV Kortrijk', '🔴', 60), t('Eupen', '⚫', 59),
  ],
  TR: [
    t('Galatasaray', '🟡', 81), t('Fenerbahçe', '🟡', 80), t('Beşiktaş', '⚫', 77),
    t('Trabzonspor', '🔴', 74), t('Başakşehir', '🟠', 70), t('Adana Demirspor', '🔵', 68),
    t('Sivasspor', '🔴', 66), t('Konyaspor', '🟢', 65), t('Antalyaspor', '🔴', 64),
    t('Kasımpaşa', '🔵', 63), t('Alanyaspor', '🟠', 63), t('Kayserispor', '🟡', 62),
    t('Gaziantep FK', '🔴', 61), t('Hatayspor', '🔴', 60), t('Pendikspor', '🔵', 59),
  ],
  SC: [
    t('Celtic FC', '🟢', 77), t('Rangers FC', '🔵', 76), t('Aberdeen FC', '🔴', 67),
    t('Hibernian', '🟢', 65), t('Hearts', '🔴', 66), t('Dundee United', '🟠', 63),
    t('St Mirren', '⚫', 62), t('Motherwell', '🟠', 61), t('Livingston', '🟡', 60),
    t('Kilmarnock', '🔵', 60), t('Ross County', '🔵', 58), t('St Johnstone', '🔵', 57),
  ],

  // ===== NORTH/CENTRAL AMERICA =====
  US: [
    t('Inter Miami', '🌴', 76), t('LAFC', '⚫', 75), t('Atlanta United', '🔴', 72),
    t('Seattle Sounders', '🟢', 71), t('LA Galaxy', '🟡', 70), t('New York City FC', '🔵', 69),
    t('Philadelphia Union', '🔵', 68), t('Nashville SC', '🟡', 67), t('Columbus Crew', '🟡', 70),
    t('FC Cincinnati', '🔵', 66), t('Austin FC', '🟢', 65), t('St. Louis CITY', '🔴', 64),
    t('New York Red Bulls', '🔴', 66), t('Portland Timbers', '🟢', 65), t('Houston Dynamo', '🟠', 64),
    t('Minnesota United', '🔵', 63), t('Orlando City', '🟣', 63), t('FC Dallas', '🔴', 62),
    t('Real Salt Lake', '🔴', 62),
  ],
  MX: [
    t('Club América', '🦅', 82), t('Tigres UANL', '🐯', 80), t('Chivas Guadalajara', '🔴', 79),
    t('CF Monterrey', '🔵', 78), t('Cruz Azul', '🔵', 77), t('Pachuca CF', '🔵', 74),
    t('UNAM Pumas', '🐆', 73), t('Santos Laguna', '🟢', 72), t('León FC', '🟢', 71),
    t('Toluca FC', '🔴', 70), t('Atlas FC', '🔴', 69), t('Tijuana', '🔴', 67),
    t('Puebla FC', '🔵', 66), t('Necaxa', '🔴', 65), t('San Luis', '🔴', 64),
    t('Querétaro FC', '🔵', 64), t('Mazatlán FC', '🟣', 63), t('FC Juárez', '🟢', 62),
    t('Tampico Madero', '🔵', 60),
  ],
  CA: [
    t('CF Montréal', '🔵', 68), t('Toronto FC', '🔴', 67), t('Vancouver Whitecaps', '🔵', 66),
    t('Forge FC', '🟠', 64), t('Cavalry FC', '🟢', 63), t('Pacific FC', '🟣', 62),
    t('HFX Wanderers', '🔵', 61), t('Atlético Ottawa', '🔴', 60), t('Valour FC', '🟡', 59),
    t('York United', '🟢', 58), t('FC Edmonton', '🔵', 57), t('Winnipeg Valour', '🔴', 56),
  ],
  CR: [
    t('Saprissa', '🟣', 73), t('LD Alajuelense', '🔴', 72), t('CS Herediano', '🟡', 69),
    t('AD San Carlos', '🔴', 65), t('Municipal Grecia', '🔴', 63), t('Santos Guápiles', '🟢', 62),
    t('Sporting San José', '🔵', 61), t('AD Guanacasteca', '🟡', 60), t('Municipal Pérez Zeledón', '🟢', 59),
    t('Puntarenas FC', '🟠', 58), t('Cartaginés', '🔵', 64), t('Limón FC', '🟡', 57),
  ],
  HN: [
    t('Olimpia HN', '⚪', 72), t('Motagua', '🔵', 71), t('Real España', '🟡', 68),
    t('Marathon', '🟢', 66), t('Platense', '🔵', 63), t('UPNFM', '🔴', 61),
    t('Vida', '🔴', 60), t('Victoria', '🔵', 59), t('Real Sociedad HN', '🟢', 58),
    t('Honduras Progreso', '🔵', 57),
  ],
  PA: [
    t('Tauro FC', '🐂', 70), t('Plaza Amador', '🔴', 68), t('CAI La Chorrera', '🔵', 65),
    t('Sporting SM', '🔵', 63), t('Alianza FC PA', '⚫', 62), t('Universitario PA', '🟡', 61),
    t('San Francisco FC', '🔴', 60), t('Árabe Unido', '🟢', 59), t('Costa del Este', '🔵', 58),
    t('Herrera FC', '🔴', 57),
  ],

  // ===== AFRICA =====
  EG: [
    t('Al Ahly', '🔴', 80), t('Zamalek', '⚪', 78), t('Pyramids FC', '🔵', 73),
    t('Al Masry', '🟢', 68), t('Ismaily SC', '🟡', 66), t('Future FC', '🔵', 65),
    t('Ceramica Cleopatra', '🟠', 63), t('Pharco FC', '🔵', 62), t('ENPPI', '🟢', 61),
    t('Smouha SC', '🔵', 60), t('El Gouna', '🟠', 59), t('Al Mokawloon', '🔴', 60),
  ],
  MA: [
    t('Wydad AC', '🔴', 76), t('Raja CA', '🟢', 75), t('RS Berkane', '🟠', 69),
    t('AS FAR', '🟢', 68), t('FUS Rabat', '🔴', 66), t('MAS Fez', '🟢', 64),
    t('Moghreb Tétouan', '⚪', 63), t('Hassania Agadir', '🟡', 62), t('Difaâ El Jadidi', '🟢', 61),
    t('Olympique Khouribga', '🟡', 60), t('Rapide Oued-Zem', '🔴', 59), t('Chabab Mohammedia', '🔵', 58),
  ],
  TN: [
    t('Espérance Tunis', '🟡', 76), t('Club Africain', '🔴', 73), t('Étoile du Sahel', '🔴', 70),
    t('CS Sfaxien', '⚫', 69), t('US Monastir', '🔵', 66), t('CA Bizertin', '🔵', 64),
    t('Stade Tunisien', '🔴', 63), t('US Ben Guerdane', '🟢', 61), t('AS Soliman', '🔵', 60),
    t('JS Kairouanaise', '🟡', 59), t('AS Gabès', '🟢', 58), t('ES Métlaoui', '🟠', 57),
  ],
  NG: [
    t('Enyimba FC', '🔵', 73), t('Kano Pillars', '🔴', 69), t('Rivers United', '🟣', 68),
    t('Remo Stars', '🔵', 66), t('Plateau United', '🟢', 65), t('Shooting Stars', '🟡', 64),
    t('Akwa United', '🟠', 63), t('Kwara United', '🔵', 62), t('Sunshine Stars', '🟡', 61),
    t('Lobi Stars', '🟢', 60), t('Enugu Rangers', '🔵', 62), t('Bendel Insurance', '🔴', 59),
  ],
  SN: [
    t('Génération Foot', '🔵', 71), t('ASC Jaraaf', '🔴', 69), t('Casa Sports', '🟢', 66),
    t('AS Douanes', '🟡', 64), t('Diambars', '🔵', 63), t('Teungueth FC', '🟢', 65),
    t('US Gorée', '🔵', 61), t('Mbour Petite Côte', '🟠', 60), t('Niary Tally', '🔴', 59),
    t('CNEPS Excellence', '🟡', 58), t('Guédiawaye FC', '🔵', 57), t('Stade de Mbour', '🔴', 56),
  ],
  ZA: [
    t('Mamelodi Sundowns', '🟡', 78), t('Kaizer Chiefs', '🟡', 74), t('Orlando Pirates', '⚫', 73),
    t('Stellenbosch FC', '🔴', 68), t('Cape Town City', '🔵', 67), t('SuperSport United', '🔵', 66),
    t('AmaZulu FC', '🟢', 64), t('Sekhukhune United', '🔵', 63), t('Royal AM', '🟡', 62),
    t('Golden Arrows', '🟡', 61), t('TS Galaxy', '🟣', 60), t('Richards Bay', '🔵', 59),
  ],
  GH: [
    t('Hearts of Oak', '🟡', 72), t('Asante Kotoko', '🔴', 71), t('Medeama SC', '🟡', 67),
    t('Aduana Stars', '🟢', 65), t('Dreams FC', '🔵', 64), t('Accra Great Olympics', '⚫', 63),
    t('King Faisal', '🟢', 61), t('Legon Cities', '🔴', 60), t('Bechem United', '🟢', 62),
    t('Karela United', '🟢', 59), t('Bibiani Gold Stars', '🟡', 58), t('Samartex', '🟢', 57),
  ],
  CM: [
    t('Canon Yaoundé', '🟢', 72), t('Cotonsport Garoua', '🟡', 70), t('Coton Sport FC', '🟢', 69),
    t('Eding Sport', '🔵', 65), t('Union Douala', '🔵', 64), t('PWD Bamenda', '🔴', 63),
    t('AS Fortuna', '🟡', 61), t('Tonnerre Yaoundé', '🔵', 60), t('Fovu Baham', '🔴', 59),
    t('Aigle Royal Menoua', '🟢', 58), t('Panthère Bangangté', '⚫', 57), t('Dragon Yaoundé', '🔴', 56),
  ],

  // ===== ASIA / OCEANIA =====
  JP: [
    t('Vissel Kobe', '🔴', 77), t('Yokohama F. Marinos', '🔵', 76), t('Kawasaki Frontale', '🔵', 75),
    t('Urawa Red Diamonds', '🔴', 74), t('Kashima Antlers', '🦌', 73), t('Sanfrecce Hiroshima', '🟣', 72),
    t('FC Tokyo', '🔵', 71), t('Gamba Osaka', '🔵', 70), t('Nagoya Grampus', '🐬', 69),
    t('Cerezo Osaka', '🌸', 68), t('Kashiwa Reysol', '🟡', 67), t('Consadole Sapporo', '🔴', 66),
    t('Sagan Tosu', '🔵', 65), t('Albirex Niigata', '🟠', 64), t('Avispa Fukuoka', '🟢', 64),
    t('Shimizu S-Pulse', '🟠', 63), t('Kyoto Sanga', '🟣', 63), t('Júbilo Iwata', '🔵', 62),
    t('Shonan Bellmare', '🟢', 61),
  ],
  KR: [
    t('Jeonbuk Hyundai', '🟢', 77), t('Ulsan HD', '🔵', 76), t('Pohang Steelers', '🔴', 73),
    t('FC Seoul', '🔴', 71), t('Suwon Samsung', '🔵', 69), t('Daejeon Hana Citizen', '🟣', 67),
    t('Incheon United', '🔵', 66), t('Jeju United', '🟠', 65), t('Gangwon FC', '🔴', 64),
    t('Gwangju FC', '🟡', 63), t('Suwon FC', '🔵', 62), t('Daegu FC', '🔵', 64),
  ],
  CN: [
    t('Shanghai Port', '🔴', 74), t('Shandong Taishan', '🟠', 73), t('Beijing Guoan', '🟢', 72),
    t('Chengdu Rongcheng', '🟣', 68), t('Zhejiang FC', '🟢', 67), t('Wuhan Three Towns', '🔵', 69),
    t('Shanghai Shenhua', '🔵', 68), t('Tianjin Jinmen Tiger', '🟡', 65), t('Changchun Yatai', '🟢', 63),
    t('Henan Songshan', '🔴', 62), t('Dalian Professional', '🔵', 61), t('Meizhou Hakka', '🟢', 60),
  ],
  SA: [
    t('Al Hilal', '🔵', 82), t('Al Nassr', '🟡', 80), t('Al Ittihad', '🟡', 78),
    t('Al Ahli', '🟢', 76), t('Al Shabab', '⚪', 72), t('Al Ettifaq', '🟢', 70),
    t('Al Fateh', '🟢', 67), t('Al Raed', '🔴', 65), t('Al Taawoun', '🟡', 64),
    t('Al Khaleej', '🟠', 63), t('Damac FC', '🟤', 62), t('Abha Club', '🟢', 61),
    t('Al Fayha', '🔴', 63), t('Al Wehda', '🔴', 62), t('Al Riyadh', '⚪', 60),
  ],
  QA: [
    t('Al Sadd', '⚪', 76), t('Al Duhail', '🔴', 75), t('Al Rayyan', '🟤', 70),
    t('Al Gharafa', '🟡', 68), t('Al Arabi', '🔴', 66), t('Al Wakrah', '🔵', 65),
    t('Qatar SC', '🟡', 63), t('Umm Salal', '🟠', 62), t('Al Ahli QA', '🔴', 61),
    t('Al Sailiya', '🔵', 60), t('Al Shamal', '🔵', 59), t('Muaither', '🟢', 58),
  ],
  IR: [
    t('Persepolis FC', '🔴', 78), t('Esteghlal FC', '🔵', 77), t('Sepahan', '🟡', 74),
    t('Tractor FC', '🔴', 70), t('Foolad FC', '🔴', 68), t('Zob Ahan', '🟢', 67),
    t('Mes Rafsanjan', '🟠', 64), t('Aluminium Arak', '🔵', 63), t('Havadar', '🟣', 62),
    t('Nassaji Mazandaran', '🟢', 61), t('Paykan FC', '🔵', 60), t('Gol Gohar', '🔴', 62),
  ],
  AU: [
    t('Melbourne Victory', '🔵', 72), t('Sydney FC', '🔵', 71), t('Melbourne City', '🔵', 70),
    t('Western Sydney', '🔴', 67), t('Central Coast Mariners', '🟡', 66), t('Adelaide United', '🔴', 65),
    t('Brisbane Roar', '🟠', 64), t('Wellington Phoenix', '🟡', 63), t('Perth Glory', '🟣', 62),
    t('Western United', '🟢', 61), t('Macarthur FC', '⚫', 60), t('Newcastle Jets', '🔴', 59),
  ],
  AE: [
    t('Al Ain FC', '🟣', 76), t('Shabab Al Ahli', '🔴', 74), t('Al Jazira', '⚪', 72),
    t('Al Wasl', '🟡', 69), t('Al Wahda', '🔴', 67), t('Sharjah FC', '🔵', 68),
    t('Bani Yas', '🔵', 65), t('Ajman Club', '🟠', 63), t('Al Dhafra', '🟡', 62),
    t('Emirates Club', '🔴', 61), t('Kalba FC', '🟢', 60), t('Hatta Club', '🔵', 59),
  ],
};

export function getLeagueTeams(country: string, clubName: string): LeagueTeam[] {
  const teams = leaguesByCountry[country] || leaguesByCountry['BR'];
  const playerTeam: LeagueTeam = { name: clubName, logo: '⚽', ...emptyStats, strength: 60 };
  return [playerTeam, ...teams];
}

// Keep backward compatibility
export const initialLeagueTeams = leaguesByCountry['BR'].map(t => ({ ...t }));
