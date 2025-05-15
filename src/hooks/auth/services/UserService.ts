
import { supabase } from '@/integrations/supabase/client';
import { ensureGymExists, createDefaultGym } from '../gym-service';
import { toast } from '@/hooks/use-toast';
import { GymDetails } from '../types';

/**
 * User Service
 * Handles user profile management, roles, and onboarding state
 */
export class UserService {
  /**
   * Retrieve a user's gym details
   * @param userId - The user ID
   * @returns Promise with gym details if found
   */
  static async getUserGym(userId: string): Promise<GymDetails | null> {
    try {
      console.log(`UserService: Getting gym for user ${userId}`);
      
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('owner_id', userId)
        .single();
      
      if (error) {
        console.error('UserService: Error fetching user gym:', error);
        return null;
      }
      
      return data as GymDetails;
    } catch (error: any) {
      console.error('UserService: Error in getUserGym:', error);
      return null;
    }
  }

  /**
   * Ensure a user has a gym associated with their account
   * Creates one if it doesn't exist
   * @param userId - User ID
   * @param email - User email
   * @returns Promise with gym details
   */
  static async ensureUserHasGym(userId: string, email: string): Promise<GymDetails | null> {
    try {
      console.log(`UserService: Ensuring gym exists for user ${userId}`);
      
      // First check if the user already has a gym
      const existingGym = await this.getUserGym(userId);
      if (existingGym) {
        console.log('UserService: User already has a gym');
        return existingGym;
      }
      
      console.log('UserService: No gym found, creating a default one');
      // Create a default gym since none exists
      return await createDefaultGym(userId, 'My Gym', email);
    } catch (error: any) {
      console.error('UserService: Error in ensureUserHasGym:', error);
      toast({
        title: "Error setting up gym",
        description: "There was a problem setting up your default gym.",
        variant: "destructive",
      });
      return null;
    }
  }
  
  /**
   * Update user profile data
   * @param userId - User ID
   * @param profileData - Profile data to update
   */
  static async updateProfile(userId: string, profileData: Partial<{
    full_name: string;
    avatar_url: string;
  }>) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
      
      return data;
    } catch (error: any) {
      console.error('UserService: Error updating profile:', error);
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  }
  
  /**
   * Get user profile data
   * @param userId - User ID
   */
  static async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        // If no profile found, return null without showing error
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data;
    } catch (error: any) {
      console.error('UserService: Error getting profile:', error);
      return null;
    }
  }
  
  /**
   * Check if a user is the first user (admin)
   * Note: This is a simplified implementation.
   * In a real app, you'd check a roles table.
   */
  static async isUserAdmin(userId: string): Promise<boolean> {
    try {
      // For now, we'll check if the user is the owner of a gym
      const { data, error } = await supabase
        .from('gyms')
        .select('owner_id')
        .eq('owner_id', userId);
      
      if (error) throw error;
      
      // If there's a gym with this owner, consider them an admin
      return data && data.length > 0;
    } catch (error) {
      console.error('UserService: Error checking admin status:', error);
      return false;
    }
  }
}
