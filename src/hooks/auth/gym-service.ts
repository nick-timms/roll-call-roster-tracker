
import { supabase, hasValidSession, logAuthState } from "@/integrations/supabase/client";
import { GymDetails } from "./types";

// Maximum retry counts for database operations
const MAX_RETRIES = 3;
const BASE_DELAY = 500; // Base delay in milliseconds for exponential backoff

/**
 * Creates a default gym for a user
 */
export const createDefaultGym = async (email: string, gymName: string = 'My Gym'): Promise<GymDetails | null> => {
  try {
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
    
    // Log auth state for debugging
    await logAuthState();
    
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
        if (checkError.code === 'PGRST116') {
          console.error("RLS policy rejected the query - auth issue");
        }
        return null;
      }
      
      // If gym already exists, return it
      if (existingGyms) {
        console.log("Gym already exists:", existingGyms);
        return existingGyms as GymDetails;
      }
    } catch (error) {
      console.error("Network error checking for existing gym:", error);
      return null;
    }

    // Create a new gym with retry logic
    let retryCount = 0;
    
    while (retryCount < MAX_RETRIES) {
      try {
        console.log(`Attempt ${retryCount + 1}: Creating new gym for email ${email}`);
        
        // Re-verify auth session before insert
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          console.error("No valid session before inserting gym");
          return null;
        }
        
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
          
          // Check if it's a foreign key constraint or unique violation
          if (insertError.code === '23505' || insertError.code === '23503') {
            // Try to fetch the gym that may have been created
            const { data: existingGym } = await supabase
              .from('gyms')
              .select('id, name, phone, company_name, address, email')
              .eq('email', email)
              .maybeSingle();
              
            if (existingGym) {
              console.log("Found existing gym after insert error:", existingGym);
              return existingGym as GymDetails;
            }
          } else if (insertError.code === 'PGRST116') {
            console.error("Row-level security prevented the insert operation");
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
  } catch (error) {
    console.error("Error in createDefaultGym:", error);
    return null;
  }
};

/**
 * Ensures a gym exists for a user, creating one if needed
 */
export const ensureGymExists = async (email: string, gymName: string = 'My Gym'): Promise<GymDetails | null> => {
  try {
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
    
    // Log auth state for debugging
    await logAuthState();
    
    // Check if a gym already exists for this email with retry logic
    let retryCount = 0;
    
    while (retryCount < MAX_RETRIES) {
      try {
        console.log(`Attempt ${retryCount + 1}: Checking for existing gym for email ${email}`);
        
        // Re-verify auth session before query
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          console.error("No valid session before querying gym");
          return null;
        }
        
        const { data: existingGyms, error: checkError } = await supabase
          .from('gyms')
          .select('id, name, phone, company_name, address, email')
          .eq('email', email)
          .maybeSingle();
        
        if (checkError) {
          console.error(`Attempt ${retryCount + 1}: Error checking for existing gym:`, checkError);
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
            console.error("Max retries reached. Failed to check for existing gym.");
            return null;
          }
          
          // Wait before retrying with exponential backoff
          const delay = BASE_DELAY * Math.pow(2, retryCount - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If gym already exists, return it
        if (existingGyms) {
          console.log("Gym already exists:", existingGyms);
          return existingGyms as GymDetails;
        }
        
        // If no gym exists, create one
        console.log("No gym found, creating default gym");
        return await createDefaultGym(email, gymName);
      } catch (error) {
        console.error(`Attempt ${retryCount + 1}: Network error checking for existing gym:`, error);
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          console.error("Max retries reached. Failed to check for existing gym.");
          return null;
        }
        
        // Wait before retrying with exponential backoff
        const delay = BASE_DELAY * Math.pow(2, retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error in ensureGymExists:", error);
    return null;
  }
};

/**
 * Helper function to get gym ID by email with improved error handling
 */
export const getGymIdByEmail = async (email: string): Promise<string | null> => {
  try {
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
    
    // Log auth state for debugging
    await logAuthState();
    
    // Add retry logic for fetching gym ID
    let retryCount = 0;
    
    while (retryCount < MAX_RETRIES) {
      try {
        console.log(`Attempt ${retryCount + 1}: Fetching gym ID for email ${email}`);
        
        // Re-verify auth session before query
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          console.error("No valid session before fetching gym ID");
          return null;
        }
        
        const { data, error } = await supabase
          .from('gyms')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        
        if (error) {
          console.error(`Attempt ${retryCount + 1}: Error fetching gym ID:`, error);
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
            console.error("Max retries reached. Failed to fetch gym ID.");
            return null;
          }
          
          // Wait before retrying with exponential backoff
          const delay = BASE_DELAY * Math.pow(2, retryCount - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
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
        console.error(`Attempt ${retryCount + 1}: Network error fetching gym ID:`, error);
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          console.error("Max retries reached. Failed to fetch gym ID.");
          return null;
        }
        
        // Wait before retrying with exponential backoff
        const delay = BASE_DELAY * Math.pow(2, retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error in getGymIdByEmail:", error);
    return null;
  }
};
