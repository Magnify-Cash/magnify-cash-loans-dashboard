// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://vixytfynzksttqwrytxc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpeHl0ZnluemtzdHRxd3J5dHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxMTk3MDcsImV4cCI6MjA1NzY5NTcwN30.Chn2XqhsWtZRMTVIUlasrLvYrTo4pK0LxoMkOO3_SO8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);