
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, DollarSign, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import KPICard from './KPICard';
import LoanBreakdown from './LoanBreakdown';
import UpcomingLoans from './UpcomingLoans';
import LoanCharts from './LoanCharts';
import FileUploadBanner from './FileUploadBanner';
import { Button } from '@/components/ui/button';
import { LoanData, LoanMetrics, DueDateGroup } from '@/utils/types';
import { fetchLoansFromDatabase } from '@/utils/csvParser';
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (data.length > 0) {
      calculateAllMetrics(data);
    } else {
      setIsVisible(false);
    }
  }, [data]);

  const calculateAllMetrics = (loanData: LoanData[]) => {
    try {
      // Calculate all metrics and chart data
      const calculatedMetrics = calculateLoanMetrics(loanData);
      setMetrics(calculatedMetrics);
      
      const calculatedDueDateGroups = groupLoansByDueDate(loanData);
      setDueDateGroups(calculatedDueDateGroups);
      
      const calculatedStatusChartData = generateStatusChartData(calculatedMetrics);
      setStatusChartData(calculatedStatusChartData);
      
      const calculatedAmountChartData = generateAmountChartData(calculatedMetrics);
      setAmountChartData(calculatedAmountChartData);
      
      // Trigger animation after a small delay
      setTimeout(() => setIsVisible(true), 100);
    } catch (error) {
      console.error("Error calculating metrics:", error);
      toast.error("Error calculating loan metrics");
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const freshData = await fetchLoansFromDatabase();
      
      if (freshData.length > 0) {
        calculateAllMetrics(freshData);
        toast.success("Dashboard data refreshed successfully");
      } else {
        toast.info("No loan data found in the database");
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh dashboard data");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!metrics || data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No loan data available to display.</p>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </>
          )}
        </Button>
      </div>
    );
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
          <div className="flex justify-between items-center mb-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl font-bold"
            >
              Loan Analytics Dashboard
            </motion.h1>
            
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </>
              )}
            </Button>
          </div>
          
          {/* File Upload Banner */}
          <FileUploadBanner />
          
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
              description="Active loans with future due dates"
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
