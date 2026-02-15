export interface FinanceEntry {
  id: string;
  type: 'receita' | 'despesa';
  category: string;
  amount: number;
  description: string;
  date: string;
}

export function createFinanceEntry(
  type: 'receita' | 'despesa',
  category: string,
  amount: number,
  description: string
): FinanceEntry {
  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    category,
    amount,
    description,
    date: new Date().toLocaleDateString('pt-BR'),
  };
}
