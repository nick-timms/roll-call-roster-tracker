
import { supabase } from "@/integrations/supabase/client";

export const createDefaultGym = async (email: string, gymName: string = 'My Gym') => {
  try {
    console.log("Creating default gym for:", email);
    
    // Check if a gym already exists for this email
    const { data: existingGyms, error: checkError } = await supabase
      .from('gyms')
      .select('id, name')
      .eq('email', email)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking for existing gym:", checkError);
      throw checkError;
    }
    
    // If gym already exists, return it
    if (existingGyms) {
      console.log("Gym already exists:", existingGyms);
      return existingGyms;
    }
    
    // Create a new gym
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
      throw insertError;
    }
    
    console.log("Created new gym:", newGym);
    return newGym;
  } catch (error) {
    console.error("Error in createDefaultGym:", error);
    throw error;
  }
};

export const ensureGymExists = async (email: string, gymName: string = 'My Gym') => {
  try {
    console.log("Ensuring gym exists for:", email);
    
    // Check if a gym already exists for this email
    const { data: existingGyms, error: checkError } = await supabase
      .from('gyms')
      .select('id, name')
      .eq('email', email)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking for existing gym:", checkError);
      throw checkError;
    }
    
    // If gym already exists, return it
    if (existingGyms) {
      console.log("Gym already exists:", existingGyms);
      return existingGyms;
    }
    
    // If no gym exists, create one
    return await createDefaultGym(email, gymName);
  } catch (error) {
    console.error("Error in ensureGymExists:", error);
    throw error;
  }
};
