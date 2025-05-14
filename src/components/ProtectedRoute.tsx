
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, session, isLoading } = useAuth();
  const location = useLocation();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Only set redirect state once loading is complete and we know user is null
        if (!isLoading) {
          if (!user || !session) {
            console.log("Protected route: No authenticated user found, redirecting to login");
            setShouldRedirect(true);
          } else {
            console.log("Protected route: Authenticated user found", { 
              email: user.email, 
              hasSession: !!session,
              sessionExpires: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown'
            });
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
