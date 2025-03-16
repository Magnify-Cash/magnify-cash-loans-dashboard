
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { FileUpload } from '@/utils/types';
import { fetchLatestFileUpload } from '@/utils/csvParser';

interface FileUploadBannerProps {
  className?: string;
}

const FileUploadBanner = ({ className = '' }: FileUploadBannerProps) => {
  const [fileUpload, setFileUpload] = useState<FileUpload | null>(null);
  
  useEffect(() => {
    const getLatestFileUpload = async () => {
      const upload = await fetchLatestFileUpload();
      setFileUpload(upload);
    };
    
    getLatestFileUpload();
  }, []);
  
  if (!fileUpload) return null;
  
  // Format the upload date
  const formattedDate = format(new Date(fileUpload.upload_date), 'MMM d, yyyy - h:mm a');
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-gradient-to-r from-primary/10 to-primary/5 backdrop-blur-sm p-3 rounded-lg mb-4 ${className}`}
    >
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="font-medium">Currently Analyzing:</span>
          <span>{fileUpload.file_name}</span>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Uploaded on {formattedDate}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default FileUploadBanner;
