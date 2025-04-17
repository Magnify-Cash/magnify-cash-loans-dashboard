import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DueDateGroup, LoanData } from '@/utils/types';
import { 
  formatCurrency, 
  formatDate, 
  getDaysRemaining, 
  getExpiredLoans 
} from '@/utils/loanCalculations';

interface UpcomingLoansProps {
  dueDateGroups: DueDateGroup[];
  loans: LoanData[]; // Full loans collection for expired calculation
}

const UpcomingLoans = ({ dueDateGroups, loans }: UpcomingLoansProps) => {
  const [activeTab, setActiveTab] = useState("1");
  
  // Get expired loans using the dedicated function, ensuring loans is defined
  const expiredLoans = Array.isArray(loans) ? getExpiredLoans(loans) : [];

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium">Upcoming Repayments</h2>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock size={16} />
          <span className="text-sm">By due date</span>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 mb-6">
          {dueDateGroups.map((group) => (
            <TabsTrigger
              key={group.days}
              value={group.days.toString()}
              className="relative"
            >
              <span className="mr-1">{group.days}d</span>
              {group.count > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs bg-primary text-white rounded-full">
                  {group.count}
                </span>
              )}
            </TabsTrigger>
          ))}
          <TabsTrigger
            value="expired"
            className="relative"
          >
            <span className="mr-1">Expired</span>
            {expiredLoans.length > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs bg-amber-500 text-white rounded-full">
                {expiredLoans.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        
        {dueDateGroups.map((group) => (
          <TabsContent key={group.days} value={group.days.toString()}>
            <LoanTable loans={group.loans} />
          </TabsContent>
        ))}
        
        <TabsContent value="expired">
          <LoanTable loans={expiredLoans} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface LoanTableProps {
  loans: LoanData[];
}

const LoanTable = ({ loans }: LoanTableProps) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof LoanData | 'daysRemaining';
    direction: 'asc' | 'desc';
  }>({
    key: 'loan_due_date',
    direction: 'asc',
  });

  const requestSort = (key: keyof LoanData | 'daysRemaining') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedLoans = [...loans].sort((a, b) => {
    if (sortConfig.key === 'daysRemaining') {
      const daysA = getDaysRemaining(a.loan_due_date);
      const daysB = getDaysRemaining(b.loan_due_date);
      return sortConfig.direction === 'asc' ? daysA - daysB : daysB - daysA;
    }
    
    if (sortConfig.key === 'loan_amount' || sortConfig.key === 'loan_repaid_amount') {
      return sortConfig.direction === 'asc'
        ? a[sortConfig.key] - b[sortConfig.key]
        : b[sortConfig.key] - a[sortConfig.key];
    }
    
    if (sortConfig.key === 'loan_due_date') {
      return sortConfig.direction === 'asc'
        ? new Date(a[sortConfig.key]).getTime() - new Date(b[sortConfig.key]).getTime()
        : new Date(b[sortConfig.key]).getTime() - new Date(a[sortConfig.key]).getTime();
    }
    
    return 0;
  });

  const getSortIcon = (key: keyof LoanData | 'daysRemaining') => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  if (loans.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No loans due in this timeframe</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <motion.table
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full loans-table"
      >
        <thead>
          <tr>
            <th
              className="text-left cursor-pointer"
              onClick={() => requestSort('user_wallet')}
            >
              <div className="flex items-center gap-1">
                Wallet
                {getSortIcon('user_wallet')}
              </div>
            </th>
            <th
              className="text-right cursor-pointer"
              onClick={() => requestSort('loan_amount')}
            >
              <div className="flex items-center justify-end gap-1">
                Amount
                {getSortIcon('loan_amount')}
              </div>
            </th>
            <th
              className="text-right cursor-pointer"
              onClick={() => requestSort('loan_repaid_amount')}
            >
              <div className="flex items-center justify-end gap-1">
                Repaid
                {getSortIcon('loan_repaid_amount')}
              </div>
            </th>
            <th
              className="text-center cursor-pointer"
              onClick={() => requestSort('loan_due_date')}
            >
              <div className="flex items-center justify-center gap-1">
                Due Date
                {getSortIcon('loan_due_date')}
              </div>
            </th>
            <th
              className="text-center cursor-pointer"
              onClick={() => requestSort('daysRemaining')}
            >
              <div className="flex items-center justify-center gap-1">
                Days Left
                {getSortIcon('daysRemaining')}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedLoans.map((loan, index) => {
            const daysRemaining = getDaysRemaining(loan.loan_due_date);
            const isUrgent = daysRemaining <= 3;
            
            return (
              <motion.tr
                key={`${loan.user_wallet}_${index}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <td className="text-left">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-2">
                      {loan.user_wallet.substring(0, 2)}
                    </div>
                    <div className="text-sm truncate max-w-[120px]">
                      {loan.user_wallet}
                    </div>
                  </div>
                </td>
                <td className="text-right">
                  {formatCurrency(loan.loan_amount)}
                </td>
                <td className="text-right">
                  {formatCurrency(loan.loan_repaid_amount)}
                </td>
                <td className="text-center">
                  {formatDate(loan.loan_due_date)}
                </td>
                <td className="text-center">
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${
                    isUrgent ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </motion.table>
    </div>
  );
};

export default UpcomingLoans;
