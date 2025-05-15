
import { supabase, hasValidSession, logAuthState, refreshSession } from "@/integrations/supabase/client";
import { GymDetails } from "./types";

// Maximum retry counts for database operations
const MAX_RETRIES = 3;
const BASE_DELAY = 500; // Base delay in milliseconds for exponential backoff

/**
 * Creates a default gym for a user with improved error handling
 */
export const createDefaultGym = async (userId: string, gymName: string = 'My Gym', email: string = ''): Promise<GymDetails | null> => {
  if (!userId) {
    console.error("Cannot create gym: No user ID provided");
    return null;
  }
  
  console.log("Creating default gym for user ID:", userId);
  
  // Validate session before proceeding
  const isAuthenticated = await hasValidSession();
  if (!isAuthenticated) {
    console.error("Error creating gym: No valid session");
    
    // Try to refresh the session and try again
    const refreshed = await refreshSession();
    if (!refreshed) {
      console.error("Failed to refresh session, cannot create gym");
      return null;
    }
    
    console.log("Session refreshed, retrying gym creation");
  }
  
  // Check if a gym already exists for this user
  try {
    console.log("Checking if gym already exists for user ID:", userId);
    const { data: existingGyms, error: checkError } = await supabase
      .from('gyms')
      .select('id, name, phone, company_name, address, email')
      .eq('owner_id', userId)
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
      console.log(`Attempt ${retryCount + 1}: Creating new gym for user ID ${userId}`);
      
      // Re-verify auth session before insert
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("No valid session before inserting gym, trying to refresh");
        const refreshed = await refreshSession();
        if (!refreshed) {
          console.error("Cannot refresh session, aborting gym creation");
          return null;
        }
      }
      
      console.log("Session authenticated:", !!session?.access_token);
      
      // Insert new gym with owner_id
      const { data: newGym, error: insertError } = await supabase
        .from('gyms')
        .insert({
          owner_id: userId,
          email: email,
          name: gymName
        })
        .select('id, name, phone, company_name, address, email')
        .single();
      
      if (insertError) {
        console.error(`Attempt ${retryCount + 1}: Error creating gym:`, insertError);
        
        // If permission denied, token might have expired
        if (insertError.code === 'PGRST301' || insertError.message.includes('permission denied')) {
          console.log("Permission denied, trying to refresh token");
          await refreshSession();
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
export const ensureGymExists = async (userId: string, email: string = '', gymName: string = 'My Gym'): Promise<GymDetails | null> => {
  if (!userId) {
    console.error("Cannot ensure gym exists: No user ID provided");
    return null;
  }

  console.log("Ensuring gym exists for user ID:", userId);
  
  // Validate session before proceeding
  const isAuthenticated = await hasValidSession();
  if (!isAuthenticated) {
    console.error("Error ensuring gym exists: No valid session");
    
    // Try to refresh the session
    const refreshed = await refreshSession();
    if (!refreshed) {
      console.error("Failed to refresh session, cannot ensure gym exists");
      return null;
    }
  }
  
  // Check for existing gym (simplified retry logic)
  try {
    console.log("Checking for existing gym for user ID:", userId);
    
    const { data: existingGym, error } = await supabase
      .from('gyms')
      .select('id, name, phone, company_name, address, email')
      .eq('owner_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error("Error checking for existing gym:", error);
      
      // If permission denied, token might have expired
      if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
        console.log("Permission denied, trying to refresh token");
        await refreshSession();
        
        // Retry after token refresh
        const { data: retryGym, error: retryError } = await supabase
          .from('gyms')
          .select('id, name, phone, company_name, address, email')
          .eq('owner_id', userId)
          .maybeSingle();
          
        if (retryError) {
          console.error("Error checking for existing gym after token refresh:", retryError);
          return null;
        }
        
        if (retryGym) {
          console.log("Found gym after token refresh:", retryGym);
          return retryGym as GymDetails;
        }
      } else {
        return null;
      }
    }
    
    if (existingGym) {
      console.log("Gym already exists:", existingGym);
      return existingGym as GymDetails;
    }
    
    // No gym found, create one
    console.log("No gym found, creating default gym");
    return await createDefaultGym(userId, gymName, email);
  } catch (error) {
    console.error("Exception in ensureGymExists:", error);
    return null;
  }
};

/**
 * Gets gym ID by user ID with simplified error handling
 */
export const getGymIdByUserId = async (userId: string): Promise<string | null> => {
  if (!userId) {
    console.error("Cannot get gym ID: No user ID provided");
    return null;
  }
  
  // Validate session before proceeding
  const isAuthenticated = await hasValidSession();
  if (!isAuthenticated) {
    console.error("Error getting gym ID: No valid session");
    
    // Try to refresh the session
    const refreshed = await refreshSession();
    if (!refreshed) {
      console.error("Failed to refresh session, cannot get gym ID");
      return null;
    }
  }
  
  let retryCount = 0;
  
  while (retryCount < MAX_RETRIES) {
    try {
      console.log(`Attempt ${retryCount + 1}: Fetching gym ID for user ID:`, userId);
      
      const { data, error } = await supabase
        .from('gyms')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error(`Attempt ${retryCount + 1}: Error fetching gym ID:`, error);
        
        // If permission denied, token might have expired
        if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
          console.log("Permission denied, trying to refresh token");
          await refreshSession();
        }
        
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          console.error("Max retries reached. Failed to get gym ID.");
          return null;
        }
        
        // Wait before retrying with exponential backoff
        const delay = BASE_DELAY * Math.pow(2, retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (!data) {
        console.log(`Attempt ${retryCount + 1}: No gym found for user ID:`, userId);
        
        // Try to create a gym if none exists
        console.log("Attempting to create a default gym");
        const newGym = await createDefaultGym(userId);
        return newGym?.id || null;
      }
      
      console.log("Found gym ID:", data.id);
      return data.id;
    } catch (error) {
      console.error(`Attempt ${retryCount + 1}: Exception in getGymIdByUserId:`, error);
      retryCount++;
      
      if (retryCount >= MAX_RETRIES) {
        console.error("Max retries reached. Failed to get gym ID.");
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
      
      // If permission denied, token might have expired
      if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
        console.log("Permission denied, trying to refresh token");
        await refreshSession();
        
        // Retry after token refresh
        console.log("Retrying database access test after token refresh");
        const { data: retryData, error: retryError } = await supabase
          .from('gyms')
          .select('count(*)')
          .limit(1);
          
        if (retryError) {
          console.error("Database access test failed after token refresh:", retryError);
          return false;
        }
        
        console.log("Database access successful after token refresh:", retryData);
        return true;
      }
      
      return false;
    }
    
    console.log("Database access successful:", data);
    return true;
  } catch (e) {
    console.error("Exception testing database access:", e);
    return false;
  }
};
