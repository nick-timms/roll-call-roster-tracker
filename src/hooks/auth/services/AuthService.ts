
import { supabase, hasValidSession, refreshSession, logAuthState } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

/**
 * Core Authentication Service
 * Handles primary authentication operations: signup, login, logout
 */
export class AuthService {
  /**
   * Sign up a new user
   * @param email - User email
   * @param password - User password
   * @param metadata - Optional additional user data
   * @returns Promise with the user and session if successful
   */
  static async signUp(email: string, password: string, metadata: Record<string, any> = {}) {
    try {
      console.log(`AuthService: Starting signup process for ${email}`);
      
      // Clear any existing session first to prevent conflicts
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: metadata
        }
      });
      
      if (error) throw error;
      
      // Debug log the current session state
      await logAuthState();
      
      if (data.user) {
        console.log(`AuthService: User created with ID: ${data.user.id}`);
      }
      
      return {
        user: data.user,
        session: data.session,
      };
    } catch (error: any) {
      console.error('AuthService: Signup error:', error);
      toast({
        title: "Error creating account",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  }

  /**
   * Sign in an existing user
   * @param email - User email
   * @param password - User password
   * @returns Promise with the user and session if successful
   */
  static async signIn(email: string, password: string) {
    try {
      console.log(`AuthService: Signing in user ${email}`);
      
      // Clear any existing session first to prevent conflicts
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.session) {
        console.log('AuthService: Sign in successful, session obtained');
        
        // Log auth state for debugging
        await logAuthState();
        
        return {
          user: data.user,
          session: data.session,
        };
      } else {
        throw new Error('No session returned after login');
      }
    } catch (error: any) {
      console.error('AuthService: Login error:', error);
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  static async signOut() {
    try {
      console.log('AuthService: Signing out user');
      
      try {
        // Try to sign out with Supabase
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn("AuthService: Error from Supabase during sign out:", error);
          // Continue with local sign out even if Supabase fails
        }
      } catch (supabaseError) {
        // If Supabase request fails (network issue), just log it
        console.warn("AuthService: Failed to reach Supabase during sign out:", supabaseError);
        // Continue with local sign out
      }
      
      // Manually clear session storage as a backup
      if (typeof localStorage !== 'undefined') {
        try {
          // Hardcoded project ref from client.ts
          const projectRef = 'ktwcyzsxzivlibsaschj';
          localStorage.removeItem(`sb-${projectRef}-auth-token`);
          console.log("AuthService: Removed session from localStorage during manual sign out");
        } catch (err) {
          console.warn("AuthService: Error clearing localStorage during manual sign out:", err);
        }
      }
      
      toast({
        title: "Signed out",
        description: "You have been successfully logged out",
      });
      
      return true;
    } catch (error: any) {
      console.error("AuthService: Error during sign out:", error);
      toast({
        title: "Error signing out",
        description: "We couldn't connect to the server, but you've been logged out locally",
        variant: "destructive",
      });
      
      throw error;
    }
  }
  
  /**
   * Send a password reset email
   * @param email - User email
   */
  static async resetPassword(email: string) {
    try {
      console.log(`AuthService: Sending password reset email to ${email}`);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password reset email sent",
        description: "Check your email for a link to reset your password",
      });
      
      return true;
    } catch (error: any) {
      console.error('AuthService: Password reset error:', error);
      toast({
        title: "Error sending reset email",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  }
  
  /**
   * Update user password
   * @param password - New password
   */
  static async updatePassword(password: string) {
    try {
      console.log('AuthService: Updating user password');
      
      const { error } = await supabase.auth.updateUser({
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated",
      });
      
      return true;
    } catch (error: any) {
      console.error('AuthService: Password update error:', error);
      toast({
        title: "Error updating password",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  }
}
