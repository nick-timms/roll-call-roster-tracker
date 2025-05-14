
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import { useAuth } from '@/hooks/use-auth';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const gym = db.getGym();
  
  useEffect(() => {
    if (isLoading) {
      return; // Wait for auth to initialize
    }
    
    if (!user) {
      navigate('/login');
      return;
    }
    
    // If gym exists, redirect to dashboard, otherwise stay on the setup page
    if (gym) {
      navigate('/dashboard');
    } else {
      navigate('/setup');
    }
  }, [user, gym, navigate, isLoading]);
  
  return null; // This component doesn't render anything, it's just for redirection
};

export default Index;
