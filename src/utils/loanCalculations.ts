
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
    const isDueDateInFutureOrToday = !isNaN(dueDate.getTime()) && dueDate <= today;
    const isMissingRepaidAmount = loan.loan_repaid_amount === undefined || loan.loan_repaid_amount === null;
    
    return isDueDateInFutureOrToday && (isMissingRepaidAmount || loan.loan_repaid_amount < loan.loan_amount);
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
