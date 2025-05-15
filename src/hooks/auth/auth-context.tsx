
import { createContext, useContext, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContextType, AuthStatus, AuthError } from './types';
import { AuthService } from './services/AuthService';
import { SessionService } from './services/SessionService';
import { UserService } from './services/UserService';
import { ErrorService } from './services/ErrorService';
import { useAuthState } from './hooks/useAuthState';
import { useToast } from "@/hooks/use-toast";

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication Provider Component
 * Central manager for authentication state and operations
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Use the auth state hook for managing state
  const {
    user,
    session,
    isLoading,
    isInitialized,
    error,
    lastTokenRefresh,
    setUserAndSession,
    setLoading,
    setError,
    clearError,
    setTokenRefresh
  } = useAuthState();

  // Sign up a new user
  const signUp = useCallback(async (email: string, password: string, gymName: string = 'My Gym') => {
    try {
      setLoading(true);
      clearError();
      
      console.log("Starting signup process for:", email, "with gym name:", gymName);
      
      // Register the user with Supabase auth
      const result = await AuthService.signUp(email, password, {
        full_name: email.split('@')[0] // Default name from email
      });
      
      // Update state with the new user and session
      setUserAndSession(result.user, result.session);
      
      toast({
        title: "Account created",
        description: "Check your email for a confirmation link",
      });
      
      // Create the user's gym
      if (result.user) {
        console.log("User created with ID:", result.user.id, "now creating gym");
        
        try {
          await UserService.ensureUserHasGym(result.user.id, email);
        } catch (gymError) {
          console.error("Gym creation failed:", gymError);
          toast({
            title: "Note",
            description: "Account created but gym setup encountered an issue. Please try setting up your gym in settings later.",
          });
        }
      }
      
      // Auto sign in for better user experience
      if (result.user && !result.session) {
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
      } else if (result.session) {
        // We already have a session from signup
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      const standardError = ErrorService.handleSignupError(error);
      setError(standardError);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setUserAndSession, setError, toast, navigate]);

  // Sign in an existing user
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      clearError();
      
      console.log("Signing in user:", email);
      
      // Authenticate with Supabase
      const result = await AuthService.signIn(email, password);
      
      // Update state with the user and session
      setUserAndSession(result.user, result.session);
      setTokenRefresh();
      
      toast({
        title: "Signed in successfully",
        description: "Welcome back!",
      });
      
      // Ensure user has a gym
      if (result.user) {
        setTimeout(async () => {
          try {
            await UserService.ensureUserHasGym(result.user.id, email);
          } catch (gymError) {
            console.error('Error ensuring gym exists:', gymError);
          }
        }, 100);
      }
      
      // Navigate after a short delay to ensure state is updated
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 300);
    } catch (error: any) {
      const standardError = ErrorService.handleLoginError(error);
      setError(standardError);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setUserAndSession, setError, setTokenRefresh, toast, navigate]);

  // Sign out the current user
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      clearError();
      
      console.log("Signing out user...");
      
      // Clear local state first to improve perceived performance
      setUserAndSession(null, null);
      
      // Sign out with Supabase
      await AuthService.signOut();
      
      // Navigate with replace to prevent back button issues
      navigate('/login', { replace: true });
    } catch (error: any) {
      console.error("Error during sign out:", error);
      
      const standardError = ErrorService.handleAuthError(error, 'signout');
      setError(standardError);
      
      // Still navigate to login page even if there was an error
      navigate('/login', { replace: true });
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setUserAndSession, setError, navigate]);

  // Reset user password
  const resetPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      clearError();
      
      await AuthService.resetPassword(email);
      return true;
    } catch (error: any) {
      const standardError = ErrorService.handleAuthError(error, 'reset_password');
      setError(standardError);
      return false;
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setError]);

  // Update user password
  const updatePassword = useCallback(async (password: string) => {
    try {
      setLoading(true);
      clearError();
      
      await AuthService.updatePassword(password);
      return true;
    } catch (error: any) {
      const standardError = ErrorService.handleAuthError(error, 'update_password');
      setError(standardError);
      return false;
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setError]);

  // Refresh session manually
  const refreshSession = useCallback(async () => {
    try {
      const result = await SessionService.refreshSession();
      
      if (result.success && result.session) {
        setUserAndSession(result.session.user, result.session);
        setTokenRefresh();
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error("Error refreshing session:", error);
      return false;
    }
  }, [setUserAndSession, setTokenRefresh]);

  // Recover database connection
  const recoverDatabaseConnection = useCallback(async () => {
    try {
      const result = await SessionService.recoverDatabaseConnection(lastTokenRefresh);
      
      if (result.success && result.session) {
        setUserAndSession(result.session.user, result.session);
        if (result.refreshTime) {
          setTokenRefresh(result.refreshTime);
        }
        return true;
      }
      
      // If auth is missing, redirect to login
      if (result.authStatus === 'missing') {
        navigate('/login', { replace: true });
      }
      
      return result.recovered || false;
    } catch (error: any) {
      console.error("Error recovering database connection:", error);
      return false;
    }
  }, [setUserAndSession, setTokenRefresh, lastTokenRefresh, navigate]);

  // Compute the current authentication status
  const authStatus = useMemo((): AuthStatus => {
    if (!isInitialized) return AuthStatus.LOADING;
    if (error) return AuthStatus.ERROR;
    if (user && session) return AuthStatus.AUTHENTICATED;
    return AuthStatus.UNAUTHENTICATED;
  }, [isInitialized, user, session, error]);

  // Set up session refresh timer
  // useEffect(() => {
  //   if (!session) return;
    
  //   // Refresh token every 5 minutes to ensure it stays valid
  //   const refreshTimer = setInterval(async () => {
  //     console.log("Scheduled token refresh attempt");
  //     await refreshSession();
  //   }, 5 * 60 * 1000); // 5 minutes
    
  //   return () => clearInterval(refreshTimer);
  // }, [session, refreshSession]);

  // Create context value
  const contextValue = useMemo(() => ({
    // Auth state
    user,
    session,
    isLoading,
    error,
    lastTokenRefresh,
    
    // Auth methods
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession,
    recoverDatabaseConnection,
    
    // Error management
    clearError,
    
    // Computed
    status: authStatus,
    isInitialized
  }), [
    user, session, isLoading, error, lastTokenRefresh,
    signUp, signIn, signOut, resetPassword, updatePassword,
    refreshSession, recoverDatabaseConnection, clearError,
    authStatus, isInitialized
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use authentication context
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

/**
 * Primary auth hook for components
 */
export const useAuth = () => {
  return useAuthContext();
};
