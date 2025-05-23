
import { supabase, diagnoseDatabaseConnection, refreshSession, logAuthState } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import { AuthError } from '../types';

/**
 * Session Management Service
 * Handles session state, token refresh, and session validation
 */
export class SessionService {
  /**
   * Get the current session from Supabase
   * @returns Promise with session and user if available
   */
  static async getCurrentSession() {
    try {
      console.log('SessionService: Checking for existing session');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("SessionService: Error checking session:", error);
        throw error;
      }
      
      console.log(`SessionService: Session check result: ${session ? "Session found" : "No session found"}`);
      
      return {
        session,
        user: session?.user || null,
      };
    } catch (error: any) {
      console.error('SessionService: Error getting session:', error);
      return { session: null, user: null };
    }
  }

  /**
   * Refresh the current session token
   * @returns Promise with refreshed session if successful
   */
  static async refreshSession() {
    try {
      console.log("SessionService: Attempting to refresh session");
      const refreshResult = await refreshSession();
      
      // Handle the refreshResult based on its actual return type
      if (typeof refreshResult === 'boolean') {
        // If refreshSession returns a boolean (success indicator)
        if (!refreshResult) {
          console.error("SessionService: Session refresh failed");
          return { success: false, session: null };
        }
        
        // If refresh was successful but we don't have session details,
        // we'll need to fetch the current session
        const { session } = await this.getCurrentSession();
        console.log("SessionService: Session refresh successful, retrieved session");
        
        return {
          success: true,
          session,
        };
      } else {
        // We need to properly type check the object to ensure it has the expected properties
        // Use a type guard to check if the result has the expected structure
        const resultWithData = refreshResult as { data?: { session?: Session | null }, error?: any };
        
        if (resultWithData.error) {
          console.error("SessionService: Error refreshing session:", resultWithData.error);
          return { success: false, session: null };
        }
        
        const session = resultWithData.data?.session;
        console.log(`SessionService: Session refresh successful: ${!!session}`);
        
        // Log updated token expiry
        if (session?.expires_at) {
          const expiresAt = new Date(session.expires_at * 1000).toISOString();
          console.log("SessionService: New token expires at:", expiresAt);
        }
        
        return {
          success: true,
          session,
        };
      }
    } catch (error: any) {
      console.error("SessionService: Exception refreshing session:", error);
      return { success: false, session: null };
    }
  }
  
  /**
   * Attempt to recover database connection
   * Diagnoses connection issues and tries to refresh the token if needed
   * @param lastRefresh - Timestamp of the last refresh attempt
   * @returns Promise with recovery status and refreshed session if successful
   */
  static async recoverDatabaseConnection(lastRefresh: number) {
    try {
      console.log("SessionService: Attempting database connection recovery");
      
      // Don't attempt another refresh if we just did one (prevent loops)
      const now = Date.now();
      if (now - lastRefresh < 10000) { // 10 second minimum between refreshes
        console.log("SessionService: Skipping recovery - too soon since last refresh attempt");
        return { success: false, session: null, recovered: false };
      }
      
      // Diagnose the connection issue
      const diagnosis = await diagnoseDatabaseConnection();
      console.log("SessionService: Connection diagnosis:", diagnosis);
      
      if (!diagnosis.success) {
        if (diagnosis.authStatus === 'expired' || diagnosis.authStatus === 'invalid') {
          console.log("SessionService: Auth token issues detected, attempting refresh...");
          const { success, session } = await this.refreshSession();
          
          if (success) {
            console.log("SessionService: Session refreshed successfully during recovery");
            return { 
              success: true, 
              session, 
              recovered: true, 
              refreshTime: now 
            };
          }
          
          console.warn("SessionService: Token refresh failed during recovery attempt");
        } else if (diagnosis.authStatus === 'missing') {
          console.warn("SessionService: No authentication session found during recovery");
          
          toast({
            title: "Authentication Required",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          
          return { 
            success: false, 
            session: null, 
            recovered: false,
            authStatus: 'missing' 
          };
        }
      }
      
      return { 
        success: diagnosis.success, 
        session: null,
        recovered: diagnosis.success,
        authStatus: diagnosis.authStatus
      };
    } catch (error: any) {
      console.error("SessionService: Error in recovery attempt:", error);
      return { 
        success: false, 
        session: null, 
        recovered: false,
        error: error.message || 'Unknown error during recovery'
      };
    }
  }
  
  /**
   * Check if database connection is working
   * @returns Promise with connection status
   */
  static async checkDatabaseConnection() {
    try {
      console.log("SessionService: Performing database health check");
      const diagnosis = await diagnoseDatabaseConnection();
      
      return {
        success: diagnosis.success,
        message: diagnosis.message,
        authStatus: diagnosis.authStatus
      };
    } catch (error: any) {
      console.error("SessionService: Error checking database connection:", error);
      return { 
        success: false, 
        message: error.message || 'Unknown error checking connection',
        authStatus: 'error'
      };
    }
  }
  
  /**
   * Log out current auth state for debugging
   */
  static async logAuthState() {
    try {
      return await logAuthState();
    } catch (error) {
      console.error("SessionService: Error logging auth state:", error);
      return false;
    }
  }
}
