
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  
  useEffect(() => {
    // Only redirect once auth state is determined and component is mounted
    if (!isLoading) {
      console.log("Auth state determined, redirecting", { user: !!user });
      
      if (user) {
        console.log("User is authenticated, redirecting to dashboard");
        navigate('/dashboard', { replace: true });
        toast({
          title: "Welcome back",
          description: "You have been redirected to your dashboard"
        });
      } else {
        console.log("User is not authenticated, redirecting to login");
        navigate('/login', { replace: true });
      }
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
