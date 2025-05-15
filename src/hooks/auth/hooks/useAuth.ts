
// Re-export the auth hooks from auth-context
export { useAuthContext as useAuth } from '../auth-context';

// Also re-export the other hooks for convenience
export { useAuthState } from './useAuthState';
export { useAuthRedirect } from './useAuthRedirect';
export { useOnboarding } from './useOnboarding';
