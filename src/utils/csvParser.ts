
import { LoanData, FileUpload } from "./types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const parseCSV = async (file: File): Promise<LoanData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
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
        let validLoans = true;
        
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
        
        console.log("Parsed loan data:", loans);
        
        // Record the file upload and store loan data
        const { data: fileUpload, error: fileUploadError } = await storeFileUpload(file.name, loans.length);
        
        if (fileUploadError) {
          console.error("Error storing file upload info:", fileUploadError);
          toast.error("Error storing file upload information");
          reject(fileUploadError);
          return;
        }
        
        // Store loans in Supabase with file upload ID
        const { error } = await storeLoansInDatabase(loans, fileUpload.id);
        
        if (error) {
          console.error("Error storing loans in database:", error);
          toast.error("Error storing loans in database");
          reject(error);
          return;
        }
        
        toast.success(`Successfully processed ${loans.length} loans`);
        console.log("Parsed and stored loans:", loans);
        
        // Return the parsed data with file upload ID
        const loansWithFileId = loans.map(loan => ({
          ...loan,
          file_upload_id: fileUpload.id
        }));
        
        resolve(loansWithFileId);
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
const storeLoansInDatabase = async (loans: LoanData[], fileUploadId: string) => {
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

  for (const batch of batches) {
    // For each loan in the batch, check if it already exists
    for (const loan of batch) {
      // Skip invalid loans
      if (!loan.user_wallet) {
        console.error("Skipping loan with missing user_wallet:", loan);
        continue;
      }
      
      const { data: existingLoan } = await supabase
        .from('loans')
        .select('id')
        .eq('user_wallet', loan.user_wallet)
        .eq('loan_amount', loan.loan_amount)
        .eq('loan_due_date', loan.loan_due_date)
        .maybeSingle();
      
      if (existingLoan) {
        // Update existing loan
        const { error: updateError } = await supabase
          .from('loans')
          .update({
            loan_repaid_amount: loan.loan_repaid_amount,
            time_loan_ended: loan.time_loan_ended,
            default_loan_date: loan.default_loan_date,
            is_defaulted: loan.is_defaulted,
            file_upload_id: loan.file_upload_id
          })
          .eq('id', existingLoan.id);
        
        if (updateError) {
          console.error("Error updating existing loan:", updateError);
          error = updateError;
          break;
        }
      } else {
        // Insert new loan
        const { error: insertError } = await supabase
          .from('loans')
          .insert(loan);
        
        if (insertError) {
          console.error("Error inserting new loan:", insertError);
          error = insertError;
          break;
        }
      }
    }
    
    if (error) break;
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
