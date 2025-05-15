
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, logAuthState, refreshSession, diagnoseDatabaseConnection } from '@/integrations/supabase/client';
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
  const [lastTokenRefresh, setLastTokenRefresh] = useState<number>(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Force token refresh when database connections fail
  const tryDatabaseRecovery = async () => {
    console.log("Attempting database connection recovery...");
    
    // Don't attempt another refresh if we just did one (prevent loops)
    const now = Date.now();
    if (now - lastTokenRefresh < 10000) { // 10 second minimum between refreshes
      console.log("Skipping recovery - too soon since last refresh attempt");
      return false;
    }
    
    setLastTokenRefresh(now);
    
    // Diagnose the connection issue
    const diagnosis = await diagnoseDatabaseConnection();
    console.log("Connection diagnosis:", diagnosis);
    
    if (!diagnosis.success) {
      if (diagnosis.authStatus === 'expired' || diagnosis.authStatus === 'invalid') {
        console.log("Auth token issues detected, attempting refresh...");
        const refreshed = await refreshSession();
        if (refreshed) {
          // Update our local session state to match the refreshed token
          const { data: { session: newSession } } = await supabase.auth.getSession();
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
            console.log("Session refreshed successfully during recovery");
          }
          return true;
        }
        console.warn("Token refresh failed during recovery attempt");
      } else if (diagnosis.authStatus === 'missing') {
        console.warn("No authentication session found during recovery");
        
        // Clear local state to force re-login
        setUser(null);
        setSession(null);
        
        // Show toast to user
        toast({
          title: "Authentication Required",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        
        // Redirect to login
        navigate('/login', { replace: true });
        return false;
      }
    }
    
    return diagnosis.success;
  };

  // Refresh the session every 5 minutes to ensure the token stays valid
  useEffect(() => {
    if (!session) return;
    
    const refreshTimer = setInterval(async () => {
      console.log("Scheduled token refresh attempt");
      await refreshSession();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(refreshTimer);
  }, [session]);
  
  // Add periodic health check for database connection
  useEffect(() => {
    if (!session) return;
    
    const healthCheckTimer = setInterval(async () => {
      console.log("Performing scheduled database health check");
      const diagnosis = await diagnoseDatabaseConnection();
      
      if (!diagnosis.success) {
        console.warn("Health check detected database connection issues:", diagnosis.message);
        await tryDatabaseRecovery();
      }
    }, 10 * 60 * 1000); // 10 minutes
    
    return () => clearInterval(healthCheckTimer);
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
          
          // Verify the database connection works with the new token
          setTimeout(async () => {
            const connectionCheck = await diagnoseDatabaseConnection();
            if (!connectionCheck.success) {
              console.warn("Database connection check failed after sign-in:", connectionCheck.message);
              toast({
                title: "Connection Warning",
                description: "Signed in, but there may be issues accessing your data",
                variant: "warning",
              });
            }
            
            // Use setTimeout to avoid auth deadlocks
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
              // Clear Supabase specific token
              localStorage.removeItem(`sb-${SUPABASE_URL.split('//')[1]}-auth-token`);
              console.log("Removed session from localStorage during sign out");
            } catch (err) {
              console.warn("Error clearing localStorage during sign out:", err);
            }
          }
        } else if (event === 'TOKEN_REFRESHED') {
          console.log("Auth token refreshed successfully");
          setLastTokenRefresh(Date.now());
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
            
            // Run an immediate database connectivity test
            setTimeout(async () => {
              const connectionCheck = await diagnoseDatabaseConnection();
              if (!connectionCheck.success) {
                console.warn("Initial database connection check failed:", connectionCheck.message);
                
                // Only show a toast if there's a serious issue
                if (connectionCheck.authStatus === 'expired' || connectionCheck.authStatus === 'invalid') {
                  const recovered = await tryDatabaseRecovery();
                  if (!recovered) {
                    toast({
                      title: "Connection Issue",
                      description: "There might be issues accessing your data. Please try refreshing the page.",
                      variant: "warning",
                    });
                  }
                }
              }
              
              // Don't block UI rendering on this gym check
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
  }, [toast, navigate]);

  // Export database recovery method for components to use
  const recoverDatabaseConnection = async () => {
    return await tryDatabaseRecovery();
  };

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
        setLastTokenRefresh(Date.now());
        
        // Log auth state for debugging
        await logAuthState();
        
        // Test database connection after sign-in
        setTimeout(async () => {
          const dbTest = await diagnoseDatabaseConnection();
          if (!dbTest.success) {
            console.warn("Database connection test after login failed:", dbTest);
            
            // If there's a permissions issue, try to recover
            if (dbTest.permissions === 'denied') {
              await tryDatabaseRecovery();
            }
          }
          
          // Ensure user has a gym
          try {
            if (data.user && data.user.id) {
              await ensureGymExists(data.user.id, email);
            }
          } catch (gymError) {
            console.error('Error ensuring gym exists:', gymError);
            // Don't fail the signin process if this fails
          }
        }, 100);
        
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
          // Clear Supabase specific token with correct format
          localStorage.removeItem(`sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token`);
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
      recoverDatabaseConnection, // Add recovery method to context
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
