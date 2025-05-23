
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import CSVUploader from '@/components/CSVUploader';
import Dashboard from '@/components/Dashboard';
import { LoanData } from '@/utils/types';
import { fetchLoansFromDatabase } from '@/utils/csvParser';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

const Index = () => {
  const [loanData, setLoanData] = useState<LoanData[]>([]);
  const [dataUploaded, setDataUploaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);

  // Fetch loan data from database on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        const progressCallback = (percent: number, message: string) => {
          setLoadProgress(percent);
          setProcessingStatus(message);
        };
        
        const data = await fetchLoansFromDatabase(progressCallback);
        console.log("Initial data fetch complete:", data.length, "loans");
        setLoanData(data);
        
        // Auto-transition to dashboard if we have data
        if (data.length > 0) {
          console.log("Setting dataUploaded to true based on existing data");
          setDataUploaded(true);
        }
      } catch (error) {
        console.error("Error fetching loan data:", error);
        toast.error("Failed to fetch loan data");
        setLoadError("Failed to load data from the database. Please try again later.");
      } finally {
        setIsLoading(false);
        setInitialLoadComplete(true);
      }
    };

    fetchData();
  }, []); // Only run once on mount

  const handleDataLoaded = (data: LoanData[]) => {
    console.log("Data loaded, transitioning to dashboard", data.length);
    // Immediately show the dashboard with the new data
    setLoanData(data);
    setDataUploaded(true);
    setUploadProgress(0);
    setProcessingStatus('');
    toast.success(`Successfully processed ${data.length} loans`);
  };

  const handleUploadProgress = (progress: number, status: string) => {
    setUploadProgress(progress);
    setProcessingStatus(status);
  };

  const resetToUploader = () => {
    setDataUploaded(false);
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
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground mb-4">{processingStatus || "Loading loan data..."}</p>
            {loadProgress > 0 && (
              <div className="w-64 mt-2">
                <Progress value={loadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 text-center">{loadProgress}% complete</p>
              </div>
            )}
          </div>
        ) : loadError ? (
          <div className="max-w-3xl mx-auto mt-12">
            <Alert variant="destructive" className="mb-8">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
            <div className="text-center">
              <CSVUploader 
                onDataLoaded={handleDataLoaded} 
                onProgress={handleUploadProgress}
              />
            </div>
          </div>
        ) : !dataUploaded && initialLoadComplete ? (
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
            
            <CSVUploader 
              onDataLoaded={handleDataLoaded} 
              onProgress={handleUploadProgress}
            />
            
            {uploadProgress > 0 && (
              <div className="mt-8">
                <p className="text-sm text-center mb-2">{processingStatus}</p>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300 ease-out" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-center mt-2 text-muted-foreground">
                  {uploadProgress < 100 ? 
                    `Processing: ${uploadProgress}%` : 
                    'Finalizing upload...'
                  }
                </p>
              </div>
            )}
            
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
        ) : dataUploaded ? (
          <Dashboard data={loanData} />
        ) : null}
      </main>
      
      {dataUploaded && (
        <div className="container mx-auto px-4 py-4 flex justify-center">
          <button
            onClick={resetToUploader}
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
