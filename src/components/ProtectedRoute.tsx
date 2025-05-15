
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/auth/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SessionService } from "@/hooks/auth/services/SessionService";
import { UserService } from "@/hooks/auth/services/UserService";
import { AuthStatus } from "@/hooks/auth/types";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

/**
 * Protected Route Component
 * Prevents unauthorized access to protected pages
 */
const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, session, isLoading, recoverDatabaseConnection } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  // Check authentication when the component mounts
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Log the current state for debugging
        console.log("Protected route: Checking authentication", {
          userExists: !!user,
          sessionExists: !!session,
          isLoading,
          path: location.pathname,
          requireAdmin
        });
        
        // If authentication is still loading, wait
        if (isLoading) {
          return;
        }
        
        // First check: do we have a user and session?
        if (!user || !session) {
          console.log("Protected route: No authenticated user or session found");
          
          // Try to double-check with Supabase directly
          const { session: directSession } = await SessionService.getCurrentSession();
          
          if (!directSession?.user) {
            console.log("Protected route: No authenticated user found, redirecting to login");
            
            toast({
              title: "Authentication Required",
              description: "Please log in to continue",
              variant: "destructive",
            });
            
            setShouldRedirect(true);
            setIsCheckingAuth(false);
            return;
          }
          
          // We found a valid session directly from Supabase
          console.log("Protected route: Found valid session directly from Supabase");
        }
        
        // Second check (if needed): is this a protected admin route?
        if (requireAdmin && isAdmin === null) {
          // Only fetch admin status if we need to and haven't already
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const adminStatus = currentUser ? 
            await UserService.isUserAdmin(currentUser.id) : false;
            
          setIsAdmin(adminStatus);
          
          if (!adminStatus) {
            console.log("Protected route: User is not an admin, redirecting");
            
            toast({
              title: "Access Denied",
              description: "You don't have permission to access this page",
              variant: "destructive",
            });
            
            setShouldRedirect(true);
            setIsCheckingAuth(false);
            return;
          }
        }
        
        // Verify database connection works
        const dbStatus = await SessionService.checkDatabaseConnection();
        if (!dbStatus.success) {
          console.warn("Protected route: Database connectivity issues detected:", dbStatus.message);
          
          if (dbStatus.authStatus === 'expired' || dbStatus.authStatus === 'invalid') {
            console.log("Attempting session recovery...");
            const recovered = await recoverDatabaseConnection();
            if (!recovered) {
              console.warn("Session recovery failed");
            }
          }
        }
        
        // If we got here, authentication and permissions are valid
        setShouldRedirect(false);
        setIsCheckingAuth(false);
      } catch (error) {
        console.error("Error validating authentication in protected route:", error);
        
        const recovered = await recoverDatabaseConnection();
        if (!recovered) {
          setShouldRedirect(true);
        }
        
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [isLoading, user, session, recoverDatabaseConnection, location.pathname, requireAdmin, toast]);
  
  // Show loading state while checking auth
  if (isLoading || isCheckingAuth) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Verifying authentication...</span>
      </div>
    );
  }
  
  // Redirect to login if not authenticated or not authorized
  if (shouldRedirect) {
    // Store the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  // User is authenticated and authorized
  return <>{children}</>;
};

export default ProtectedRoute;
