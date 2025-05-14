
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  
  useEffect(() => {
    if (isLoading) {
      return; // Wait for auth to initialize
    }
    
    if (!user) {
      navigate('/login');
    } else {
      navigate('/dashboard');
    }
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
