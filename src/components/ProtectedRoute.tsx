
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { AuthStatus } from "@/hooks/auth/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

/**
 * Protected Route Component
 * Prevents unauthorized access to protected pages
 */
const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, session, isLoading, status, isInitialized } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(requireAdmin);
  
  // Add additional logging to help debug authentication status
  useEffect(() => {
    console.log("ProtectedRoute: Auth state", {
      hasUser: !!user,
      hasSession: !!session,
      isLoading,
      isInitialized,
      authStatus: status,
      path: location.pathname,
      requireAdmin
    });
  }, [user, session, isLoading, isInitialized, status, location.pathname, requireAdmin]);
  
  // Check admin status if required
  useEffect(() => {
    if (!requireAdmin || !user) {
      setIsCheckingAdmin(false);
      return;
    }

    // This would be where you'd check if the user is an admin
    // For now, we'll just assume all authenticated users are allowed
    setIsCheckingAdmin(false);
  }, [requireAdmin, user]);
  
  // If auth is still initializing or we're checking admin status, show loading
  if (isLoading || !isInitialized || isCheckingAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="ml-3 text-gray-600">
          Verifying authentication...
        </span>
      </div>
    );
  }
  
  // If not authenticated, redirect to login with return URL
  if (status !== AuthStatus.AUTHENTICATED || !session) {
    console.log("ProtectedRoute: Not authenticated, redirecting to login");
    
    toast({
      title: "Authentication Required",
      description: "Please log in to continue",
      variant: "destructive",
    });
    
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  // If we need admin and user is not admin, show unauthorized
  if (requireAdmin && isCheckingAdmin === false) {
    // This would be where you'd handle non-admin users
    // For now, we'll just assume all authenticated users are allowed
  }
  
  // User is authenticated and authorized
  return <>{children}</>;
};

export default ProtectedRoute;
