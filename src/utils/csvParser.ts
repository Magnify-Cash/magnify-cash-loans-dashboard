
import { LoanData } from "./types";
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
              loan[header] = values[index] || null;
            }
          });
          
          loans.push(loan as LoanData);
        }
        
        console.log("Parsed loan data:", loans);
        
        // Store loans in Supabase
        const { error } = await storeLoansInDatabase(loans);
        
        if (error) {
          console.error("Error storing loans in database:", error);
          toast.error("Error storing loans in database");
          reject(error);
          return;
        }
        
        toast.success(`Successfully processed ${loans.length} loans`);
        console.log("Parsed and stored loans:", loans);
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

// Function to store loans in Supabase
const storeLoansInDatabase = async (loans: LoanData[]) => {
  // First, clear existing loans to avoid duplicates
  const { error: deleteError } = await supabase
    .from('loans')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

  if (deleteError) {
    console.error("Error clearing existing loans:", deleteError);
    return { error: deleteError };
  }

  // Map loan data to match database schema
  const loansToInsert = loans.map(loan => ({
    user_wallet: loan.user_wallet,
    loan_amount: loan.loan_amount,
    loan_repaid_amount: loan.loan_repaid_amount,
    loan_term: loan.loan_term,
    time_loan_started: loan.time_loan_started,
    time_loan_ended: loan.time_loan_ended,
    loan_due_date: loan.loan_due_date,
    default_loan_date: loan.default_loan_date,
    is_defaulted: loan.is_defaulted,
    version: loan.version
  }));

  // Insert loans in batches to avoid request size limitations
  const batchSize = 100;
  const batches = [];
  
  for (let i = 0; i < loansToInsert.length; i += batchSize) {
    batches.push(loansToInsert.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const { error } = await supabase
      .from('loans')
      .insert(batch);
    
    if (error) {
      console.error("Error inserting loan batch:", error);
      return { error };
    }
  }

  return { error: null };
};

// Function to fetch all loans from Supabase
export const fetchLoansFromDatabase = async (): Promise<LoanData[]> => {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*');
      
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
