import { LoanData, FileUpload } from "./types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Type for progress callback
type ProgressCallback = (percent: number, message: string) => void;

// Enhanced column name mapping to handle more variations
const COLUMN_MAPPINGS: Record<string, string[]> = {
  user_wallet: ['user_wallet', 'wallet', 'user wallet', 'address', 'wallet_address', 'user_address', 'wallet address'],
  loan_amount: ['loan_amount', 'amount', 'loan amount', 'principal', 'loan_principal', 'loan principal', 'value'],
  loan_term: ['loan_term', 'term', 'duration', 'period', 'loan_duration', 'loan duration', 'days', 'loan_days'],
  loan_due_date: ['loan_due_date', 'due_date', 'due date', 'maturity_date', 'maturity date', 'expiry_date', 'expiry date'],
  loan_repaid_amount: ['loan_repaid_amount', 'repaid_amount', 'repaid amount', 'paid_amount', 'paid amount', 'repayment', 'paid'],
  time_loan_started: ['time_loan_started', 'date_loan_started', 'loan_started', 'start_date', 'started', 'inception_date', 'inception', 'origination_date'],
  time_loan_ended: ['time_loan_ended', 'date_loan_ended', 'loan_ended', 'end_date', 'ended', 'termination_date', 'repayment_date', 'completion_date'],
  default_loan_date: ['default_loan_date', 'date_loan_defaulted', 'defaulted_date', 'default_date', 'loan_defaulted', 'defaulted at', 'default_time'],
  is_defaulted: ['is_defaulted', 'defaulted', 'is defaulted', 'default', 'loan_defaulted', 'has_defaulted', 'in_default'],
  version: ['version', 'ver', 'loan_version', 'loan version', 'v']
};

// Debug helper to log matching process
const debugHeaderMatching = (originalHeaders: string[], headerMap: Record<number, string>) => {
  console.log("CSV Header Debug:");
  console.log("Original headers:", originalHeaders);
  console.log("Mapped headers:", headerMap);
  
  const unmatchedHeaders = originalHeaders.filter((_, index) => !headerMap[index]);
  console.log("Unmatched headers:", unmatchedHeaders.length > 0 ? unmatchedHeaders : "None");
  
  const matchedFields = Object.values(headerMap);
  console.log("Required fields found:", 
    ['user_wallet', 'loan_amount', 'loan_term', 'loan_due_date'].map(field => 
      `${field}: ${matchedFields.includes(field) ? 'YES' : 'NO'}`
    )
  );
};

// Normalize header name by removing spaces, special chars, and lowercasing
const normalizeHeaderName = (header: string): string => {
  return header.toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, '_')  // Replace spaces, underscores, hyphens with single underscore
    .replace(/[^\w]/g, '');    // Remove any non-word characters
};

