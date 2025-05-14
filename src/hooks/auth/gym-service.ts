
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
    
    // Check if a gym already exists for this email
    try {
      const { data: existingGyms, error: checkError } = await supabase
        .from('gyms')
        .select('id, name')
        .eq('email', email)
        .maybeSingle();
      
      if (checkError) {
        console.error("Error checking for existing gym:", checkError);
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
