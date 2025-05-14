
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { supabase, logAuthState } from "@/integrations/supabase/client";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, session, isLoading } = useAuth();
  const location = useLocation();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  useEffect(() => {
    // Verify authentication status when the component mounts or dependencies change
    const checkAuth = async () => {
      try {
        // Log the current state for debugging
        console.log("Protected route: Checking authentication", {
          userExists: !!user,
          sessionExists: !!session,
          isLoading
        });
        
        // Only proceed once the auth loading state is complete
        if (!isLoading) {
          // If we don't have a user or session, check with Supabase directly as a fallback
          if (!user || !session) {
            console.log("Protected route: No authenticated user in context, checking with Supabase directly");
            
            // Log current auth state
            await logAuthState();
            
            // Get session directly from Supabase
            const { data: { session: directSession } } = await supabase.auth.getSession();
            
            if (directSession?.user) {
              console.log("Protected route: Found valid session directly from Supabase");
              // We found a valid session, don't redirect
              setShouldRedirect(false);
            } else {
              console.log("Protected route: No authenticated user found, redirecting to login");
              setShouldRedirect(true);
            }
          } else {
            // We have both user and session in context
            console.log("Protected route: Authenticated user found", { 
              email: user.email, 
              hasSession: !!session,
              sessionExpires: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown'
            });
            setShouldRedirect(false);
          }
          
          setIsCheckingAuth(false);
        }
      } catch (error) {
        console.error("Error validating authentication in protected route:", error);
        setShouldRedirect(true);
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [isLoading, user, session]);
  
  // Show loading state while checking auth
  if (isLoading || isCheckingAuth) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Verifying authentication...</span>
      </div>
    );
  }
  
  if (shouldRedirect) {
    // Use replace: true to prevent building up history stack
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
