
import { LoanData } from "./types";
import { toast } from "sonner";

export const parseCSV = async (file: File): Promise<LoanData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        if (!csvText) {
          toast.error("Failed to read file content");
          reject(new Error("Failed to read file content"));
          return;
        }
        
        // Split the file into lines and get the header row
        const lines = csvText.split(/\r\n|\n/);
        const headers = lines[0].split(',').map(header => header.trim());
        
        // Process data rows
        const loans: LoanData[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue; // Skip empty lines
          
          const values = lines[i].split(',').map(value => value.trim());
          const loan: Record<string, any> = {};
          
          // Map the values to the corresponding headers
          headers.forEach((header, index) => {
            if (header === 'loan_amount' || header === 'loan_term') {
              loan[header] = parseFloat(values[index]) || 0;
            } else if (header === 'loan_repaid_amount') {
              // Handle potentially missing loan_repaid_amount
              loan[header] = values[index] ? parseFloat(values[index]) : null;
            } else if (header === 'is_defaulted') {
              loan[header] = values[index]?.toLowerCase() === 'true';
            } else {
              loan[header] = values[index] || null;
            }
          });
          
          loans.push(loan as LoanData);
        }
        
        console.log("Parsed loans:", loans);
        resolve(loans);
      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast.error("Error parsing CSV file");
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      toast.error("Error reading file");
      reject(error);
    };
    
    reader.readAsText(file);
  });
};
