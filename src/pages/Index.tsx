
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
      return;
    }
    
    // User is authenticated, redirect directly to dashboard
    navigate('/dashboard');
    
  }, [user, navigate, isLoading]);
  
  return null; // This component doesn't render anything, it's just for redirection
};

export default Index;
