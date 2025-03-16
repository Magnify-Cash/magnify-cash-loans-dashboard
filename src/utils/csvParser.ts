
import { LoanData, FileUpload } from "./types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Type for progress callback
type ProgressCallback = (percent: number, message: string) => void;

export const parseCSV = async (
  file: File, 
  progressCallback?: ProgressCallback
): Promise<LoanData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        // Update progress
        progressCallback?.(10, "Parsing CSV file...");
        
        const csvText = event.target?.result as string;
        if (!csvText) {
          toast.error("Failed to read file content");
          reject(new Error("Failed to read file content"));
          return;
        }
        
        // Split the file into lines and get the header row
        const lines = csvText.split(/\r\n|\n/);
        const headers = lines[0].split(',').map(header => header.trim());
        
        // Progress calculation variables
        const totalLines = lines.length - 1; // Minus header
        let processedLines = 0;
        
        // Process data rows
        const loans: LoanData[] = [];
        let validLoans = true;
        
        progressCallback?.(20, "Validating loan data...");
        
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
              // Convert string "TRUE"/"FALSE" to actual boolean values
              loan[header] = values[index]?.toLowerCase() === 'true';
            } else if (header === 'default_loan_date' || header === 'time_loan_ended') {
              // Convert empty strings to null for date fields
              loan[header] = values[index] && values[index] !== "" ? values[index] : null;
            } else {
              loan[header] = values[index] || "";
            }
          });
          
          // Validate required fields
          if (!loan.user_wallet) {
            console.error(`Row ${i} is missing required user_wallet field`);
            toast.error(`Row ${i} is missing required user_wallet field`);
            validLoans = false;
          }
          
          loans.push(loan as LoanData);
          
          // Update progress periodically (every 5% or at least every 100 rows)
          processedLines++;
          if (processedLines % Math.max(1, Math.floor(totalLines / 20)) === 0 || 
              processedLines === totalLines) {
            const percent = Math.min(20 + Math.floor((processedLines / totalLines) * 30), 50);
            progressCallback?.(percent, `Processed ${processedLines}/${totalLines} loans...`);
          }
        }
        
        if (!validLoans) {
          reject(new Error("Some rows have missing required fields"));
          return;
        }
        
        if (loans.length === 0) {
          toast.error("No valid loan data found in CSV");
          reject(new Error("No valid loan data found in CSV"));
          return;
        }
        
        console.log("Parsed loan data:", loans.length, "loans");
        progressCallback?.(50, "Storing file information...");
        
        // Record the file upload and store loan data
        try {
          // Start file upload tracking
          const { data: fileUpload, error: fileUploadError } = await storeFileUpload(file.name, loans.length);
          
          if (fileUploadError) {
            console.error("Error storing file upload info:", fileUploadError);
            toast.error("Error storing file upload information");
            reject(fileUploadError);
            return;
          }
          
          progressCallback?.(60, "Uploading loans to database...");
          
          // Store loans in Supabase with file upload ID
          const result = await storeLoansInDatabase(loans, fileUpload.id, progressCallback);
          
          if (result.error) {
            console.error("Error storing loans in database:", result.error);
            toast.error("Error storing loans in database");
            reject(result.error);
            return;
          }
          
          progressCallback?.(95, "Finalizing upload...");
          
          console.log("Successfully stored", loans.length, "loans in database");
          
          // Return the parsed data with file upload ID
          const loansWithFileId = loans.map(loan => ({
            ...loan,
            file_upload_id: fileUpload.id
          }));
          
          resolve(loansWithFileId);
        } catch (error) {
          console.error("Database error:", error);
          reject(error);
        }
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

// Function to store file upload information
const storeFileUpload = async (fileName: string, recordCount: number): Promise<{ data: FileUpload, error: any }> => {
  const { data, error } = await supabase
    .from('file_uploads')
    .insert({
      file_name: fileName,
      record_count: recordCount
    })
    .select()
    .single();
  
  return { data, error };
};

// Function to store loans in Supabase with update/insert logic
const storeLoansInDatabase = async (
  loans: LoanData[], 
  fileUploadId: string,
  progressCallback?: ProgressCallback
) => {
  // Map loan data to match database schema
  const loansToUpsert = loans.map(loan => ({
    user_wallet: loan.user_wallet,
    loan_amount: loan.loan_amount,
    loan_repaid_amount: loan.loan_repaid_amount,
    loan_term: loan.loan_term,
    time_loan_started: loan.time_loan_started,
    time_loan_ended: loan.time_loan_ended,
    loan_due_date: loan.loan_due_date,
    default_loan_date: loan.default_loan_date,
    is_defaulted: loan.is_defaulted,
    version: loan.version,
    file_upload_id: fileUploadId
  }));

  // Process loans in batches to avoid request size limitations
  const batchSize = 100;
  const batches = [];
  
  for (let i = 0; i < loansToUpsert.length; i += batchSize) {
    batches.push(loansToUpsert.slice(i, i + batchSize));
  }

  let error = null;
  let processedCount = 0;
  const totalCount = loansToUpsert.length;

  // Process each batch in sequence
  for (const [batchIndex, batch] of batches.entries()) {
    try {
      // Batch upsert approach
      const { error: batchError } = await supabase
        .from('loans')
        .upsert(batch, {
          onConflict: 'user_wallet,loan_amount,loan_due_date',
          ignoreDuplicates: false
        });
      
      if (batchError) {
        console.error("Error upserting batch:", batchError);
        error = batchError;
        break;
      }
      
      // Update progress
      processedCount += batch.length;
      const percent = 60 + Math.floor((processedCount / totalCount) * 30);
      progressCallback?.(percent, `Storing loans in database (${processedCount}/${totalCount})...`);
      
    } catch (err) {
      console.error("Error processing batch:", err);
      error = err;
      break;
    }
  }

  return { error };
};

// Function to fetch all loans from Supabase
export const fetchLoansFromDatabase = async (): Promise<LoanData[]> => {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .order('loan_due_date', { ascending: true });
      
    if (error) {
      console.error("Error fetching loans:", error);
      toast.error("Error fetching loans from database");
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log("No loans found in the database");
      return [];
    }
    
    console.log("Fetched loans from database:", data.length);
    return data as LoanData[];
  } catch (error) {
    console.error("Error in fetchLoansFromDatabase:", error);
    toast.error("Failed to fetch loan data");
    throw error;
  }
};

// Function to fetch the latest file upload
export const fetchLatestFileUpload = async (): Promise<FileUpload | null> => {
  try {
    const { data, error } = await supabase
      .from('file_uploads')
      .select('*')
      .order('upload_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching latest file upload:", error);
      return null;
    }
    
    return data as FileUpload;
  } catch (error) {
    console.error("Error in fetchLatestFileUpload:", error);
    return null;
  }
};
