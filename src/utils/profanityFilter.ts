// Profanity filter - blocks common Portuguese and English profanity
const BLOCKED_WORDS = [
  // Portuguese
  'porra', 'caralho', 'merda', 'puta', 'buceta', 'viado', 'fdp', 'filho da puta',
  'cu ', ' cu', 'cuzao', 'cuzão', 'arrombado', 'desgraçado', 'vagabundo', 'otario',
  'otário', 'imbecil', 'idiota', 'babaca', 'bosta', 'piranha', 'vtnc', 'vsf', 'pqp',
  'foda', 'foder', 'corno', 'retardado', 'mongolóide', 'mongoloide',
  // English  
  'fuck', 'shit', 'bitch', 'ass ', 'damn', 'bastard', 'dick', 'pussy',
  'whore', 'slut', 'nigger', 'faggot', 'retard', 'stfu', 'wtf',
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return BLOCKED_WORDS.some(word => {
    const normalizedWord = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return lower.includes(normalizedWord);
  });
}

export function sanitizeMessage(text: string): string {
  return text.trim().slice(0, 500);
}
