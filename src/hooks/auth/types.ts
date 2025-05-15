
import { Session, User } from '@supabase/supabase-js';

// Authentication state
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: AuthError | null;
  lastTokenRefresh: number;
}

// Standard authentication error format
export interface AuthError {
  message: string;
  code: string;
  context: string;
  originalError?: any;
  resolution?: string;
}

// Auth context interface
export interface AuthContextType extends AuthState {
  // Core authentication methods
  signUp: (email: string, password: string, gymName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  
  // Session management
  refreshSession: () => Promise<boolean>;
  recoverDatabaseConnection: () => Promise<boolean>;
  
  // Password management
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  
  // Utility methods
  clearError: () => void;
  
  // Authentication status
  status: AuthStatus;
}

// Gym details type
export interface GymDetails {
  id: string;
  name: string;
  phone?: string;
  company_name?: string;
  address?: string;
  email: string;
}

// Authentication status enum
export enum AuthStatus {
  UNKNOWN = 'unknown',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  LOADING = 'loading',
  ERROR = 'error',
}

// User onboarding state
export interface OnboardingState {
  isComplete: boolean;
  currentStep: number;
  totalSteps: number;
  hasViewedTutorial: boolean;
}
