
import { LoanData, DueDateGroup, LoanMetrics, ChartData } from './types';

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
  const activeLoans = loans.filter(loan => {
    if (loan.is_defaulted || loan.default_loan_date) return false;
    
    const dueDate = new Date(loan.loan_due_date);
    const isDueDateInPastOrToday = !isNaN(dueDate.getTime()) && dueDate >= today;
    const isMissingRepaidAmount = loan.loan_repaid_amount === undefined || loan.loan_repaid_amount === null;
    
    return isDueDateInPastOrToday && (isMissingRepaidAmount || loan.loan_repaid_amount < loan.loan_amount);
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

export function calculateLoanMetrics(loans: LoanData[]): LoanMetrics {
  const metrics: LoanMetrics = {
    totalLoans: 0,
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
  
  if (!loans || loans.length === 0) return metrics;
  
  metrics.totalLoans = loans.length;
  
  loans.forEach(loan => {
    // Count by loan status
    if (loan.is_defaulted || loan.default_loan_date) {
      metrics.totalDefaulted++;
    } else if (loan.loan_repaid_amount !== null && loan.loan_repaid_amount >= loan.loan_amount) {
      // Fully repaid loans
    } else {
      metrics.totalInProgress++;
    }
    
    // Categorize by loan amount
    if (loan.loan_amount === 1) {
      metrics.oneDollarLoans.total++;
      
      if (loan.is_defaulted || loan.default_loan_date) {
        metrics.oneDollarLoans.defaulted++;
      } else if (loan.loan_repaid_amount !== null && loan.loan_repaid_amount >= loan.loan_amount) {
        metrics.oneDollarLoans.repaid++;
      } else {
        metrics.oneDollarLoans.inProgress++;
      }
    } else if (loan.loan_amount === 10) {
      metrics.tenDollarLoans.total++;
      
      if (loan.is_defaulted || loan.default_loan_date) {
        metrics.tenDollarLoans.defaulted++;
      } else if (loan.loan_repaid_amount !== null && loan.loan_repaid_amount >= loan.loan_amount) {
        metrics.tenDollarLoans.repaid++;
      } else {
        metrics.tenDollarLoans.inProgress++;
      }
    }
  });
  
  return metrics;
}

export function generateStatusChartData(metrics: LoanMetrics): ChartData[] {
  return [
    { 
      name: "Repaid", 
      value: metrics.oneDollarLoans.repaid + metrics.tenDollarLoans.repaid, 
      color: "#22C55E" // green-500
    },
    { 
      name: "In Progress", 
      value: metrics.totalInProgress, 
      color: "#3B82F6" // blue-500
    },
    { 
      name: "Defaulted", 
      value: metrics.totalDefaulted, 
      color: "#EF4444" // red-500
    }
  ];
}

export function generateAmountChartData(metrics: LoanMetrics): {
  oneDollar: ChartData[];
  tenDollar: ChartData[];
} {
  return {
    oneDollar: [
      { name: "Repaid", value: metrics.oneDollarLoans.repaid, color: "#22C55E" },
      { name: "In Progress", value: metrics.oneDollarLoans.inProgress, color: "#3B82F6" },
      { name: "Defaulted", value: metrics.oneDollarLoans.defaulted, color: "#EF4444" }
    ],
    tenDollar: [
      { name: "Repaid", value: metrics.tenDollarLoans.repaid, color: "#22C55E" },
      { name: "In Progress", value: metrics.tenDollarLoans.inProgress, color: "#3B82F6" },
      { name: "Defaulted", value: metrics.tenDollarLoans.defaulted, color: "#EF4444" }
    ]
  };
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "$0.00";
  }
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  }).format(value);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function getDaysRemaining(dueDateString: string): number {
  const dueDate = new Date(dueDateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (isNaN(dueDate.getTime())) {
    return 0;
  }
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}
