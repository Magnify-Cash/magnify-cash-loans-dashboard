
import { motion } from "framer-motion";
import { LoanMetrics } from "@/utils/types";
import { formatCurrency } from "@/utils/loanCalculations";

interface LoanBreakdownProps {
  metrics: LoanMetrics;
}

const LoanBreakdown = ({ metrics }: LoanBreakdownProps) => {
  const categories = [
    {
      title: "$1 Loans",
      data: metrics.oneDollarLoans,
      total: metrics.oneDollarLoans.total,
      repaidAmount: 1.025
    },
    {
      title: "$10 Loans",
      data: metrics.tenDollarLoans,
      total: metrics.tenDollarLoans.total,
      repaidAmount: 10.15
    }
  ];

  return (
    <div className="glass-card rounded-xl p-6">
      <h2 className="text-lg font-medium mb-4">Loan Breakdown</h2>
      
      <div className="space-y-6">
        {categories.map((category, index) => (
          <motion.div 
            key={category.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium">{category.title}</h3>
              <span className="text-sm text-muted-foreground">
                {category.total} loans
              </span>
            </div>
            
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8, delay: 0.4 + index * 0.1 }}
                className="h-full w-full flex"
              >
                {category.data.repaid > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(category.data.repaid / category.total) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                    className="h-full bg-green-500"
                  ></motion.div>
                )}
                {category.data.inProgress > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(category.data.inProgress / category.total) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                    className="h-full bg-blue-500"
                  ></motion.div>
                )}
                {category.data.defaulted > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(category.data.defaulted / category.total) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                    className="h-full bg-red-500"
                  ></motion.div>
                )}
              </motion.div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-muted-foreground">Repaid</span>
                </div>
                <p className="font-medium">{category.data.repaid}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(category.repaidAmount)} each
                </p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-muted-foreground">In Progress</span>
                </div>
                <p className="font-medium">{category.data.inProgress}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-muted-foreground">Defaulted</span>
                </div>
                <p className="font-medium">{category.data.defaulted}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default LoanBreakdown;
