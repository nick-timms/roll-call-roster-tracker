
import { useState, useCallback, useEffect } from 'react';
import { AuthState, AuthError } from '../types';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,
  error: null,
  lastTokenRefresh: 0
};

/**
 * Hook for managing authentication state
 */
export const useAuthState = () => {
  const [authState, setAuthState] = useState<AuthState>(initialState);
  
  // Update session and user state
  const updateAuthState = useCallback((update: Partial<AuthState>) => {
    setAuthState(prev => ({
      ...prev,
      ...update
    }));
  }, []);
  
  // Set user and session
  const setUserAndSession = useCallback((user: User | null, session: Session | null) => {
    updateAuthState({
      user,
      session,
      isLoading: false,
      isInitialized: true, // Always ensure initialized is set to true
      lastTokenRefresh: session ? Date.now() : 0,
    });
  }, [updateAuthState]);
  
  // Set error state
  const setError = useCallback((error: AuthError | null) => {
    updateAuthState({ error });
  }, [updateAuthState]);
  
  // Clear error state
  const clearError = useCallback(() => {
    updateAuthState({ error: null });
  }, [updateAuthState]);
  
  // Update loading state
  const setLoading = useCallback((isLoading: boolean) => {
    updateAuthState({ isLoading });
  }, [updateAuthState]);
  
  // Update token refresh timestamp
  const setTokenRefresh = useCallback((timestamp: number = Date.now()) => {
    updateAuthState({ lastTokenRefresh: timestamp });
  }, [updateAuthState]);
  
  // Load initial session during component mount
  useEffect(() => {
    console.log("useAuthState: Loading initial auth state");
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`useAuthState: Auth state change event: ${event}`);
      
      setUserAndSession(session?.user ?? null, session);
      
      if (event === 'SIGNED_OUT') {
        console.log("useAuthState: User signed out, clearing state");
      } else if (event === 'TOKEN_REFRESHED') {
        console.log("useAuthState: Auth token refreshed");
        setTokenRefresh();
      }
    });
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("useAuthState: Error getting initial session:", error);
          setError({
            message: error.message,
            code: 'session_error',
            context: 'initial_load'
          });
          setUserAndSession(null, null); // This will now set isInitialized to true
          return;
        }
        
        setUserAndSession(session?.user ?? null, session);
        console.log("useAuthState: Initial session loaded", { hasSession: !!session });
      } catch (error) {
        console.error("useAuthState: Exception getting initial session:", error);
        
        // Manually ensure initialization happens even with catastrophic errors
        updateAuthState({
          user: null,
          session: null,
          isLoading: false,
          isInitialized: true,
          error: {
            message: error instanceof Error ? error.message : 'Unknown authentication error',
            code: 'auth_exception',
            context: 'initial_load'
          }
        });
      } finally {
        // As an extra safeguard, ensure isInitialized is always set to true
        // after the initial session check, regardless of outcome
        if (!authState.isInitialized) {
          updateAuthState({ isInitialized: true });
        }
      }
    };
    
    getInitialSession();
    
    return () => {
      subscription.unsubscribe();
      console.log("useAuthState: Auth subscription unsubscribed");
    };
  }, [setUserAndSession, setError, setTokenRefresh, updateAuthState, authState.isInitialized]);
  
  return {
    ...authState,
    setUserAndSession,
    setError,
    clearError,
    setLoading,
    setTokenRefresh,
    updateAuthState,
  };
};
