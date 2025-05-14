
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
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
    
    // Check if gym exists once we know the user is authenticated
    const gym = db.getGym();
    
    // If gym exists, redirect to dashboard, otherwise stay on the setup page
    if (gym) {
      navigate('/dashboard');
    } else {
      navigate('/setup');
    }
  }, [user, navigate, isLoading]);
  
  return null; // This component doesn't render anything, it's just for redirection
};

export default Index;
