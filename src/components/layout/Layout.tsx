
import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/ui/sidebar';
import { SettingsDropdown } from './SettingsDropdown';
import { useMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { GymLogo } from '../GymLogo'; 

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [gymName, setGymName] = useState('');

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    // Fetch the gym name if user is logged in
    const fetchGymName = async () => {
      if (!user) return;
      
      try {
        console.log("Fetching gym name for user:", user.id);
        
        const { data: gyms, error } = await supabase
          .from('gyms')
          .select('name')
          .eq('owner_id', user.id)
          .maybeSingle();
          
        if (error) {
          console.error("Error fetching gym name:", error);
          return;
        }
        
        // Type guard to check if gyms is an object with a name property
        if (gyms && typeof gyms === 'object' && 'name' in gyms && gyms.name) {
          console.log("Found gym name:", gyms.name);
          setGymName(gyms.name);
        } else {
          console.log("No gym name found");
        }
      } catch (error) {
        console.error("Failed to fetch gym name:", error);
      }
    };
    
    fetchGymName();
  }, [user]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <GymLogo gymName={gymName || "MatTrack"} />
          </div>
          
          <div className="flex-1 py-4">
            <nav className="space-y-1 px-2">
              <Link 
                to="/dashboard" 
                className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${isActive('/dashboard') ? 'bg-primary text-primary-foreground' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                Dashboard
              </Link>
              
              <Link 
                to="/members" 
                className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${isActive('/members') ? 'bg-primary text-primary-foreground' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                Members
              </Link>
              
              <Link 
                to="/scan" 
                className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${isActive('/scan') ? 'bg-primary text-primary-foreground' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                Scan Attendance
              </Link>
              
              <Link 
                to="/settings" 
                className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${isActive('/settings') ? 'bg-primary text-primary-foreground' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                Settings
              </Link>
            </nav>
          </div>
          
          <div className="p-4 border-t">
            <Button 
              variant="outline" 
              className="w-full justify-start text-gray-700"
              onClick={handleSignOut}
            >
              Sign out
            </Button>
          </div>
        </div>
      </Sidebar>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top navbar */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-md text-gray-500 hover:text-gray-900 focus:outline-none"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 6h16M4 12h16m-7 6h7" 
                  />
                </svg>
              </button>
              <div className="ml-4 md:hidden">
                <GymLogo gymName={gymName || "MatTrack"} small />
              </div>
            </div>
            
            <div className="flex items-center">
              <SettingsDropdown onSignOut={handleSignOut} />
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
