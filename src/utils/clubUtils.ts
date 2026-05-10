/**
 * Club related utilities for validation and formatting.
 */

const FORBIDDEN_WORDS = [
  'solid', 'outline', 'bold', 'icon', 'component', 'undefined', 'null',
  'nan', 'object', 'function', 'class', 'className', 'tailwind', 'css'
];

/**
 * Validates and cleans a club name to prevent saving CSS classes, 
 * internal icons or invalid strings.
 */
export function validateAndCleanClubName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return 'Clube Sem Nome';
  
  let cleanName = name.trim();
  
  // Basic sanity check
  if (!cleanName || cleanName.length < 2) return 'Clube Sem Nome';

  // Check for suspicious internal terms/CSS classes
  const lowerName = cleanName.toLowerCase();
  
  // If the name is exactly a forbidden word
  if (FORBIDDEN_WORDS.includes(lowerName)) {
    return 'Clube Sem Nome';
  }

  // If the name contains common bugged patterns (like CSS classes list)
  // e.g. "text-red-500 solid bold"
  const parts = lowerName.split(/\s+/);
  const hasTooManyForbidden = parts.filter(p => FORBIDDEN_WORDS.includes(p)).length > 0;
  
  if (hasTooManyForbidden && parts.length <= 3) {
    return 'Clube Sem Nome';
  }

  // Remove potential HTML tags
  cleanName = cleanName.replace(/<[^>]*>?/gm, '');

  return cleanName || 'Clube Sem Nome';
}
