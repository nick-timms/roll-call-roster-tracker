
import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthStatus } from '../types';

interface UseAuthRedirectOptions {
  loginPath?: string;
  homePath?: string;
  onboardingPath?: string;
  unauthorizedPath?: string;
}

/**
 * Hook for handling authentication-related navigation
 */
export const useAuthRedirect = (status: AuthStatus, options: UseAuthRedirectOptions = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    loginPath = '/login',
    homePath = '/dashboard',
    onboardingPath = '/onboarding',
    unauthorizedPath = '/unauthorized'
  } = options;
  
  // Redirect to login page
  const redirectToLogin = useCallback((replace: boolean = true) => {
    const returnUrl = location.pathname !== loginPath ? 
      `?returnUrl=${encodeURIComponent(location.pathname + location.search)}` : '';
      
    navigate(`${loginPath}${returnUrl}`, { replace });
  }, [navigate, location, loginPath]);
  
  // Redirect to home/dashboard
  const redirectToHome = useCallback((replace: boolean = true) => {
    navigate(homePath, { replace });
  }, [navigate, homePath]);
  
  // Redirect to onboarding
  const redirectToOnboarding = useCallback((step?: number, replace: boolean = true) => {
    const path = step ? `${onboardingPath}/${step}` : onboardingPath;
    navigate(path, { replace });
  }, [navigate, onboardingPath]);
  
  // Redirect unauthorized users
  const redirectUnauthorized = useCallback(() => {
    navigate(unauthorizedPath, { replace: true });
  }, [navigate, unauthorizedPath]);
  
  // Get return URL from query params
  const getReturnUrl = useCallback(() => {
    const params = new URLSearchParams(location.search);
    return params.get('returnUrl') || homePath;
  }, [location.search, homePath]);
  
  // Redirect to saved return URL
  const redirectToReturnUrl = useCallback((replace: boolean = true) => {
    const returnUrl = getReturnUrl();
    navigate(returnUrl, { replace });
  }, [navigate, getReturnUrl]);

  return {
    redirectToLogin,
    redirectToHome,
    redirectToOnboarding,
    redirectUnauthorized,
    getReturnUrl,
    redirectToReturnUrl,
    // Current status helpers
    isAuthenticated: status === AuthStatus.AUTHENTICATED,
    isUnauthenticated: status === AuthStatus.UNAUTHENTICATED,
    isLoading: status === AuthStatus.LOADING,
    currentPath: location.pathname,
  };
};
