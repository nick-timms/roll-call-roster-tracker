
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [redirectTimeout, setRedirectTimeout] = useState<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear any existing timeout when component unmounts or dependencies change
    return () => {
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
  }, [redirectTimeout]);
  
  useEffect(() => {
    if (isLoading) {
      return; // Wait for auth to initialize
    }
    
    // Set a timeout to prevent infinite loading if there's an issue
    const timeout = setTimeout(() => {
      if (user) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }, 500); // Small delay to ensure state is stable
    
    setRedirectTimeout(timeout);
    
  }, [user, navigate, isLoading]);
  
  // Return a loading indicator while auth state is being determined
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <span className="ml-3 text-gray-600">Loading...</span>
    </div>
  );
};

export default Index;
