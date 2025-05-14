
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, logAuthState } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";
import { AuthContextType } from './types';
import { ensureGymExists, createDefaultGym } from './gym-service';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state change event:", event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN') {
          toast({
            title: "Signed in successfully",
            description: "Welcome to MatTrack",
          });
          
          // Don't call Supabase directly in the auth callback to avoid deadlocks
          setTimeout(() => {
            console.log("Checking gym after sign in");
            logAuthState(); // Log auth state for debugging
            
            // Don't block on this
            if (session?.user?.email) {
              ensureGymExists(session.user.email).catch(err => {
                console.warn("Could not ensure gym exists during sign in event:", err);
              });
            }
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: "Signed out successfully",
            description: "You have been signed out",
          });
        } else if (event === 'TOKEN_REFRESHED') {
          console.log("Auth token refreshed");
        }
      }
    );

    // Then check for existing session
    const checkSession = async () => {
      try {
        console.log("Checking for existing session...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking session:", error);
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session) {
            console.log("Existing session found for user:", session.user.email);
            // Don't block UI rendering on this
            setTimeout(() => {
              if (session.user.email) {
                ensureGymExists(session.user.email).catch(err => {
                  console.warn("Could not ensure gym exists during initial session check:", err);
                });
              }
            }, 0);
          } else {
            console.log("No existing session found");
          }
        }
      } catch (error) {
        console.error("Exception checking session:", error);
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
        setAuthInitialized(true);
      }
    };
    
    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const signUp = async (email: string, password: string, gymName: string = 'My Gym') => {
    try {
      setIsLoading(true);
      console.log("Starting signup process for:", email, "with gym name:", gymName);
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Account created",
        description: "Check your email for a confirmation link",
      });

      // After successful signup, create the gym - but don't block on it
      if (data.user) {
        console.log("User created, now creating gym");
        // Don't await this - we don't want to block the signup flow
        createDefaultGym(email, gymName).catch(err => {
          console.error("Background gym creation failed:", err);
          // No toast here - we don't want to confuse the user
        });
      }

      // Auto sign in for better user experience
      if (data.user) {
        try {
          await signIn(email, password);
        } catch (signInError: any) {
          console.error("Failed to auto-sign in after signup:", signInError);
          toast({
            title: "Sign in required",
            description: "Please sign in with your new account",
          });
          navigate('/login', { replace: true });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error creating account",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("Signing in user:", email);
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Only redirect if the sign-in was successful
      if (data.session) {
        // Log auth state for debugging
        await logAuthState();
        
        // Always ensure the user has a gym, but don't block on it
        try {
          // Don't await this - we don't want to block the signin flow
          ensureGymExists(email).catch(gymError => {
            console.warn("Could not ensure gym exists during sign in");
          });
        } catch (gymError) {
          console.error('Error ensuring gym exists:', gymError);
        }

        toast({
          title: "Signed in successfully",
          description: "Welcome back!",
        });
        
        // Navigate after a short delay to ensure state is updated
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 300);
      }
    } catch (error: any) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      console.log("Signing out user...");
      
      try {
        // Try to sign out with Supabase
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn("Error from Supabase during sign out:", error);
          // Continue with local sign out even if Supabase fails
        }
      } catch (supabaseError) {
        // If Supabase request fails (network issue), just log it
        console.warn("Failed to reach Supabase during sign out:", supabaseError);
        // Continue with local sign out
      }
      
      // Always clear local state regardless of Supabase response
      setUser(null);
      setSession(null);
      
      toast({
        title: "Signed out",
        description: "You have been successfully logged out",
      });
      
      // Navigate with replace to prevent back button issues
      navigate('/login', { replace: true });
    } catch (error: any) {
      console.error("Error during sign out:", error);
      toast({
        title: "Error signing out",
        description: "We couldn't connect to the server, but you've been logged out locally",
        variant: "destructive",
      });
      
      // Still navigate to login page even if there was an error
      navigate('/login', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
