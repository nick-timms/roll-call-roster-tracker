
import { supabase, hasValidSession, logAuthState } from "@/integrations/supabase/client";
import { GymDetails } from "./types";

// Maximum retry counts for database operations
const MAX_RETRIES = 3;
const BASE_DELAY = 500; // Base delay in milliseconds for exponential backoff

/**
 * Creates a default gym for a user with improved error handling
 */
export const createDefaultGym = async (email: string, gymName: string = 'My Gym'): Promise<GymDetails | null> => {
  if (!email) {
    console.error("Cannot create gym: No email provided");
    return null;
  }
  
  console.log("Creating default gym for:", email);
  
  // Validate session before proceeding
  const isAuthenticated = await hasValidSession();
  if (!isAuthenticated) {
    console.error("Error creating gym: No valid session");
    return null;
  }
  
  // Check if a gym already exists for this email
  try {
    console.log("Checking if gym already exists for email:", email);
    const { data: existingGyms, error: checkError } = await supabase
      .from('gyms')
      .select('id, name, phone, company_name, address, email')
      .eq('email', email)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking for existing gym:", checkError);
      return null;
    }
    
    // If gym already exists, return it
    if (existingGyms) {
      console.log("Gym already exists:", existingGyms);
      return existingGyms as GymDetails;
    }
  } catch (error) {
    console.error("Network error checking for existing gym:", error);
  }

  // Create a new gym with retry logic
  let retryCount = 0;
  
  while (retryCount < MAX_RETRIES) {
    try {
      console.log(`Attempt ${retryCount + 1}: Creating new gym for email ${email}`);
      
      // Re-verify auth session before insert
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No valid session before inserting gym");
        return null;
      }
      
      console.log("Session authenticated:", !!session.access_token);
      
      const { data: newGym, error: insertError } = await supabase
        .from('gyms')
        .insert({
          email: email,
          name: gymName
        })
        .select('id, name, phone, company_name, address, email')
        .single();
      
      if (insertError) {
        console.error(`Attempt ${retryCount + 1}: Error creating gym:`, insertError);
        
        // If error is due to unique constraint, try to fetch the gym
        if (insertError.code === '23505') {
          console.log("Gym may already exist due to unique constraint violation");
          const { data: existingGym } = await supabase
            .from('gyms')
            .select('id, name, phone, company_name, address, email')
            .eq('email', email)
            .maybeSingle();
            
          if (existingGym) {
            console.log("Found existing gym after insert error:", existingGym);
            return existingGym as GymDetails;
          }
        }
        
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          console.error("Max retries reached. Failed to create gym.");
          return null;
        }
        
        // Wait before retrying with exponential backoff
        const delay = BASE_DELAY * Math.pow(2, retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      console.log("Created new gym:", newGym);
      return newGym as GymDetails;
    } catch (error) {
      console.error(`Attempt ${retryCount + 1}: Network error creating gym:`, error);
      retryCount++;
      
      if (retryCount >= MAX_RETRIES) {
        console.error("Max retries reached. Failed to create gym.");
        return null;
      }
      
      // Wait before retrying with exponential backoff
      const delay = BASE_DELAY * Math.pow(2, retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return null;
};

/**
 * Ensures a gym exists for a user, creating one if needed
 */
export const ensureGymExists = async (email: string, gymName: string = 'My Gym'): Promise<GymDetails | null> => {
  if (!email) {
    console.error("Cannot ensure gym exists: No email provided");
    return null;
  }

  console.log("Ensuring gym exists for:", email);
  
  // Validate session before proceeding
  const isAuthenticated = await hasValidSession();
  if (!isAuthenticated) {
    console.error("Error ensuring gym exists: No valid session");
    return null;
  }
  
  // Check for existing gym (simplified retry logic)
  try {
    console.log("Checking for existing gym for email:", email);
    
    const { data: existingGym, error } = await supabase
      .from('gyms')
      .select('id, name, phone, company_name, address, email')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error("Error checking for existing gym:", error);
      return null;
    }
    
    if (existingGym) {
      console.log("Gym already exists:", existingGym);
      return existingGym as GymDetails;
    }
    
    // No gym found, create one
    console.log("No gym found, creating default gym");
    return await createDefaultGym(email, gymName);
  } catch (error) {
    console.error("Exception in ensureGymExists:", error);
    return null;
  }
};

/**
 * Gets gym ID by email with simplified error handling
 */
export const getGymIdByEmail = async (email: string): Promise<string | null> => {
  if (!email) {
    console.error("Cannot get gym ID: No email provided");
    return null;
  }
  
  // Validate session before proceeding
  const isAuthenticated = await hasValidSession();
  if (!isAuthenticated) {
    console.error("Error getting gym ID: No valid session");
    return null;
  }
  
  try {
    console.log("Fetching gym ID for email:", email);
    
    const { data, error } = await supabase
      .from('gyms')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching gym ID:", error);
      return null;
    }
    
    if (!data) {
      console.log("No gym found for email:", email);
      
      // Try to create a gym if none exists
      console.log("Attempting to create a default gym");
      const newGym = await createDefaultGym(email);
      return newGym?.id || null;
    }
    
    console.log("Found gym ID:", data.id);
    return data.id;
  } catch (error) {
    console.error("Exception in getGymIdByEmail:", error);
    return null;
  }
};

/**
 * Utility function to debug database access
 */
export const testDatabaseAccess = async (): Promise<boolean> => {
  try {
    console.log("Testing database access...");
    
    // Validate session
    const isAuthenticated = await hasValidSession();
    if (!isAuthenticated) {
      console.error("No valid session for database test");
      return false;
    }
    
    // Try a simple select query
    const { data, error } = await supabase
      .from('gyms')
      .select('count(*)')
      .limit(1);
      
    if (error) {
      console.error("Database access test failed:", error);
      return false;
    }
    
    console.log("Database access successful:", data);
    return true;
  } catch (e) {
    console.error("Exception testing database access:", e);
    return false;
  }
};
