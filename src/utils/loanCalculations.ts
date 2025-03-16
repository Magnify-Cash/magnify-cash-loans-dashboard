
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
  
  // Current date for comparing due dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Process each loan
  loans.forEach(loan => {
    // Parse the due date
    const dueDate = new Date(loan.loan_due_date);
    const isDueDateInFuture = !isNaN(dueDate.getTime()) && dueDate > today;
    const isMissingRepaidAmount = loan.loan_repaid_amount === undefined || loan.loan_repaid_amount === null;
    
    // Count defaulted loans - check for explicit true value or non-empty default_loan_date
    const isDefaulted = loan.is_defaulted === true;
    const hasDefaultDate = loan.default_loan_date !== null && loan.default_loan_date !== "" && loan.default_loan_date !== undefined;
    
    if (isDefaulted || hasDefaultDate) {
      metrics.totalDefaulted++;
    }
    
    // Count in-progress loans
    if (!isDefaulted && !hasDefaultDate && isDueDateInFuture && 
        (isMissingRepaidAmount || loan.loan_repaid_amount < loan.loan_amount)) {
      metrics.totalInProgress++;
    }
    
    // Process $1 loans
    if (Math.abs(loan.loan_amount - 1) < 0.01) {
      metrics.oneDollarLoans.total++;
      
      if (isDefaulted || hasDefaultDate) {
        metrics.oneDollarLoans.defaulted++;
      } else if (!isMissingRepaidAmount && loan.loan_repaid_amount >= 1.025) {
        metrics.oneDollarLoans.repaid++;
      } else if ((isMissingRepaidAmount || loan.loan_repaid_amount < 1.025) && isDueDateInFuture) {
        metrics.oneDollarLoans.inProgress++;
      }
    }
    
    // Process $10 loans
    if (Math.abs(loan.loan_amount - 10) < 0.01) {
      metrics.tenDollarLoans.total++;
      
      if (isDefaulted || hasDefaultDate) {
        metrics.tenDollarLoans.defaulted++;
      } else if (!isMissingRepaidAmount && loan.loan_repaid_amount >= 10.15) {
        metrics.tenDollarLoans.repaid++;
      } else if ((isMissingRepaidAmount || loan.loan_repaid_amount < 10.15) && isDueDateInFuture) {
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
  
  // Only process non-defaulted and not fully repaid loans with future due dates
  const activeLoans = loans.filter(loan => {
    if (loan.is_defaulted || loan.default_loan_date) return false;
    
    const dueDate = new Date(loan.loan_due_date);
    const isDueDateInFuture = !isNaN(dueDate.getTime()) && dueDate >= today;
    const isMissingRepaidAmount = loan.loan_repaid_amount === undefined || loan.loan_repaid_amount === null;
    
    return isDueDateInFuture && (isMissingRepaidAmount || loan.loan_repaid_amount < loan.loan_amount);
  });
  
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
