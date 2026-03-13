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
}

export const defaultClubProfile: ClubProfile = {
  ownerName: '',
  instagram: '',
  bio: '',
  foundedSeason: 1,
  foundedDate: '',
  motto: '',
  trophies: [],
};
