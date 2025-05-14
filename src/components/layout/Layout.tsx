import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/auth/use-auth';
import { supabase } from '@/integrations/supabase/client';
import SettingsDropdown from './SettingsDropdown';
import { 
  Users, 
  QrCode, 
  User,
  LayoutDashboard,
  Settings
} from 'lucide-react';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [gymName, setGymName] = useState('My Gym');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const fetchGymDetails = async () => {
      if (!user?.email) return;
      
      try {
        setIsLoading(true);
        const { data: gyms, error } = await supabase
          .from('gyms')
          .select('name')
          .eq('email', user.email)
          .maybeSingle();
          
        if (error) {
          console.error('Error fetching gym details:', error);
          return;
        }
        
        if (gyms && gyms.name) {
          console.log("Found gym name:", gyms.name);
          setGymName(gyms.name);
        } else {
          console.log("No gym found or no name set, using default");
        }
      } catch (error) {
        console.error('Failed to fetch gym details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user?.email) {
      fetchGymDetails();
    }
  }, [user]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      {user && (
        <header className="bg-white border-b border-zinc-200 shadow-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/46cafb72-bfce-40a5-b4b9-8c670433468d.png" 
                alt="MatTrack Logo" 
                className="h-8"
              />
              <p className="text-xs text-zinc-500"></p>
            </div>
            <div className="flex space-x-3 items-center">
              <SettingsDropdown gymName={gymName} />
            </div>
          </div>
        </header>
      )}
      
      <div className="flex flex-1">
        {user && (
          <aside className="hidden md:block w-56 bg-zinc-50 border-r border-zinc-200 p-4 sticky top-16 h-[calc(100vh-4rem)]">
            <nav className="space-y-1.5">
              <Link to="/dashboard">
                <Button 
                  variant={isActive('/dashboard') ? "default" : "ghost"} 
                  className="w-full justify-start text-sm font-medium"
                  size="sm"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/members">
                <Button 
                  variant={isActive('/members') ? "default" : "ghost"} 
                  className="w-full justify-start text-sm font-medium"
                  size="sm"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Members
                </Button>
              </Link>
              <Link to="/scan">
                <Button 
                  variant={isActive('/scan') ? "default" : "ghost"} 
                  className="w-full justify-start text-sm font-medium"
                  size="sm"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Scan QR Code
                </Button>
              </Link>
              <Link to="/account">
                <Button 
                  variant={isActive('/account') ? "default" : "ghost"} 
                  className="w-full justify-start text-sm font-medium"
                  size="sm"
                >
                  <User className="mr-2 h-4 w-4" />
                  Gym Account
                </Button>
              </Link>
              <Link to="/settings">
                <Button 
                  variant={isActive('/settings') ? "default" : "ghost"} 
                  className="w-full justify-start text-sm font-medium"
                  size="sm"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Gym Settings
                </Button>
              </Link>
            </nav>
          </aside>
        )}
        
        <main className="flex-1 p-4 md:p-6 max-w-full">
          <Outlet />
        </main>
      </div>
      
      {/* Mobile Navigation */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 p-1 shadow-md z-10">
          <div className="flex justify-around">
            <Link to="/dashboard" className="flex flex-col items-center p-2">
              <LayoutDashboard className={`h-5 w-5 ${isActive('/dashboard') ? 'text-primary' : 'text-zinc-500'}`} />
              <span className={`text-xs mt-1 ${isActive('/dashboard') ? 'text-primary font-medium' : 'text-zinc-500'}`}>Dashboard</span>
            </Link>
            <Link to="/members" className="flex flex-col items-center p-2">
              <Users className={`h-5 w-5 ${isActive('/members') ? 'text-primary' : 'text-zinc-500'}`} />
              <span className={`text-xs mt-1 ${isActive('/members') ? 'text-primary font-medium' : 'text-zinc-500'}`}>Members</span>
            </Link>
            <Link to="/scan" className="flex flex-col items-center p-2">
              <QrCode className={`h-5 w-5 ${isActive('/scan') ? 'text-primary' : 'text-zinc-500'}`} />
              <span className={`text-xs mt-1 ${isActive('/scan') ? 'text-primary font-medium' : 'text-zinc-500'}`}>Scan</span>
            </Link>
            <Link to="/settings" className="flex flex-col items-center p-2">
              <Settings className={`h-5 w-5 ${isActive('/settings') ? 'text-primary' : 'text-zinc-500'}`} />
              <span className={`text-xs mt-1 ${isActive('/settings') ? 'text-primary font-medium' : 'text-zinc-500'}`}>Settings</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
