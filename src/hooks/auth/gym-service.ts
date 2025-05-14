
import { supabase } from "@/integrations/supabase/client";

export const createDefaultGym = async (email: string, gymName: string = 'My Gym') => {
  try {
    if (!email) {
      console.error("Cannot create gym: No email provided");
      return null;
    }
    
    console.log("Creating default gym for:", email);
    
    // Get the current session to verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("Error creating gym: No active session");
      return null;
    }
    
    // Check if a gym already exists for this email
    try {
      const { data: existingGyms, error: checkError } = await supabase
        .from('gyms')
        .select('id, name')
        .eq('email', email)
        .maybeSingle();
      
      if (checkError) {
        console.error("Error checking for existing gym:", checkError);
        console.error("Error details:", checkError.message, checkError.details);
        return null;
      }
      
      // If gym already exists, return it
      if (existingGyms) {
        console.log("Gym already exists:", existingGyms);
        return existingGyms;
      }
    } catch (error) {
      console.error("Network error checking for existing gym:", error);
      return null;
    }

    // Create a new gym with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const { data: newGym, error: insertError } = await supabase
          .from('gyms')
          .insert({
            email: email,
            name: gymName
          })
          .select()
          .single();
        
        if (insertError) {
          console.error(`Attempt ${retryCount + 1}: Error creating gym:`, insertError);
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error("Max retries reached. Failed to create gym.");
            return null;
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        console.log("Created new gym:", newGym);
        return newGym;
      } catch (error) {
        console.error(`Attempt ${retryCount + 1}: Network error creating gym:`, error);
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error("Max retries reached. Failed to create gym.");
          return null;
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error in createDefaultGym:", error);
    return null;
  }
};

export const ensureGymExists = async (email: string, gymName: string = 'My Gym') => {
  try {
    if (!email) {
      console.error("Cannot ensure gym exists: No email provided");
      return null;
    }

    console.log("Ensuring gym exists for:", email);
    
    // Get the current session to verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("Error ensuring gym exists: No active session");
      return null;
    }
    
    // Check if a gym already exists for this email with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const { data: existingGyms, error: checkError } = await supabase
          .from('gyms')
          .select('id, name, phone, company_name, address')
          .eq('email', email)
          .maybeSingle();
        
        if (checkError) {
          console.error(`Attempt ${retryCount + 1}: Error checking for existing gym:`, checkError);
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error("Max retries reached. Failed to check for existing gym.");
            return null;
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        // If gym already exists, return it
        if (existingGyms) {
          console.log("Gym already exists:", existingGyms);
          return existingGyms;
        }
        
        // If no gym exists, create one
        return await createDefaultGym(email, gymName);
      } catch (error) {
        console.error(`Attempt ${retryCount + 1}: Network error checking for existing gym:`, error);
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error("Max retries reached. Failed to check for existing gym.");
          return null;
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error in ensureGymExists:", error);
    return null;
  }
};

// Helper function to get gym ID by email
export const getGymIdByEmail = async (email: string): Promise<string | null> => {
  try {
    if (!email) {
      console.error("Cannot get gym ID: No email provided");
      return null;
    }
    
    // Get the current session to verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("Error getting gym ID: No active session");
      return null;
    }
    
    // Add retry logic for fetching gym ID
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const { data, error } = await supabase
          .from('gyms')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        
        if (error) {
          console.error(`Attempt ${retryCount + 1}: Error fetching gym ID:`, error);
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error("Max retries reached. Failed to fetch gym ID.");
            return null;
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        if (!data) {
          console.error("No gym found for email:", email);
          return null;
        }
        
        return data.id;
      } catch (error) {
        console.error(`Attempt ${retryCount + 1}: Network error fetching gym ID:`, error);
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error("Max retries reached. Failed to fetch gym ID.");
          return null;
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error in getGymIdByEmail:", error);
    return null;
  }
};
