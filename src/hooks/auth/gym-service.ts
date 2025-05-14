
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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
    try {
      const { data: existingGyms, error: checkError } = await supabase
        .from('gyms')
        .select('id, name')
        .eq('email', email)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking for existing gym:', checkError);
      } else if (existingGyms) {
        console.log('Gym already exists:', existingGyms.id);
        return existingGyms;
      }
    } catch (e) {
      console.error("Exception checking for existing gym:", e);
    }
    
    // If no gym exists, create one
    const gymName = preferredGymName || 'My Gym';
    console.log(`Creating new gym "${gymName}" for ${email}`);
    
    try {
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
    } catch (e) {
      console.error("Exception creating gym:", e);
      throw e;
    }
  } catch (error) {
    console.error('Failed to ensure gym exists:', error);
    throw error;
  }
};

/**
 * Creates a default gym for a user with robust error handling
 */
export const createDefaultGym = async (email: string): Promise<GymDetails> => {
  if (!email) {
    throw new Error("Email is required to create a default gym");
  }
  
  console.log(`Creating default gym for ${email}`);
  
  // First check if a gym already exists for this email
  try {
    const { data: existingGyms, error: checkError } = await supabase
      .from('gyms')
      .select('id, name')
      .eq('email', email)
      .maybeSingle();
    
    if (!checkError && existingGyms) {
      console.log('Found existing gym:', existingGyms.id);
      return existingGyms;
    }
  } catch (e) {
    console.error("Error checking for existing gym:", e);
  }
  
  // If no gym exists or there was an error checking, try to create one
  try {
    const { data, error } = await supabase
      .from('gyms')
      .insert({
        name: 'My Gym',
        email: email,
      })
      .select('id, name')
      .single();
    
    if (error) {
      console.error('Error creating default gym:', error);
      throw new Error(`Failed to create default gym: ${error.message}`);
    }
    
    console.log('Created new gym:', data.id);
    return data;
  } catch (e) {
    console.error("Exception creating default gym:", e);
    throw e;
  }
};
