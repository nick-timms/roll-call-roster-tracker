
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

  const signUp = async (email: string, password: string, gymName: string = 'My Gym') => {
    try {
      setIsLoading(true);
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Account created",
        description: "Check your email for a confirmation link",
      });

      // Create gym immediately after signup
      if (data && data.user) {
        console.log("Creating gym for new user with email:", email);
        const result = await createDefaultGym(email, gymName);
        if (!result) {
          console.error("Failed to create default gym during signup");
          toast({
            title: "Warning",
            description: "Your account was created but there was an issue setting up your gym.",
            variant: "destructive",
          });
        } else {
          console.log("Successfully created gym during signup");
        }
      }

      // Auto sign in for better user experience
      if (data && data.user) {
        await signIn(email, password);
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

  const createDefaultGym = async (email: string, gymName: string) => {
    try {
      console.log(`Attempting to create gym '${gymName}' for ${email}`);
      
      // First check if a gym already exists for this email
      const { data: existingGyms, error: checkError } = await supabase
        .from('gyms')
        .select('id')
        .eq('email', email)
        .limit(1);
      
      if (checkError) {
        console.error('Error checking for existing gym:', checkError);
        return false;
      }
      
      if (existingGyms && existingGyms.length > 0) {
        console.log('Gym already exists for this user:', existingGyms[0].id);
        return true; // Gym already exists, no need to create
      }
      
      // If no gym exists, create one
      const { data: newGym, error: gymError } = await supabase
        .from('gyms')
        .insert({
          name: gymName,
          email: email,
        })
        .select('id')
        .single();
        
      if (gymError) {
        console.error('Error creating default gym:', gymError);
        return false;
      }
      
      console.log('Gym created successfully with ID:', newGym?.id);
      
      toast({
        title: 'Gym created',
        description: 'Your gym has been set up successfully.'
      });
      
      return true;
    } catch (error) {
      console.error('Failed to create default gym:', error);
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Check if user has a gym, if not create a default one
      try {
        const { data: gyms, error: fetchError } = await supabase
          .from('gyms')
          .select('id')
          .eq('email', email)
          .limit(1);
          
        if (fetchError) {
          console.error('Error checking for gym:', fetchError);
        }

        if (!gyms || gyms.length === 0) {
          // No gym found, create a default one
          await createDefaultGym(email, 'My Gym');
        }
      } catch (error) {
        console.error('Failed during gym check/creation:', error);
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
