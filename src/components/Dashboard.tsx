import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, DollarSign, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import KPICard from './KPICard';
import LoanBreakdown from './LoanBreakdown';
import UpcomingLoans from './UpcomingLoans';
import LoanCharts from './LoanCharts';
import FileUploadBanner from './FileUploadBanner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStatus, setLoadStatus] = useState('');

  useEffect(() => {
    if (data.length > 0) {
      calculateAllMetrics(data);
    } else {
      setIsVisible(false);
    }
  }, [data]);

  const calculateAllMetrics = (loanData: LoanData[]) => {
    try {
      const calculatedMetrics = calculateLoanMetrics(loanData);
      setMetrics(calculatedMetrics);
      
      const calculatedDueDateGroups = groupLoansByDueDate(loanData);
      setDueDateGroups(calculatedDueDateGroups);
      
      const calculatedStatusChartData = generateStatusChartData(calculatedMetrics);
      setStatusChartData(calculatedStatusChartData);
      
      const calculatedAmountChartData = generateAmountChartData(calculatedMetrics);
      setAmountChartData(calculatedAmountChartData);
      
      setTimeout(() => setIsVisible(true), 100);
    } catch (error) {
      console.error("Error calculating metrics:", error);
      toast.error("Error calculating loan metrics");
    }
  };

  const handleProgressUpdate = (percent: number, message: string) => {
    setLoadProgress(percent);
    setLoadStatus(message);
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setLoadProgress(0);
      setLoadStatus('Preparing to load data...');
      
      const freshData = await fetchLoansFromDatabase(handleProgressUpdate);
      
      if (freshData.length > 0) {
        calculateAllMetrics(freshData);
        toast.success(`Successfully loaded ${freshData.length} loans`);
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
        
        {isRefreshing && loadProgress > 0 && (
          <div className="mt-6 max-w-md mx-auto">
            <p className="text-sm mb-2">{loadStatus}</p>
            <Progress value={loadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{loadProgress}% complete</p>
          </div>
        )}
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
          
          {isRefreshing && loadProgress > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <p className="text-sm mb-2">{loadStatus}</p>
              <Progress value={loadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{loadProgress}% complete</p>
            </motion.div>
          )}
          
          <FileUploadBanner />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
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
              title="Loans Repaid"
              value={metrics.oneDollarLoans.repaid + metrics.tenDollarLoans.repaid}
              description={`${(((metrics.oneDollarLoans.repaid + metrics.tenDollarLoans.repaid) / metrics.totalLoans) * 100).toFixed(1)}% repayment rate`}
              icon={<CheckCircle size={20} />}
              index={1}
            />
            
            <KPICard
              title="Loans Defaulted"
              value={metrics.totalDefaulted}
              description={`${((metrics.totalDefaulted / metrics.totalLoans) * 100).toFixed(1)}% default rate`}
              icon={<Activity size={20} />}
              index={2}
            />
            
            <KPICard
              title="Loans In Progress"
              value={metrics.totalInProgress}
              description="Active loans with future due dates"
              icon={<Clock size={20} />}
              index={3}
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
            <UpcomingLoans 
              dueDateGroups={dueDateGroups} 
              loans={data} 
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Dashboard;
