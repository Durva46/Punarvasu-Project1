/**
 * backend/src/lib/storage.ts
 *
 * Supabase storage helper for private file storage ('exports' bucket).
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

export const supabaseStorage = (() => {
  const supabaseUrl = process.env.SUPABASE_URL || "https://cagqedknfchysufiwxhd.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (!supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
})();
