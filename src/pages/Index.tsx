
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { AuthStatus } from '@/hooks/auth/types';

const Index = () => {
  const navigate = useNavigate();
  const { user, session, isLoading, status } = useAuth();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  
  useEffect(() => {
    console.log("Index page: Initial render", { 
      hasUser: !!user, 
      hasSession: !!session,
      isLoading,
      authStatus: status,
      redirectAttempted
    });
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (!redirectAttempted) {
        console.log("Index page: Timeout reached, forcing navigation to login");
        setRedirectAttempted(true);
        navigate('/login', { replace: true });
      }
    }, 3000); // 3 second timeout
    
    // Only redirect once auth state is determined or after a reasonable timeout
    if (!isLoading && !redirectAttempted) {
      console.log("Index page: Auth state determined", { 
        hasUser: !!user, 
        hasSession: !!session,
        authStatus: status
      });
      
      setRedirectAttempted(true); // Mark that we've attempted a redirect
      
      if (status === AuthStatus.AUTHENTICATED) {
        console.log("Index page: Redirecting to dashboard");
        navigate('/dashboard', { replace: true });
      } else if (status === AuthStatus.ERROR) {
        console.log("Index page: Auth error, redirecting to login");
        navigate('/login', { replace: true });
      } else {
        console.log("Index page: Not authenticated, redirecting to login");
        navigate('/login', { replace: true });
      }
    }
    
    return () => clearTimeout(timeoutId);
  }, [user, session, navigate, isLoading, status, redirectAttempted]);
  
  // Return a loading indicator while auth state is being determined
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <span className="ml-3 text-gray-600">
        {status === AuthStatus.ERROR 
          ? "Authentication error. Redirecting to login..." 
          : "Verifying authentication..."}
      </span>
    </div>
  );
};

export default Index;
