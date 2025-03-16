
import { LoanData, LoanMetrics, DueDateGroup, ChartData } from "./types";

// Calculate key loan metrics
export function calculateLoanMetrics(loans: LoanData[]): LoanMetrics {
  // Initialize metrics object
  const metrics: LoanMetrics = {
    totalLoans: loans.length,
    totalDefaulted: 0,
    totalInProgress: 0,
    oneDollarLoans: {
      defaulted: 0,
      repaid: 0,
      inProgress: 0,
      total: 0
    },
    tenDollarLoans: {
      defaulted: 0,
      repaid: 0,
      inProgress: 0,
      total: 0
    }
  };
  
  // Process each loan
  loans.forEach(loan => {
    // Count defaulted loans
    if (loan.is_defaulted || loan.date_loan_defaulted) {
      metrics.totalDefaulted++;
    }
    
    // Count in-progress loans
    if (!loan.is_defaulted && loan.loan_repaid_amount < loan.loan_amount) {
      metrics.totalInProgress++;
    }
    
    // Process $1 loans
    if (Math.abs(loan.loan_amount - 1) < 0.01) {
      metrics.oneDollarLoans.total++;
      
      if (loan.is_defaulted) {
        metrics.oneDollarLoans.defaulted++;
      } else if (Math.abs(loan.loan_repaid_amount - 1.025) < 0.001) {
        metrics.oneDollarLoans.repaid++;
      } else if (loan.loan_repaid_amount < 1.025) {
        metrics.oneDollarLoans.inProgress++;
      }
    }
    
    // Process $10 loans
    if (Math.abs(loan.loan_amount - 10) < 0.01) {
      metrics.tenDollarLoans.total++;
      
      if (loan.is_defaulted) {
        metrics.tenDollarLoans.defaulted++;
      } else if (Math.abs(loan.loan_repaid_amount - 10.15) < 0.001) {
        metrics.tenDollarLoans.repaid++;
      } else if (loan.loan_repaid_amount < 10.15) {
        metrics.tenDollarLoans.inProgress++;
      }
    }
  });
  
  return metrics;
}

// Generate chart data for status breakdown
export function generateStatusChartData(metrics: LoanMetrics): ChartData[] {
  return [
    { name: "Repaid", value: metrics.oneDollarLoans.repaid + metrics.tenDollarLoans.repaid, color: "#22c55e" },
    { name: "Defaulted", value: metrics.totalDefaulted, color: "#ef4444" },
    { name: "In Progress", value: metrics.totalInProgress, color: "#3b82f6" }
  ];
}

// Generate chart data for loan amount breakdown
export function generateAmountChartData(metrics: LoanMetrics): {
  oneDollar: ChartData[],
  tenDollar: ChartData[]
} {
  return {
    oneDollar: [
      { name: "Repaid", value: metrics.oneDollarLoans.repaid, color: "#22c55e" },
      { name: "Defaulted", value: metrics.oneDollarLoans.defaulted, color: "#ef4444" },
      { name: "In Progress", value: metrics.oneDollarLoans.inProgress, color: "#3b82f6" }
    ],
    tenDollar: [
      { name: "Repaid", value: metrics.tenDollarLoans.repaid, color: "#22c55e" },
      { name: "Defaulted", value: metrics.tenDollarLoans.defaulted, color: "#ef4444" },
      { name: "In Progress", value: metrics.tenDollarLoans.inProgress, color: "#3b82f6" }
    ]
  };
}

// Generate upcoming due loans by timeframe
export function groupLoansByDueDate(loans: LoanData[]): DueDateGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Define our due date groups
  const dueGroups: DueDateGroup[] = [
    { label: "Due in 1 day", days: 1, count: 0, loans: [] },
    { label: "Due in 5 days", days: 5, count: 0, loans: [] },
    { label: "Due in 7 days", days: 7, count: 0, loans: [] },
    { label: "Due in 10 days", days: 10, count: 0, loans: [] },
    { label: "Due in 14 days", days: 14, count: 0, loans: [] },
    { label: "Due in 30 days", days: 30, count: 0, loans: [] }
  ];
  
  // Only process non-defaulted and not fully repaid loans
  const activeLoans = loans.filter(loan => 
    !loan.is_defaulted && 
    !loan.date_loan_defaulted && 
    loan.loan_repaid_amount < loan.loan_amount
  );
  
  activeLoans.forEach(loan => {
    const dueDate = new Date(loan.loan_due_date);
    
    // Skip invalid dates
    if (isNaN(dueDate.getTime())) return;
    
    // Calculate days until due
    const diffTime = Math.abs(dueDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Add loan to appropriate groups
    dueGroups.forEach(group => {
      if (diffDays <= group.days) {
        group.count++;
        group.loans.push(loan);
      }
    });
  });
  
  // Sort loans by due date within each group
  dueGroups.forEach(group => {
    group.loans.sort((a, b) => 
      new Date(a.loan_due_date).getTime() - new Date(b.loan_due_date).getTime()
    );
  });
  
  return dueGroups;
}

// Format currency amounts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Format dates in a user-friendly way
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

// Calculate days remaining until due date
export function getDaysRemaining(dueDateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(dueDateString);
  if (isNaN(dueDate.getTime())) return 0;
  
  const diffTime = dueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
