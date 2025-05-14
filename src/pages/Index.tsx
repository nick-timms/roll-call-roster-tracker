
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [hasRedirected, setHasRedirected] = useState(false);
  
  useEffect(() => {
    // Only redirect once the auth state is determined and we haven't redirected yet
    if (!isLoading && !hasRedirected) {
      setHasRedirected(true); // Prevent multiple redirects
      
      if (user) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }
  }, [user, navigate, isLoading, hasRedirected]);
  
  // Return a loading indicator while auth state is being determined
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <span className="ml-3 text-gray-600">Loading...</span>
    </div>
  );
};

export default Index;
