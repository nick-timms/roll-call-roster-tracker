import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/use-auth';
import { toast } from '@/components/ui/toaster';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User } from 'lucide-react';

interface SettingsDropdownProps {
  gymName: string;
}

const SettingsDropdown = ({ gymName: initialGymName }: SettingsDropdownProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [newGymName, setNewGymName] = useState(initialGymName || 'My Gym');
  const [isLoading, setIsLoading] = useState(false);
  const [gymId, setGymId] = useState<string | null>(null);

  useEffect(() => {
    if (initialGymName) {
      setNewGymName(initialGymName);
    }
  }, [initialGymName]);

  // Get gym ID when component mounts
  useEffect(() => {
    const fetchGymId = async () => {
      if (!user?.email) return;
      
      try {
        const { data: gyms, error } = await supabase
          .from('gyms')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
          
        if (error) {
          console.error('Error fetching gym ID:', error);
          return;
        }
        
        if (gyms) {
          setGymId(gyms.id);
        }
      } catch (error) {
        console.error('Failed to fetch gym ID:', error);
      }
    };
    
    fetchGymId();
  }, [user]);

  // Get initials for avatar
  const getUserInitials = () => {
    if (!user) return 'G';
    return (user.email?.charAt(0) || 'U').toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out",
        description: "You have been logged out of the system",
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const updateGymName = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "You must be logged in to update gym settings",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // If we have a gym ID, update it; otherwise create a new gym
      if (gymId) {
        const { error: updateError } = await supabase
          .from('gyms')
          .update({ name: newGymName })
          .eq('id', gymId);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Create a new gym if none exists
        const { error: insertError } = await supabase
          .from('gyms')
          .insert({ 
            name: newGymName,
            email: user.email
          });

        if (insertError) {
          throw insertError;
        }
      }

      toast({
        title: "Success",
        description: "Gym name updated successfully",
      });
      setIsUpdatingName(false);
      
      // Force refresh the page to update the gym name in the header
      window.location.reload();
    } catch (error) {
      console.error('Error updating gym name:', error);
      toast({
        title: "Error",
        description: "Failed to update gym name, but you can still use the app",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
            <DropdownMenuItem asChild>
              <Popover open={isUpdatingName} onOpenChange={setIsUpdatingName}>
                <PopoverTrigger asChild>
                  <button className="flex w-full cursor-default items-center px-2 py-1.5 text-sm">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Gym Settings</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-medium leading-none">Gym Settings</h4>
                    <div className="space-y-2">
                      <Label htmlFor="gymName">Gym Name</Label>
                      <Input 
                        id="gymName" 
                        value={newGymName} 
                        onChange={(e) => setNewGymName(e.target.value)} 
                        placeholder="Enter gym name"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        onClick={updateGymName} 
                        className="bg-primary hover:bg-primary/90"
                        disabled={isLoading || !newGymName.trim()}
                      >
                        {isLoading ? "Updating..." : "Update"}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-red-500">
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
