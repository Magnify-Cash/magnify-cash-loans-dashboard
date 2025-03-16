
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, DollarSign } from 'lucide-react';
import KPICard from './KPICard';
import LoanBreakdown from './LoanBreakdown';
import UpcomingLoans from './UpcomingLoans';
import LoanCharts from './LoanCharts';
import { LoanData, LoanMetrics, DueDateGroup } from '@/utils/types';
import { 
  calculateLoanMetrics,
  generateStatusChartData,
  generateAmountChartData,
  groupLoansByDueDate,
  formatCurrency
} from '@/utils/loanCalculations';

interface DashboardProps {
  data: LoanData[];
}

const Dashboard = ({ data }: DashboardProps) => {
  const [metrics, setMetrics] = useState<LoanMetrics | null>(null);
  const [dueDateGroups, setDueDateGroups] = useState<DueDateGroup[]>([]);
  const [statusChartData, setStatusChartData] = useState([]);
  const [amountChartData, setAmountChartData] = useState({ oneDollar: [], tenDollar: [] });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (data.length > 0) {
      // Calculate all metrics and chart data
      const calculatedMetrics = calculateLoanMetrics(data);
      setMetrics(calculatedMetrics);
      
      const calculatedDueDateGroups = groupLoansByDueDate(data);
      setDueDateGroups(calculatedDueDateGroups);
      
      const calculatedStatusChartData = generateStatusChartData(calculatedMetrics);
      setStatusChartData(calculatedStatusChartData);
      
      const calculatedAmountChartData = generateAmountChartData(calculatedMetrics);
      setAmountChartData(calculatedAmountChartData);
      
      // Trigger animation after a small delay
      setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }
  }, [data]);

  if (!metrics || data.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full"
        >
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold mb-8 text-center"
          >
            Loan Analytics Dashboard
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          >
            <KPICard
              title="Total Loans Issued"
              value={metrics.totalLoans}
              description={`Total value: ${formatCurrency(
                metrics.oneDollarLoans.total * 1 + metrics.tenDollarLoans.total * 10
              )}`}
              icon={<DollarSign size={20} />}
              index={0}
            />
            
            <KPICard
              title="Loans Defaulted"
              value={metrics.totalDefaulted}
              description={`${((metrics.totalDefaulted / metrics.totalLoans) * 100).toFixed(1)}% default rate`}
              icon={<Activity size={20} />}
              index={1}
            />
            
            <KPICard
              title="Loans In Progress"
              value={metrics.totalInProgress}
              description="Active loans awaiting repayment"
              icon={<Clock size={20} />}
              index={2}
            />
          </motion.div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <LoanCharts
              statusData={statusChartData}
              amountData={amountChartData}
            />
            
            <LoanBreakdown metrics={metrics} />
          </div>
          
          <div className="mb-8">
            <UpcomingLoans dueDateGroups={dueDateGroups} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Dashboard;
