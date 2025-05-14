
import { supabase } from "@/integrations/supabase/client";

export const createDefaultGym = async (email: string, gymName: string = 'My Gym') => {
  try {
    if (!email) {
      console.error("Cannot create gym: No email provided");
      return null;
    }
    
    console.log("Creating default gym for:", email);
    
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
    
    // Get the current session to verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("Error creating gym: No active session");
      return null;
    }
    
    console.log("Creating gym with auth token:", session.access_token ? "Token present" : "No token");
    
    // Create a new gym
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
        console.error("Error creating gym:", insertError);
        console.error("Error details:", insertError.message, insertError.details);
        return null;
      }
      
      console.log("Created new gym:", newGym);
      return newGym;
    } catch (error) {
      console.error("Network error creating gym:", error);
      return null;
    }
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
    
    console.log("Checking gym with auth token:", session.access_token ? "Token present" : "No token");
    
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
    
    // If no gym exists, create one
    return await createDefaultGym(email, gymName);
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
      console.error("No gym found for email:", email);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error("Error in getGymIdByEmail:", error);
    return null;
  }
};
