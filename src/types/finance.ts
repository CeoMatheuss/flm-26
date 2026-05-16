export type FinanceType = 'receita' | 'despesa' | 'investimento' | 'premiação';

export type FinanceCategory = 
  | 'Sócios'
  | 'Patrocínio'
  | 'Marketing'
  | 'Bilheteria'
  | 'Uniformes'
  | 'Loja'
  | 'Pacotinhos'
  | 'Premiação'
  | 'Direitos TV'
  | 'Transferência'
  | 'Empréstimo'
  | 'Bônus'
  | 'Eventos'
  | 'Salários'
  | 'Contratos'
  | 'Infraestrutura'
  | 'Olheiros'
  | 'Impostos'
  | 'Outros';

export interface FinanceEntry {
  id: string;
  type: FinanceType;
  category: FinanceCategory;
  amount: number;
  description: string;
  date: string;
  timestamp: number;
}

export function createFinanceEntry(
  type: FinanceType,
  category: FinanceCategory,
  amount: number,
  description: string
): FinanceEntry {
  return {
    id: Math.random().toString(36).substring(2, 11),
    type,
    category,
    amount,
    description,
    date: new Date().toLocaleDateString('pt-BR'),
    timestamp: Date.now(),
  };
}

