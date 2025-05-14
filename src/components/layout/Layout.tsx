
import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Users, 
  QrCode, 
  User,
  ArrowRight
} from 'lucide-react';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const gym = db.getGym();

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out? This is a demo app, so all data will be lost.")) {
      db.clearAll();
      toast({
        title: "Logged out",
        description: "You have been logged out of the system",
      });
      navigate('/');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  if (!gym && location.pathname !== '/') {
    // Redirect to setup if no gym is set up
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {gym && (
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">MatTrack</h1>
                <p className="text-xs text-gray-500">{gym.name}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="hidden md:flex"
              >
                Log Out
              </Button>
            </div>
          </div>
        </header>
      )}
      
      <div className="flex flex-1">
        {gym && (
          <aside className="hidden md:block w-64 bg-white border-r border-gray-200 p-4">
            <nav className="space-y-2">
              <Link to="/dashboard">
                <Button 
                  variant={isActive('/dashboard') ? "default" : "ghost"} 
                  className="w-full justify-start"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/members">
                <Button 
                  variant={isActive('/members') ? "default" : "ghost"} 
                  className="w-full justify-start"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Members
                </Button>
              </Link>
              <Link to="/scan">
                <Button 
                  variant={isActive('/scan') ? "default" : "ghost"} 
                  className="w-full justify-start"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Scan QR Code
                </Button>
              </Link>
              <Link to="/account">
                <Button 
                  variant={isActive('/account') ? "default" : "ghost"} 
                  className="w-full justify-start"
                >
                  <User className="mr-2 h-4 w-4" />
                  Gym Account
                </Button>
              </Link>
            </nav>
          </aside>
        )}
        
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>
      
      {/* Mobile Navigation */}
      {gym && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2">
          <div className="flex justify-around">
            <Link to="/dashboard" className="flex flex-col items-center p-2">
              <Calendar className={`h-5 w-5 ${isActive('/dashboard') ? 'text-blue-600' : 'text-gray-500'}`} />
              <span className={`text-xs mt-1 ${isActive('/dashboard') ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>Dashboard</span>
            </Link>
            <Link to="/members" className="flex flex-col items-center p-2">
              <Users className={`h-5 w-5 ${isActive('/members') ? 'text-blue-600' : 'text-gray-500'}`} />
              <span className={`text-xs mt-1 ${isActive('/members') ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>Members</span>
            </Link>
            <Link to="/scan" className="flex flex-col items-center p-2">
              <QrCode className={`h-5 w-5 ${isActive('/scan') ? 'text-blue-600' : 'text-gray-500'}`} />
              <span className={`text-xs mt-1 ${isActive('/scan') ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>Scan</span>
            </Link>
            <Link to="/account" className="flex flex-col items-center p-2">
              <User className={`h-5 w-5 ${isActive('/account') ? 'text-blue-600' : 'text-gray-500'}`} />
              <span className={`text-xs mt-1 ${isActive('/account') ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>Account</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
