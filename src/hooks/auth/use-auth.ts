
// This file ensures the proper export structure for the auth hooks
import { useAuthContext } from './auth-context';

// Re-export the hook with the same name as what components expect
export const useAuth = () => {
  return useAuthContext();
};
