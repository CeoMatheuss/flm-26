// Mapeamento de continentes -> nomes oficiais das copas internacionais
export interface InternationalCupNames {
  principal: string;
  emoji: string;
}

export const INTERNATIONAL_CUPS: Record<string, InternationalCupNames> = {
  'Europa': {
    principal: 'UEFA Champions League',
    emoji: '🇪🇺',
  },
  'América do Sul': {
    principal: 'Copa Libertadores da América',
    emoji: '🌎',
  },
  'América do Norte': {
    principal: 'CONCACAF Champions Cup',
    emoji: '🌎',
  },
  'África': {
    principal: 'CAF Champions League',
    emoji: '🌍',
  },
  'Ásia': {
    principal: 'AFC Champions League',
    emoji: '🌏',
  },
  'Oceania': {
    principal: 'OFC Champions League',
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
