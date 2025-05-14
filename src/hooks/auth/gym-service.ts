
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export async function ensureGymExists(email: string, gymName: string = 'My Gym') {
  try {
    console.log("Ensuring gym exists for:", email);
    
    // Check if gym already exists for this user
    const { data: existingGym, error: queryError } = await supabase
      .from('gyms')
      .select('*')
      .eq('email', email)
      .limit(1);
      
    if (queryError) {
      console.error("Error checking for existing gym:", queryError);
      throw queryError;
    }
    
    if (existingGym && existingGym.length > 0) {
      console.log("Gym already exists for user:", existingGym[0]);
      return existingGym[0];
    }
    
    // Create new gym
    const newGym = {
      name: gymName,
      email: email,
    };
    
    console.log("Inserting new gym:", newGym);
    
    const { data: createdGym, error: insertError } = await supabase
      .from('gyms')
      .insert([newGym])
      .select();
      
    if (insertError) {
      console.error("Error creating gym:", insertError);
      throw insertError;
    }
    
    console.log("Successfully created gym:", createdGym);
    return createdGym[0];
  } catch (error) {
    console.error("Error in ensureGymExists:", error);
    throw error;
  }
}

export async function createDefaultGym() {
  try {
    // Check for an existing session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      console.log("No authenticated user found");
      return null;
    }
    
    console.log("Creating default gym for user:", session.user.email);
    
    return ensureGymExists(session.user.email);
  } catch (error) {
    console.error("Error in createDefaultGym:", error);
    throw error;
  }
}

export async function getGymId(session: Session | null) {
  if (!session || !session.user || !session.user.email) {
    console.error("Error fetching gym ID: No valid session or user email");
    return null;
  }
  
  try {
    const { data: gym, error } = await supabase
      .from('gyms')
      .select('id')
      .eq('email', session.user.email)
      .single();
      
    if (error) {
      console.error("Error fetching gym ID:", error);
      return null;
    }
    
    return gym?.id || null;
  } catch (error) {
    console.error("Error fetching gym ID:", error);
    return null;
  }
}

export async function getGymDetails(session: Session | null) {
  if (!session || !session.user || !session.user.email) {
    console.error("Error fetching gym details: No valid session or user email");
    return null;
  }
  
  try {
    const { data: gym, error } = await supabase
      .from('gyms')
      .select('*')
      .eq('email', session.user.email)
      .single();
      
    if (error) {
      console.error("Error fetching gym details:", error);
      return null;
    }
    
    return gym;
  } catch (error) {
    console.error("Error fetching gym details:", error);
    return null;
  }
}
