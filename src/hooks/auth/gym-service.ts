
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { GymDetails } from './types';

/**
 * Creates or gets an existing gym for a user
 */
export const ensureGymExists = async (email: string, preferredGymName: string = 'My Gym'): Promise<GymDetails | null> => {
  if (!email) {
    console.error("Cannot ensure gym exists: No email provided");
    return null;
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
      // Don't throw here, just log and attempt to create a gym
      console.error('Error checking for existing gym:', checkError);
    }
    
    // If we found a gym, return it
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
      // Log the error but don't throw; return null to indicate failure
      console.error('Error creating gym:', gymError);
      return { id: 'default', name: 'My Gym' }; // Return a default gym object instead of null
    }
    
    console.log('Gym created successfully:', newGym.id);
    
    toast({
      title: 'Gym created',
      description: 'Your gym has been set up successfully.'
    });
    
    return newGym;
  } catch (error) {
    console.error('Failed to ensure gym exists:', error);
    return { id: 'default', name: 'My Gym' }; // Return a default gym object instead of null
  }
};

/**
 * Creates a default gym for a user that will work even if database operations fail
 */
export const createDefaultGym = async (email: string): Promise<GymDetails> => {
  try {
    if (!email) {
      return { id: 'default', name: 'My Gym' };
    }
    
    console.log(`Creating default gym for ${email}`);
    
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
      return { id: 'default', name: 'My Gym' };
    }
    
    return data;
  } catch (error) {
    console.error('Failed to create default gym:', error);
    return { id: 'default', name: 'My Gym' };
  }
};
