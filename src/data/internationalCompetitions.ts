// Mapeamento de continentes -> nomes oficiais das copas internacionais
export interface InternationalCupNames {
  principal: string;
  secundaria: string;
  emoji: string;
}

export const INTERNATIONAL_CUPS: Record<string, InternationalCupNames> = {
  'Europa': {
    principal: 'UEFA Champions League',
    secundaria: 'UEFA Europa League',
    emoji: '🇪🇺',
  },
  'América do Sul': {
    principal: 'Copa Libertadores da América',
    secundaria: 'Copa Sul-Americana',
    emoji: '🌎',
  },
  'América do Norte': {
    principal: 'CONCACAF Champions Cup',
    secundaria: 'CONCACAF Liga',
    emoji: '🌎',
  },
  'África': {
    principal: 'CAF Champions League',
    secundaria: 'CAF Confederation Cup',
    emoji: '🌍',
  },
  'Ásia': {
    principal: 'AFC Champions League',
    secundaria: 'AFC Cup',
    emoji: '🌏',
  },
  'Oceania': {
    principal: 'OFC Champions League',
    secundaria: 'OFC President Cup',
    emoji: '🌏',
  },
};

export const ALL_CONTINENTS = Object.keys(INTERNATIONAL_CUPS);

export const COUNTRY_TO_CONTINENT: Record<string, string> = {
  'Brasil': 'América do Sul', 'Argentina': 'América do Sul', 'Uruguai': 'América do Sul',
  'Chile': 'América do Sul', 'Colômbia': 'América do Sul', 'Peru': 'América do Sul',
  'Equador': 'América do Sul', 'Paraguai': 'América do Sul', 'Bolívia': 'América do Sul',
  'Venezuela': 'América do Sul',
  'Espanha': 'Europa', 'Inglaterra': 'Europa', 'Itália': 'Europa', 'Alemanha': 'Europa',
  'França': 'Europa', 'Portugal': 'Europa', 'Holanda': 'Europa', 'Bélgica': 'Europa',
  'México': 'América do Norte', 'Estados Unidos': 'América do Norte', 'Canadá': 'América do Norte',
  'Egito': 'África', 'Marrocos': 'África', 'Nigéria': 'África', 'África do Sul': 'África',
  'Japão': 'Ásia', 'Coreia do Sul': 'Ásia', 'Arábia Saudita': 'Ásia', 'China': 'Ásia',
  'Austrália': 'Oceania', 'Nova Zelândia': 'Oceania',
};
