
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';

const Index = () => {
  const navigate = useNavigate();
  const gym = db.getGym();
  
  useEffect(() => {
    // If gym exists, redirect to dashboard, otherwise stay on the setup page
    if (gym) {
      navigate('/dashboard');
    }
  }, [gym, navigate]);
  
  return null; // This component doesn't render anything, it's just for redirection
};

export default Index;
