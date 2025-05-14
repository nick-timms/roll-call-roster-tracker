import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { GymDetails } from './types';

/**
 * Creates or gets an existing gym for a user
 */
export const ensureGymExists = async (email: string, preferredGymName: string = 'My Gym'): Promise<GymDetails> => {
  if (!email) {
    console.error("Cannot ensure gym exists: No email provided");
    throw new Error("Email is required to ensure a gym exists");
  }

  try {
    console.log(`Ensuring gym exists for ${email}`);
    
    // First check if a gym already exists for this email
    const { data: existingGyms, error: checkError } = await supabase
      .from('gyms')
      .select('id, name')
      .eq('email', email)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking for existing gym:', checkError);
      throw new Error(`Failed to check for existing gym: ${checkError.message}`);
    } 
    
    if (existingGyms) {
      console.log('Gym already exists:', existingGyms.id);
      return existingGyms;
    }
    
    // If no gym exists, create one
    const gymName = preferredGymName || 'My Gym';
    console.log(`Creating new gym "${gymName}" for ${email}`);
    
    const { data: newGym, error: gymError } = await supabase
      .from('gyms')
      .insert({
        name: gymName,
        email: email,
      })
      .select('id, name')
      .single();
      
    if (gymError) {
      console.error('Error creating gym:', gymError);
      throw new Error(`Failed to create gym: ${gymError.message}`);
    }
    
    console.log('Gym created successfully:', newGym.id);
    
    toast({
      title: 'Gym created',
      description: 'Your gym has been set up successfully.'
    });
    
    return newGym;
  } catch (error) {
    console.error('Failed to ensure gym exists:', error);
    throw error;
  }
};

/**
 * Creates a default gym for a user with robust error handling
 */
export const createDefaultGym = async () => {
  try {
    // Get the currently logged-in user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Error getting user:", userError);
      return;
    }
    
    if (!user) {
      console.log("No user is logged in");
      return;
    }
    
    // Check if gym already exists for this user's email
    const { data: existingGym, error: existingGymError } = await supabase
      .from('gyms')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();
      
    if (existingGymError) {
      console.error("Error checking for existing gym:", existingGymError);
      return;
    }
    
    if (existingGym) {
      console.log("Gym already exists for this user");
      return existingGym;
    }
    
    // Create a new gym with user's email
    const { data: newGym, error: createGymError } = await supabase
      .from('gyms')
      .insert([
        { 
          name: "My Gym", 
          email: user.email,
        }
      ])
      .select()
      .single();
    
    if (createGymError) {
      console.error("Error creating default gym:", createGymError);
      toast({
        title: "Error",
        description: "Failed to create default gym",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Success", 
      description: "Default gym created successfully"
    });
    
    return newGym;
    
  } catch (error) {
    console.error("Failed to create default gym:", error);
    toast({
      title: "Error",
      description: "An unexpected error occurred",
      variant: "destructive"
    });
  }
};
