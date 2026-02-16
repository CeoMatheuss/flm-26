export interface ClubProfile {
  ownerName: string;
  instagram: string;
  bio: string;
  foundedSeason: number;
  motto: string;
}

export const defaultClubProfile: ClubProfile = {
  ownerName: '',
  instagram: '',
  bio: '',
  foundedSeason: 1,
  motto: '',
};
