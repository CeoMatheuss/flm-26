export const CONTINENTAL_COMPETITIONS = {
  south_america: {
    id: 'libertadores',
    name: 'Libertadores',
    icon: '🏆',
    color: 'text-yellow-500',
    description: 'A glória eterna da América do Sul'
  },
  europe: {
    id: 'champions_league',
    name: 'Champions League',
    icon: '⭐',
    color: 'text-blue-500',
    description: 'A elite do futebol europeu'
  },
  north_america: {
    id: 'concacaf_champions',
    name: 'CONCACAF Champions',
    icon: '🦅',
    color: 'text-emerald-500',
    description: 'O topo da América do Norte e Central'
  },
  asia: {
    id: 'afc_champions',
    name: 'AFC Champions League',
    icon: '🌏',
    color: 'text-red-500',
    description: 'A supremacia do futebol asiático'
  },
  africa: {
    id: 'caf_champions',
    name: 'CAF Champions League',
    icon: '🐘',
    color: 'text-orange-500',
    description: 'A força bruta do futebol africano'
  },
  oceania: {
    id: 'ofc_champions',
    name: 'OFC Champions League',
    icon: '🌊',
    color: 'text-cyan-500',
    description: 'O melhor da Oceania'
  }
} as const;

export type ContinentKey = keyof typeof CONTINENTAL_COMPETITIONS;

export function getContinentalCompetition(continent: string) {
  return CONTINENTAL_COMPETITIONS[continent as ContinentKey] || CONTINENTAL_COMPETITIONS.europe;
}
