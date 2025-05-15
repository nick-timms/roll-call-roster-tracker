
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, logAuthState, refreshSession } from '@/integrations/supabase/client';
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

  // Refresh the session every 10 minutes to ensure the token stays valid
  useEffect(() => {
    if (!session) return;
    
    const refreshTimer = setInterval(async () => {
      console.log("Scheduled token refresh attempt");
      await refreshSession();
    }, 10 * 60 * 1000); // 10 minutes
    
    return () => clearInterval(refreshTimer);
  }, [session]);

  useEffect(() => {
    console.log("AuthProvider initializing...");
    
    // Set up auth state listener first to catch all auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`Auth state change event: ${event}`);
        
        // Update session and user state
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          toast({
            title: "Signed in successfully",
            description: "Welcome to MatTrack",
          });
          
          console.log("User signed in:", newSession?.user?.email);
          
          // Use setTimeout to avoid auth deadlocks
          setTimeout(async () => {
            if (newSession?.user?.id) {
              try {
                const gym = await ensureGymExists(
                  newSession.user.id, 
                  newSession.user.email || ''
                );
                console.log("Gym check complete:", gym ? "Gym exists/created" : "No gym found");
              } catch (err) {
                console.warn("Could not ensure gym exists:", err);
              }
            }
          }, 100);
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: "Signed out successfully",
            description: "You have been signed out",
          });
          
          // Clear session data from localStorage on sign out
          if (typeof localStorage !== 'undefined') {
            try {
              localStorage.removeItem('supabase.auth.token');
              console.log("Removed session from localStorage during sign out");
            } catch (err) {
              console.warn("Error clearing localStorage during sign out:", err);
            }
          }
        } else if (event === 'TOKEN_REFRESHED') {
          console.log("Auth token refreshed successfully");
        }
      }
    );

    // Then check for existing session
    const checkSession = async () => {
      try {
        console.log("Checking for existing session...");
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking session:", error);
          setSession(null);
          setUser(null);
        } else {
          console.log("Session check result:", existingSession ? "Session found" : "No session found");
          
          if (existingSession) {
            setSession(existingSession);
            setUser(existingSession.user);
            
            console.log("Existing session found for user:", existingSession.user.email);
            
            // Don't block UI rendering on this
            setTimeout(async () => {
              if (existingSession.user.id) {
                try {
                  await ensureGymExists(
                    existingSession.user.id,
                    existingSession.user.email || ''
                  );
                } catch (err) {
                  console.warn("Could not ensure gym exists during initial session check:", err);
                }
              }
            }, 100);
          } else {
            console.log("No existing session found");
            setSession(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Exception checking session:", error);
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
        setAuthInitialized(true);
        console.log("Auth provider initialization complete");
      }
    };
    
    checkSession();

    return () => {
      subscription.unsubscribe();
      console.log("Auth subscription unsubscribed");
    };
  }, [toast]);

  const signUp = async (email: string, password: string, gymName: string = 'My Gym') => {
    try {
      setIsLoading(true);
      console.log("Starting signup process for:", email, "with gym name:", gymName);
      
      // Clear any existing session first
      await supabase.auth.signOut();
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: email.split('@')[0] // Default name from email
          }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Account created",
        description: "Check your email for a confirmation link",
      });

      // Log the current session
      await logAuthState();

      // After successful signup, create the gym
      if (data.user) {
        console.log("User created with ID:", data.user.id, "now creating gym");
        
        // Set the session to ensure gym creation has auth context
        setSession(data.session);
        setUser(data.user);
        
        try {
          await createDefaultGym(data.user.id, gymName, email);
        } catch (gymError) {
          console.error("Gym creation failed:", gymError);
          toast({
            title: "Note",
            description: "Account created but gym setup encountered an issue. Please try setting up your gym in settings later.",
          });
        }
      }

      // Auto sign in for better user experience
      if (data.user && !data.session) {
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
      } else if (data.session) {
        // We already have a session from signup
        navigate('/dashboard', { replace: true });
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
      
      // Clear any existing session first to avoid conflicts
      await supabase.auth.signOut();
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Only redirect if the sign-in was successful
      if (data.session) {
        console.log("Sign in successful, session obtained");
        
        // Update our state
        setSession(data.session);
        setUser(data.user);
        
        // Log auth state for debugging
        await logAuthState();
        
        // Ensure user has a gym
        try {
          if (data.user && data.user.id) {
            await ensureGymExists(data.user.id, email);
          }
        } catch (gymError) {
          console.error('Error ensuring gym exists:', gymError);
          // Don't fail the signin process if this fails
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
      
      // Clear local state first to improve perceived performance
      setUser(null);
      setSession(null);
      
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
      
      // Manually clear session storage as a backup
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem('supabase.auth.token');
          console.log("Removed session from localStorage during manual sign out");
        } catch (err) {
          console.warn("Error clearing localStorage during manual sign out:", err);
        }
      }
      
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
