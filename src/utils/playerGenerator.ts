import { Player } from '@/types/game';
import { YouthProspect, getYouthMinOverall, getYouthMaxOverall } from '@/types/infrastructure';

const generateId = () => Math.random().toString(36).substr(2, 9);

const firstNames = ['Carlos', 'Henrique', 'Vinícius', 'Jonathan', 'Renan', 'Caio', 'Yuri', 'Danilo', 'Leandro', 'Igor', 'Gustavo', 'Eduardo', 'Ricardo', 'Fabrício', 'Willian', 'Jean', 'Samuel', 'Otávio', 'Rogério', 'Adriano', 'Matheus', 'Luan', 'Wesley', 'Breno', 'Kelvin', 'Ruan', 'Davi', 'Enzo', 'Miguel', 'Arthur'];
const lastNames = ['Pereira', 'Araújo', 'Barbosa', 'Ribeiro', 'Martins', 'Cardoso', 'Pinto', 'Nascimento', 'Moreira', 'Teixeira', 'Carvalho', 'Monteiro', 'Campos', 'Duarte', 'Correia', 'Freitas', 'Machado', 'Ramos', 'Vieira', 'Lopes'];

const positions: Player['position'][] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

function randomName() {
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

export function generateMarketPlayer(): Player {
  const pos = positions[Math.floor(Math.random() * positions.length)];
  const overall = Math.floor(Math.random() * 25 + 60);
  const age = Math.floor(Math.random() * 15 + 18);
  return {
    id: generateId(),
    name: randomName(),
    position: pos,
    overall,
    age,
    salary: Math.floor(overall * 800 + Math.random() * 10000),
    stamina: Math.floor(Math.random() * 30 + 70),
    morale: Math.floor(Math.random() * 30 + 60),
    goals: 0,
    assists: 0,
  };
}

export function generateMarketPlayers(count: number): Player[] {
  return Array.from({ length: count }, () => generateMarketPlayer());
}

export function getPlayerValue(player: Player): number {
  const baseValue = player.overall * 15000;
  const ageFactor = player.age < 25 ? 1.3 : player.age > 30 ? 0.7 : 1;
  return Math.floor(baseValue * ageFactor);
}

export function generateYouthProspect(academyLevel: number): YouthProspect {
  const pos = positions[Math.floor(Math.random() * positions.length)];
  const minOvr = getYouthMinOverall(academyLevel);
  const maxOvr = getYouthMaxOverall(academyLevel);
  const overall = Math.floor(Math.random() * (maxOvr - minOvr) + minOvr);
  const age = Math.floor(Math.random() * 3 + 16); // 16-18
  const potential = Math.min(99, overall + Math.floor(Math.random() * 20 + 5));

  return {
    id: generateId(),
    name: randomName(),
    position: pos,
    overall,
    age,
    salary: Math.floor(overall * 300 + 5000),
    stamina: Math.floor(Math.random() * 20 + 75),
    morale: Math.floor(Math.random() * 20 + 70),
    goals: 0,
    assists: 0,
    potential,
    monthsInAcademy: 0,
  };
}

export function generateYouthBatch(count: number, academyLevel: number): YouthProspect[] {
  return Array.from({ length: count }, () => generateYouthProspect(academyLevel));
}
