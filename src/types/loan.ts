export interface LoanTerms {
  duration: number; // in months or seasons
  loanFee: number;
  optionalPurchasePrice?: number;
  obligatoryPurchase: boolean;
  salaryPercentageOwner: number;
  salaryPercentageBorrower: number;
  allowTermination: boolean;
  minStayMonths: number;
  terminationFee: number;
  canPlayAgainstOwner: boolean;
  usagePriority: 'none' | 'rotacao' | 'titular' | 'estrela';
  minMinutesRequired: number;
  performanceBonus: number;
}

export const defaultLoanTerms: LoanTerms = {
  duration: 12,
  loanFee: 0,
  optionalPurchasePrice: undefined,
  obligatoryPurchase: false,
  salaryPercentageOwner: 0,
  salaryPercentageBorrower: 100,
  allowTermination: true,
  minStayMonths: 0,
  terminationFee: 0,
  canPlayAgainstOwner: false,
  usagePriority: 'none',
  minMinutesRequired: 0,
  performanceBonus: 0,
};
