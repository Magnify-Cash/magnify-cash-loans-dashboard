import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Upload, File, Loader2, AlertCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseCSV } from '@/utils/csvParser';
import { LoanData } from '@/utils/types';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CSVUploaderProps {
  onDataLoaded: (data: LoanData[]) => void;
  onProgress?: (progress: number, status: string) => void;
}

const CSVUploader = ({ onDataLoaded, onProgress }: CSVUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const updateProgress = (value: number, status: string) => {
    setProgress(value);
    setProcessingStep(status);
    if (onProgress) {
      onProgress(value, status);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const resetState = () => {
    setFileName(null);
    setIsLoading(false);
    setValidationError(null);
    updateProgress(0, '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setValidationError(null);
    
    setIsLoading(true);
    setFileName(file.name);
    updateProgress(5, 'Preparing file...');

    try {
      console.log("Processing file:", file.name);
      
      const progressCallback = (percent: number, message: string) => {
        updateProgress(percent, message);
      };
      
      const processingPromise = parseCSV(file, progressCallback);
      
      const timeoutPromise = new Promise<LoanData[]>((_, reject) => {
        setTimeout(() => reject(new Error('Processing timed out after 30 seconds')), 30000);
      });
      
      const loanData = await Promise.race([processingPromise, timeoutPromise]);
      
      if (loanData && loanData.length > 0) {
        updateProgress(100, 'Finalizing...');
        
        setTimeout(() => {
          onDataLoaded(loanData);
        }, 500);
      } else {
        toast.error('No valid loan data found in the CSV file');
        setIsLoading(false);
        updateProgress(0, '');
        setValidationError('The CSV file contains no valid loan data. Please check the file format and try again.');
      }
    } catch (error) {
      console.error('Error processing CSV:', error);
      let errorMessage = 'Failed to process CSV file.';
      
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          errorMessage = 'Processing timed out. Try with a smaller file or try again later.';
        } else if (error.message.includes('required fields')) {
          errorMessage = 'Some rows have missing required fields. Please check your CSV file and ensure all rows have the required fields.';
        } else if (error.message.includes('required headers')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      setIsLoading(false);
      updateProgress(0, '');
      setValidationError(errorMessage);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {validationError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Processing CSV</AlertTitle>
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
      
      <div
        className={`border-2 border-dashed border-primary/30 rounded-lg p-12 transition-all duration-300 ${
          isDragging ? 'bg-primary/5 border-primary/50' : 'bg-background hover:bg-primary/5'
        } ${validationError ? 'border-destructive/30' : ''} file-drop-area`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".csv"
          className="hidden"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center justify-center transition-all duration-300 text-center">
          {isLoading ? (
            <div className="animate-pulse-soft">
              <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
              <p className="text-muted-foreground">Processing {fileName}...</p>
              
              {progress > 0 && (
                <div className="mt-4 w-full max-w-xs">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs mt-2 text-muted-foreground">{processingStep}</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                {fileName ? (
                  <File className="w-8 h-8 text-primary" />
                ) : (
                  <Upload className="w-8 h-8 text-primary" />
                )}
              </div>
              
              <h3 className="text-xl font-medium mb-2">
                {fileName ? 'File uploaded' : 'Upload CSV file'}
              </h3>
              
              {fileName ? (
                <p className="text-sm text-muted-foreground mb-4">
                  {fileName}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop your file here, or click to browse
                </p>
              )}
              
              <Button 
                onClick={validationError ? resetState : handleButtonClick}
                variant="outline"
                className="relative overflow-hidden group"
                disabled={isLoading}
              >
                <span className="absolute inset-0 w-full h-full transition-all duration-300 ease-out transform translate-x-full bg-primary group-hover:translate-x-0"></span>
                <span className="relative transition-colors duration-300 ease-out group-hover:text-white">
                  {validationError ? 'Try Again' : fileName ? 'Upload another file' : 'Select CSV file'}
                </span>
              </Button>
            </>
          )}
        </div>
      </div>
      
      {!isLoading && !validationError && fileName && (
        <div className="mt-4 flex justify-center">
          <p className="text-sm text-amber-600">
            Your file has been uploaded. Waiting for processing to complete...
          </p>
        </div>
      )}

      <div className="mt-6 bg-muted/50 p-4 rounded-lg border border-border">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium">CSV Format Guide</h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Your CSV file should include columns with these or similar names. We attempt to match various common names for these fields.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex gap-1 flex-wrap mt-2">
          {['user_wallet', 'loan_amount', 'loan_term', 'loan_due_date'].map((field) => (
            <span key={field} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
              {field}
            </span>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          Additional recommended columns: loan_repaid_amount, time_loan_started, time_loan_ended, default_loan_date, is_defaulted, version
        </p>

        <div className="mt-3 text-xs text-muted-foreground">
          <strong>Accepted column variations:</strong>
          <ul className="mt-1 pl-4 space-y-1 list-disc">
            <li><span className="font-semibold">user_wallet</span>: wallet, address</li>
            <li><span className="font-semibold">time_loan_started</span>: date_loan_started, loan_started, start_date</li>
            <li><span className="font-semibold">time_loan_ended</span>: date_loan_ended, loan_ended, end_date</li>
            <li><span className="font-semibold">default_loan_date</span>: date_loan_defaulted, defaulted_date</li>
          </ul>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          <strong>Example CSV first line:</strong><br />
          <code className="font-mono bg-muted p-1 text-[10px] block mt-1 rounded-sm overflow-x-auto whitespace-nowrap">
            user_wallet,loan_amount,loan_term,loan_due_date,loan_repaid_amount,time_loan_started,time_loan_ended,default_loan_date,is_defaulted,version
          </code>
        </div>
      </div>
    </div>
  );
};

export default CSVUploader;
