
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/hooks/useAuth';
import { AuthStatus } from '@/hooks/auth/types';

const Index = () => {
  const navigate = useNavigate();
  const { user, session, isLoading, status } = useAuth();
  const [hasRedirected, setHasRedirected] = useState(false);
  
  useEffect(() => {
    // Only redirect once auth state is fully determined and we haven't redirected yet
    if (!isLoading && !hasRedirected) {
      setHasRedirected(true); // Prevent multiple redirects
      
      console.log("Index page: Authentication status", { 
        status, 
        hasUser: !!user, 
        hasSession: !!session
      });
      
      if (user && session) {
        console.log("Index page: Redirecting to dashboard");
        navigate('/dashboard', { replace: true });
      } else {
        console.log("Index page: Redirecting to login");
        navigate('/login', { replace: true });
      }
    }
  }, [user, session, navigate, isLoading, hasRedirected, status]);
  
  // Return a loading indicator while auth state is being determined
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <span className="ml-3 text-gray-600">Verifying authentication...</span>
    </div>
  );
};

export default Index;
