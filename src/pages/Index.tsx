
import { useState } from 'react';
import { motion } from 'framer-motion';
import CSVUploader from '@/components/CSVUploader';
import Dashboard from '@/components/Dashboard';
import { LoanData } from '@/utils/types';

const Index = () => {
  const [loanData, setLoanData] = useState<LoanData[]>([]);
  const [dataUploaded, setDataUploaded] = useState(false);

  const handleDataLoaded = (data: LoanData[]) => {
    setLoanData(data);
    setDataUploaded(true);
  };

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <header className="w-full bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm">
        <div className="container mx-auto py-8 px-4">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-center"
          >
            Loan Analytics Dashboard
          </motion.h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {!dataUploaded ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto mt-12"
          >
            <div className="text-center mb-12">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-2xl font-semibold mb-4"
              >
                Upload Your Loan Data
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-muted-foreground max-w-lg mx-auto"
              >
                Upload a CSV file containing loan information to generate analytics.
                The system will process the data and display key insights.
              </motion.p>
            </div>
            
            <CSVUploader onDataLoaded={handleDataLoaded} />
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-12 text-center text-sm text-muted-foreground"
            >
              <p>CSV should contain the following columns:</p>
              <p className="mt-2 font-mono text-xs bg-muted p-2 rounded-md inline-block">
                user_wallet, loan_amount, loan_repaid_amount, loan_term, time_loan_started,
                <br />
                time_loan_ended, loan_due_date, default_loan_date, is_defaulted, version
              </p>
            </motion.div>
          </motion.div>
        ) : (
          <Dashboard data={loanData} />
        )}
      </main>
      
      {dataUploaded && (
        <div className="container mx-auto px-4 py-4 flex justify-center">
          <button
            onClick={() => setDataUploaded(false)}
            className="text-sm text-primary hover:text-primary/80 underline transition-colors duration-200"
          >
            Upload another CSV file
          </button>
        </div>
      )}
    </div>
  );
};

export default Index;
