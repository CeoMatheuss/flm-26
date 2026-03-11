/**
 * Formation position data for 2D pitch visualization.
 * Positions are normalized 0-1 (left-to-right, top-to-bottom).
 * Home team plays left→right, away is mirrored.
 */

export interface FormationPos {
  x: number;
  y: number;
  role: string;
}

// All formations: 11 positions, index 0 = GK
export const FORMATIONS: Record<string, FormationPos[]> = {
  '4-4-2': [
    { x: 0.06, y: 0.50, role: 'GK' },
    { x: 0.22, y: 0.12, role: 'LB' }, { x: 0.20, y: 0.37, role: 'CB' },
    { x: 0.20, y: 0.63, role: 'CB' }, { x: 0.22, y: 0.88, role: 'RB' },
    { x: 0.42, y: 0.12, role: 'LM' }, { x: 0.38, y: 0.37, role: 'CM' },
    { x: 0.38, y: 0.63, role: 'CM' }, { x: 0.42, y: 0.88, role: 'RM' },
    { x: 0.50, y: 0.35, role: 'ST' }, { x: 0.50, y: 0.65, role: 'ST' },
  ],
  '4-3-3': [
    { x: 0.06, y: 0.50, role: 'GK' },
    { x: 0.22, y: 0.12, role: 'LB' }, { x: 0.20, y: 0.37, role: 'CB' },
    { x: 0.20, y: 0.63, role: 'CB' }, { x: 0.22, y: 0.88, role: 'RB' },
    { x: 0.38, y: 0.25, role: 'CM' }, { x: 0.36, y: 0.50, role: 'CM' },
    { x: 0.38, y: 0.75, role: 'CM' },
    { x: 0.52, y: 0.12, role: 'LW' }, { x: 0.52, y: 0.50, role: 'ST' },
    { x: 0.52, y: 0.88, role: 'RW' },
  ],
  '3-5-2': [
    { x: 0.06, y: 0.50, role: 'GK' },
    { x: 0.20, y: 0.25, role: 'CB' }, { x: 0.18, y: 0.50, role: 'CB' },
    { x: 0.20, y: 0.75, role: 'CB' },
    { x: 0.38, y: 0.08, role: 'LWB' }, { x: 0.36, y: 0.30, role: 'CM' },
    { x: 0.34, y: 0.50, role: 'CM' }, { x: 0.36, y: 0.70, role: 'CM' },
    { x: 0.38, y: 0.92, role: 'RWB' },
    { x: 0.50, y: 0.35, role: 'ST' }, { x: 0.50, y: 0.65, role: 'ST' },
  ],
  '4-2-3-1': [
    { x: 0.06, y: 0.50, role: 'GK' },
    { x: 0.22, y: 0.12, role: 'LB' }, { x: 0.20, y: 0.37, role: 'CB' },
    { x: 0.20, y: 0.63, role: 'CB' }, { x: 0.22, y: 0.88, role: 'RB' },
    { x: 0.34, y: 0.38, role: 'CDM' }, { x: 0.34, y: 0.62, role: 'CDM' },
    { x: 0.46, y: 0.15, role: 'LM' }, { x: 0.44, y: 0.50, role: 'CAM' },
    { x: 0.46, y: 0.85, role: 'RM' },
    { x: 0.52, y: 0.50, role: 'ST' },
  ],
  '5-3-2': [
    { x: 0.06, y: 0.50, role: 'GK' },
    { x: 0.22, y: 0.08, role: 'LWB' }, { x: 0.18, y: 0.28, role: 'CB' },
    { x: 0.16, y: 0.50, role: 'CB' }, { x: 0.18, y: 0.72, role: 'CB' },
    { x: 0.22, y: 0.92, role: 'RWB' },
    { x: 0.36, y: 0.25, role: 'CM' }, { x: 0.34, y: 0.50, role: 'CM' },
    { x: 0.36, y: 0.75, role: 'CM' },
    { x: 0.50, y: 0.35, role: 'ST' }, { x: 0.50, y: 0.65, role: 'ST' },
  ],
  '4-1-4-1': [
    { x: 0.06, y: 0.50, role: 'GK' },
    { x: 0.22, y: 0.12, role: 'LB' }, { x: 0.20, y: 0.37, role: 'CB' },
    { x: 0.20, y: 0.63, role: 'CB' }, { x: 0.22, y: 0.88, role: 'RB' },
    { x: 0.32, y: 0.50, role: 'CDM' },
    { x: 0.44, y: 0.10, role: 'LM' }, { x: 0.42, y: 0.37, role: 'CM' },
    { x: 0.42, y: 0.63, role: 'CM' }, { x: 0.44, y: 0.90, role: 'RM' },
    { x: 0.52, y: 0.50, role: 'ST' },
  ],
  '4-4-1-1': [
    { x: 0.06, y: 0.50, role: 'GK' },
    { x: 0.22, y: 0.12, role: 'LB' }, { x: 0.20, y: 0.37, role: 'CB' },
    { x: 0.20, y: 0.63, role: 'CB' }, { x: 0.22, y: 0.88, role: 'RB' },
    { x: 0.38, y: 0.12, role: 'LM' }, { x: 0.36, y: 0.37, role: 'CM' },
    { x: 0.36, y: 0.63, role: 'CM' }, { x: 0.38, y: 0.88, role: 'RM' },
    { x: 0.48, y: 0.50, role: 'SS' },
    { x: 0.54, y: 0.50, role: 'ST' },
  ],
  '3-4-3': [
    { x: 0.06, y: 0.50, role: 'GK' },
    { x: 0.20, y: 0.25, role: 'CB' }, { x: 0.18, y: 0.50, role: 'CB' },
    { x: 0.20, y: 0.75, role: 'CB' },
    { x: 0.36, y: 0.10, role: 'LM' }, { x: 0.34, y: 0.37, role: 'CM' },
    { x: 0.34, y: 0.63, role: 'CM' }, { x: 0.36, y: 0.90, role: 'RM' },
    { x: 0.52, y: 0.15, role: 'LW' }, { x: 0.52, y: 0.50, role: 'ST' },
    { x: 0.52, y: 0.85, role: 'RW' },
  ],
};

/** Get formation positions or fallback to 4-4-2 */
export function getFormation(name: string): FormationPos[] {
  return FORMATIONS[name] || FORMATIONS['4-4-2'];
}

/** Mirror positions for the away team (right-to-left) */
export function mirrorFormation(positions: FormationPos[]): FormationPos[] {
  return positions.map(p => ({ x: 1 - p.x, y: p.y, role: p.role }));
}