// Find the standardized field name based on various possible input names
const findStandardFieldName = (header: string): string | null => {
  const normalizedHeader = normalizeHeaderName(header);
  
  // Debug header normalization
  console.log(`Normalizing header: "${header}" -> "${normalizedHeader}"`);
  
  for (const [standardField, variations] of Object.entries(COLUMN_MAPPINGS)) {
    const normalizedVariations = variations.map(v => normalizeHeaderName(v));
    if (normalizedVariations.includes(normalizedHeader)) {
      console.log(`Matched header "${header}" to standard field "${standardField}"`);
      return standardField;
    }
  }
  
  // No match found
  console.log(`No match found for header: "${header}"`);
  return null;
};

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
        if (lines.length < 2) {
          reject(new Error("CSV file is empty or has only headers"));
          return;
        }
        
        const headerRow = lines[0];
        const originalHeaders = headerRow.split(',').map(header => header.trim());
        
        console.log("Processing CSV with headers:", originalHeaders);
        
        // Map input headers to standard field names
        const headerMap: Record<number, string> = {};
        const missingRequiredHeaders: string[] = [];
        
        // Track which required fields were found
        const requiredFields = ['user_wallet', 'loan_amount', 'loan_term', 'loan_due_date'];
        const foundRequiredFields = new Set<string>();
        
        // Build header mapping
        originalHeaders.forEach((header, index) => {
          const standardField = findStandardFieldName(header);
          if (standardField) {
            headerMap[index] = standardField;
            if (requiredFields.includes(standardField)) {
              foundRequiredFields.add(standardField);
            }
          } else {
            console.warn(`Unrecognized header: "${header}"`);
          }
        });
        
        // Log the header mapping for debugging
        debugHeaderMatching(originalHeaders, headerMap);
        
        // Check for missing required headers
        requiredFields.forEach(field => {
          if (!foundRequiredFields.has(field)) {
            missingRequiredHeaders.push(field);
          }
        });
        
        // If all required headers are missing, we can't continue
        if (missingRequiredHeaders.length === requiredFields.length) {
          const errorMsg = `CSV is missing all required fields. Required: ${requiredFields.join(', ')}`;
          console.error(errorMsg);
          
          const foundHeaders = Object.values(headerMap).join(', ');
          const detailedError = `${errorMsg}\n\nFound fields: ${foundHeaders || 'None'}\n\nPlease ensure your CSV contains the required columns or their variations.`;
          
          reject(new Error(detailedError));
          return;
        }
        
        // If some required headers are missing, show warning but continue with available data
        if (missingRequiredHeaders.length > 0) {
          const warningMsg = `Warning: CSV is missing some required fields: ${missingRequiredHeaders.join(', ')}. Processing will continue with available data.`;
          console.warn(warningMsg);
          toast.warning(warningMsg);
        }
        
        // Progress calculation variables
        const totalLines = lines.length - 1; // Minus header
        let processedLines = 0;
        let invalidRows = 0;
        let validRows = 0;
        
        // Process data rows
        const loans: LoanData[] = [];
        let hasValidationErrors = false;
        let invalidRowNumbers: number[] = [];
        
        progressCallback?.(20, "Validating loan data...");
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue; // Skip empty lines
          
          const values = lines[i].split(',').map(value => value.trim());
          const loan: Record<string, any> = {};
          
          // Map the values to the corresponding standardized field names
          values.forEach((value, index) => {
            const standardField = headerMap[index];
            if (!standardField) return; // Skip columns we don't recognize
            
            if (standardField === 'loan_amount' || standardField === 'loan_term') {
              loan[standardField] = parseFloat(value) || 0;
            } else if (standardField === 'loan_repaid_amount') {
              // Handle potentially missing loan_repaid_amount
              loan[standardField] = value ? parseFloat(value) : null;
            } else if (standardField === 'is_defaulted') {
              // Convert string "TRUE"/"FALSE" to actual boolean values
              loan[standardField] = value?.toLowerCase() === 'true';
            } else if (
              standardField === 'default_loan_date' || 
              standardField === 'time_loan_ended' ||
              standardField === 'loan_due_date' ||
              standardField === 'time_loan_started'
            ) {
              // Convert empty strings to null for date fields
              loan[standardField] = value && value !== "" ? value : null;
            } else {
              loan[standardField] = value || "";
            }
          });
          
          // Fill in default values for missing required fields
          requiredFields.forEach(field => {
            if (!loan[field] && field !== 'user_wallet') { // user_wallet is still required
              if (field === 'loan_amount' || field === 'loan_term') {
                loan[field] = 0;
              } else if (field === 'loan_due_date') {
                // Set a far future date for missing due date
                loan[field] = new Date(2099, 12, 31).toISOString().split('T')[0];
              }
            }
          });
          
          // Skip rows missing user_wallet as it's still required
          if (!loan.user_wallet) {
            console.error(`Row ${i} is missing required user_wallet field`);
            hasValidationErrors = true;
            invalidRowNumbers.push(i);
            invalidRows++;
            continue;
          }
          
          // Initialize missing non-required fields
          if (loan.is_defaulted === undefined) loan.is_defaulted = false;
          if (!loan.loan_repaid_amount) loan.loan_repaid_amount = null;
          if (!loan.version) loan.version = "";
          
          validRows++;
          loans.push(loan as LoanData);
          
          // Update progress periodically
          processedLines++;
          if (processedLines % Math.max(1, Math.floor(totalLines / 20)) === 0 || 
              processedLines === totalLines) {
            const percent = Math.min(20 + Math.floor((processedLines / totalLines) * 30), 50);
            progressCallback?.(percent, `Processed ${processedLines}/${totalLines} rows (${validRows} valid, ${invalidRows} invalid)...`);
          }
        }
        
        // If we have no valid loans but we have validation errors, reject with specific message
        if (loans.length === 0) {
          if (hasValidationErrors) {
            const errorMsg = `No valid loan data found. ${invalidRows} rows had validation errors.`;
            console.error(errorMsg);
            if (invalidRowNumbers.length > 0) {
              console.error(`Invalid rows: ${invalidRowNumbers.slice(0, 10).join(', ')}${
                invalidRowNumbers.length > 10 ? ` and ${invalidRowNumbers.length - 10} more` : ''
              }`);
            }
            reject(new Error(errorMsg));
            return;
          } else {
            const errorMsg = "No loan data found in CSV file";
            toast.error(errorMsg);
            reject(new Error(errorMsg));
            return;
          }
        }
        
        // If we have some valid data but also validation errors, continue with warning
        if (hasValidationErrors && loans.length > 0) {
          toast.warning(`${invalidRows} rows had validation errors and were skipped.`);
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
      // Using the unique constraint we just added for the upsert operation
      const { error: batchError } = await supabase
        .from('loans')
        .upsert(batch, {
          onConflict: 'user_wallet,loan_amount,loan_due_date', // This will now work with our new constraint
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
