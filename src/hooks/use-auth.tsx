
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, gymName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN') {
          toast({
            title: "Signed in successfully",
            description: "Welcome to MatTrack",
          });
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: "Signed out successfully",
            description: "You have been signed out",
          });
        }
      }
    );

    // Then check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    };
    
    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Create or get gym for a user
  const ensureGymExists = async (email: string, preferredGymName: string = 'My Gym') => {
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

  const signUp = async (email: string, password: string, gymName: string = 'My Gym') => {
    try {
      setIsLoading(true);
      console.log("Starting signup process for:", email, "with gym name:", gymName);
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Account created",
        description: "Check your email for a confirmation link",
      });

      // After successful signup, create the gym
      if (data.user) {
        console.log("User created, now creating gym");
        const gym = await ensureGymExists(email, gymName);
        
        if (!gym) {
          console.error("Failed to create gym during signup");
          toast({
            title: "Warning",
            description: "Your account was created but there was an issue setting up your gym.",
            variant: "destructive",
          });
        }
      }

      // Auto sign in for better user experience
      if (data.user) {
        try {
          await signIn(email, password);
        } catch (signInError) {
          console.error("Failed to auto-sign in after signup:", signInError);
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
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Always ensure the user has a gym
      try {
        const gym = await ensureGymExists(email);
        if (!gym) {
          console.warn("Could not ensure gym exists during sign in");
        } else {
          console.log("User has gym:", gym.name);
        }
      } catch (gymError) {
        console.error('Error ensuring gym exists:', gymError);
      } finally {
        // Always navigate to dashboard with enough delay to ensure state is updated
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 200);
      }
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
