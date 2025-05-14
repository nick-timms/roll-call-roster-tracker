
import { useAuthContext } from './auth-context';

export const useAuth = () => {
  const context = useAuthContext();
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
