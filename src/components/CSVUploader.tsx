
import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Upload, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseCSV } from '@/utils/csvParser';
import { LoanData } from '@/utils/types';

interface CSVUploaderProps {
  onDataLoaded: (data: LoanData[]) => void;
}

const CSVUploader = ({ onDataLoaded }: CSVUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const processFile = async (file: File) => {
    // Check file extension
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);

    try {
      const loanData = await parseCSV(file);
      onDataLoaded(loanData);
      toast.success('CSV file processed successfully');
    } catch (error) {
      console.error('Error processing CSV:', error);
      toast.error('Failed to process CSV file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`file-drop-area ${isDragging ? 'drag-active' : ''}`}
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
        />
        
        <div className="flex flex-col items-center justify-center transition-all duration-300 text-center">
          {isLoading ? (
            <div className="animate-pulse-soft">
              <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
              <p className="text-muted-foreground">Processing {fileName}...</p>
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
                onClick={handleButtonClick}
                variant="outline"
                className="relative overflow-hidden group"
              >
                <span className="absolute inset-0 w-full h-full transition-all duration-300 ease-out transform translate-x-full bg-primary group-hover:translate-x-0"></span>
                <span className="relative transition-colors duration-300 ease-out group-hover:text-white">
                  {fileName ? 'Upload another file' : 'Select CSV file'}
                </span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVUploader;
