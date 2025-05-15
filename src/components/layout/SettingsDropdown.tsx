
import React from 'react';
import { useAuth } from '@/hooks/auth/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SettingsDropdownProps {
  gymName: string;
}

const SettingsDropdown = ({ gymName }: SettingsDropdownProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Get initials for avatar
  const getUserInitials = () => {
    if (!user) return 'G';
    return (user.email?.charAt(0) || 'U').toUpperCase();
  };

  const handleLogout = async () => {
    try {
      console.log("Logout button clicked");
      
      // Call the signOut function from auth context
      await signOut();
      // Navigation is handled in the signOut function
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {user ? (
          <>
            <div className="px-2 py-1.5 text-sm font-medium">
              <p className="text-muted-foreground text-xs">Signed in as</p>
              <p className="truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Gym Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-red-500 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onClick={handleLogin}>
            <User className="mr-2 h-4 w-4" />
            <span>Log In</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SettingsDropdown;
