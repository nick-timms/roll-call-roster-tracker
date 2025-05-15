
import { toast } from '@/hooks/use-toast';
import { AuthError } from '../types';

/**
 * Error Service
 * Standardized error handling for authentication-related errors
 */
export class ErrorService {
  /**
   * Handle authentication errors with consistent behavior and messaging
   * @param error - Error object to handle
   * @param context - Contextual information about where the error occurred
   * @returns Standardized AuthError object
   */
  static handleAuthError(error: any, context: string): AuthError {
    console.error(`Auth error in ${context}:`, error);
    
    const standardError: AuthError = {
      message: 'An unexpected authentication error occurred',
      code: 'unknown_error',
      context,
      originalError: error
    };
    
    // Handle known Supabase error codes
    if (error?.code === 'auth/invalid-email') {
      standardError.message = 'Please enter a valid email address';
      standardError.code = 'invalid_email';
    } 
    else if (error?.code === 'auth/user-not-found' || 
             error?.message?.includes('user not found') || 
             error?.message?.includes('Invalid login')) {
      standardError.message = 'Invalid email or password';
      standardError.code = 'invalid_credentials';
    } 
    else if (error?.code === 'auth/wrong-password' || 
             error?.message?.includes('password')) {
      standardError.message = 'Invalid email or password';
      standardError.code = 'invalid_credentials';
    }
    else if (error?.code === 'auth/email-already-in-use' || 
             error?.message?.includes('already registered')) {
      standardError.message = 'This email is already registered';
      standardError.code = 'email_in_use';
    }
    else if (error?.code === 'auth/requires-recent-login' || 
             error?.message?.includes('token') || 
             error?.message?.includes('session')) {
      standardError.message = 'Your session has expired. Please sign in again';
      standardError.code = 'session_expired';
    }
    else if (error?.code === 'auth/network-request-failed' || 
             error?.message?.includes('network')) {
      standardError.message = 'Network error. Please check your connection';
      standardError.code = 'network_error';
    }
    else if (error?.code === 'auth/too-many-requests' || 
             error?.message?.includes('too many requests') ||
             error?.message?.includes('rate limit')) {
      standardError.message = 'Too many attempts. Please try again later';
      standardError.code = 'rate_limited';
    }
    // Use provided error message if available
    else if (error?.message) {
      standardError.message = error.message;
    }
    
    // Show toast for most errors unless suppressed
    toast({
      title: "Authentication Error",
      description: standardError.message,
      variant: "destructive",
    });
    
    return standardError;
  }
  
  /**
   * Handle session errors specifically
   */
  static handleSessionError(error: any): AuthError {
    return this.handleAuthError(error, 'session_management');
  }
  
  /**
   * Handle login errors specifically
   */
  static handleLoginError(error: any): AuthError {
    return this.handleAuthError(error, 'login');
  }
  
  /**
   * Handle signup errors specifically
   */
  static handleSignupError(error: any): AuthError {
    return this.handleAuthError(error, 'signup');
  }
  
  /**
   * Get a user-friendly error message based on error code
   */
  static getUserFriendlyMessage(errorCode: string): string {
    switch(errorCode) {
      case 'invalid_email':
        return 'Please enter a valid email address';
      case 'invalid_credentials':
        return 'Invalid email or password';
      case 'email_in_use':
        return 'This email is already registered';
      case 'session_expired':
        return 'Your session has expired. Please sign in again';
      case 'network_error':
        return 'Network error. Please check your connection';
      case 'rate_limited':
        return 'Too many attempts. Please try again later';
      default:
        return 'An error occurred. Please try again';
    }
  }
  
  /**
   * Get recommendations for resolving an error
   */
  static getErrorResolution(errorCode: string): string {
    switch(errorCode) {
      case 'invalid_email':
        return 'Check that your email is typed correctly';
      case 'invalid_credentials':
        return 'Check your email and password or reset your password';
      case 'email_in_use':
        return 'Try signing in instead, or use a different email';
      case 'session_expired':
        return 'Please sign in again to continue';
      case 'network_error':
        return 'Check your internet connection and try again';
      case 'rate_limited':
        return 'Wait a few minutes before trying again';
      default:
        return 'Try again or contact support if the problem persists';
    }
  }
}
