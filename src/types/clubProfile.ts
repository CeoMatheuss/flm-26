export interface Trophy {
  title: string;
  season: number;
  date: string;
}

export interface ClubProfile {
  ownerName: string;
  instagram: string;
  bio: string;
  foundedSeason: number;
  /** Foundation date as DD/MM/YYYY string */
  foundedDate?: string;
  motto: string;
  trophies?: Trophy[];
  /** When true, user can edit club name, stadium name, and shield. Unlocked via R$10 payment. */
  customizationUnlocked?: boolean;
}

export const defaultClubProfile: ClubProfile = {
  ownerName: '',
  instagram: '',
  bio: '',
  foundedSeason: 1,
  foundedDate: '',
  motto: '',
  trophies: [],
  customizationUnlocked: false,
};
