
export interface LoanData {
  user_wallet: string;
  loan_amount: number;
  loan_repaid_amount?: number | null;
  loan_term: number;
  time_loan_started: string;
  time_loan_ended: string | null;
  loan_due_date: string;
  default_loan_date: string | null;
  is_defaulted: boolean;
  version: string;
  file_upload_id?: string | null;
}

export interface LoanMetrics {
  totalLoans: number;
  totalDefaulted: number;
  totalInProgress: number;
  
  // $1 Loans
  oneDollarLoans: {
    defaulted: number;
    repaid: number;
    inProgress: number;
    total: number;
  };
  
  // $10 Loans
  tenDollarLoans: {
    defaulted: number;
    repaid: number;
    inProgress: number;
    total: number;
  };
}

export interface DueDateGroup {
  label: string;
  days: number;
  count: number;
  loans: LoanData[];
}

export interface ChartData {
  name: string;
  value: number;
  color: string;
}

export interface FileUpload {
  id: string;
  file_name: string;
  upload_date: string;
  record_count: number;
}

export interface ProgressUpdate {
  percent: number;
  message: string;
}
