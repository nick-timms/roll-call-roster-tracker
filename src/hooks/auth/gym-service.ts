
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
      console.error('Error checking for existing gym:', checkError);
      return null;
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
      return null;
    }
    
    console.log('Gym created successfully:', newGym.id);
    
    toast({
      title: 'Gym created',
      description: 'Your gym has been set up successfully.'
    });
    
    return newGym;
  } catch (error) {
    console.error('Failed to ensure gym exists:', error);
    return null;
  }
};
