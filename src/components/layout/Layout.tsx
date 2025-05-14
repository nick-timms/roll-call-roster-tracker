
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
  LogOut,
  LayoutDashboard
} from 'lucide-react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";

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
    <SidebarProvider>
      <div className="min-h-screen flex flex-col bg-zinc-50">
        {gym && (
          <header className="bg-white border-b border-zinc-200 shadow-sm sticky top-0 z-10">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-base">M</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-zinc-900">MatTrack</h1>
                  <p className="text-xs text-zinc-500">{gym.name}</p>
                </div>
              </div>
              <div className="flex space-x-3 items-center">
                <SidebarTrigger className="md:hidden" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="hidden md:flex"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </Button>
              </div>
            </div>
          </header>
        )}
        
        <div className="flex flex-1">
          {gym && (
            <Sidebar>
              <SidebarHeader className="py-4">
                <div className="px-2 flex items-center">
                  <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                    <span className="text-white font-bold text-base">M</span>
                  </div>
                  <div className="ml-3">
                    <h1 className="text-lg font-bold text-sidebar-foreground">MatTrack</h1>
                    <p className="text-xs text-sidebar-foreground/70">{gym.name}</p>
                  </div>
                </div>
              </SidebarHeader>
              <SidebarContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/dashboard')}>
                      <Link to="/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/members')}>
                      <Link to="/members">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Members</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/scan')}>
                      <Link to="/scan">
                        <QrCode className="mr-2 h-4 w-4" />
                        <span>Scan QR Code</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/account')}>
                      <Link to="/account">
                        <User className="mr-2 h-4 w-4" />
                        <span>Gym Account</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarContent>
              <SidebarFooter>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="w-full justify-start mt-auto"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </SidebarFooter>
            </Sidebar>
          )}
          
          <main className="flex-1 p-4 md:p-6 max-w-full pb-20 md:pb-6">
            <Outlet />
          </main>
        </div>
        
        {/* Mobile Navigation */}
        {gym && (
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
              <Link to="/account" className="flex flex-col items-center p-2">
                <User className={`h-5 w-5 ${isActive('/account') ? 'text-primary' : 'text-zinc-500'}`} />
                <span className={`text-xs mt-1 ${isActive('/account') ? 'text-primary font-medium' : 'text-zinc-500'}`}>Account</span>
              </Link>
            </div>
          </nav>
        )}
      </div>
    </SidebarProvider>
  );
};

export default Layout;
