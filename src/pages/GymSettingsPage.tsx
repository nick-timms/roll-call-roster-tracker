import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings } from 'lucide-react';
import { useAuth } from '@/hooks/auth/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { ensureGymExists } from '@/hooks/auth/gym-service';
import { GymDetails } from '@/hooks/auth/types';

const GymSettingsPage: React.FC = () => {
  const { toast } = useToast();
  const { user, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const [gymDetails, setGymDetails] = useState<GymDetails>({
    id: '',
    name: 'My Gym',
    phone: '',
    company_name: '',
    address: '',
    email: user?.email || ''
  });
  
  useEffect(() => {
    if (user?.email && session) {
      fetchGymDetails();
    }
  }, [user, session]);

  const fetchGymDetails = async () => {
    if (!user?.email || !session) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access gym settings",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setHasAttemptedFetch(true);
      
      // First try using the ensureGymExists function which handles retries internally
      const gymData = await ensureGymExists(user.email);
      
      if (gymData) {
        console.log("Found gym details using ensureGymExists:", gymData);
        setGymDetails({
          id: gymData.id || '',
          name: gymData.name || 'My Gym',
          phone: gymData.phone || '',
          company_name: gymData.company_name || '',
          address: gymData.address || '',
          email: user.email
        });
        return;
      }
      
      // Fallback to direct query if needed
      const { data: gyms, error } = await supabase
        .from('gyms')
        .select('id, name, phone, company_name, address, email')
        .eq('email', user.email)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching gym details:', error);
        toast({
          title: "Error",
          description: "Failed to load gym settings. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      if (gyms) {
        console.log("Found gym details:", gyms);
        setGymDetails({
          id: gyms.id || '',
          name: gyms.name || 'My Gym',
          phone: gyms.phone || '',
          company_name: gyms.company_name || '',
          address: gyms.address || '',
          email: gyms.email || user.email
        });
      } else {
        console.log("No gym found via direct query, creating new one");
        
        // Create a new gym
        const { data: newGym, error: insertError } = await supabase
          .from('gyms')
          .insert({ 
            email: user.email,
            name: 'My Gym' 
          })
          .select()
          .single();
          
        if (insertError) {
          console.error("Error creating gym:", insertError);
          toast({
            title: "Error",
            description: "Failed to create gym profile. Please try again.",
            variant: "destructive"
          });
          return;
        }
        
        if (newGym) {
          setGymDetails({
            id: newGym.id,
            name: newGym.name,
            phone: newGym.phone || '',
            company_name: newGym.company_name || '',
            address: newGym.address || '',
            email: newGym.email
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch gym details:', error);
      toast({
        title: "Connection Error",
        description: "Could not connect to the database. Try refreshing the page.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    fetchGymDetails();
  };

  const handleSaveChanges = async () => {
    if (!user?.email || !session) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to update settings",
        variant: "destructive"
      });
      return;
    }

    if (!gymDetails.name.trim()) {
      toast({
        title: "Missing Fields",
        description: "Gym name is required",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // If we have a gym ID, update it; otherwise try to create a new gym
      if (gymDetails.id) {
        console.log("Updating gym with ID:", gymDetails.id);
        
        const { error: updateError } = await supabase
          .from('gyms')
          .update({ 
            name: gymDetails.name,
            phone: gymDetails.phone,
            company_name: gymDetails.company_name,
            address: gymDetails.address
          })
          .eq('id', gymDetails.id);

        if (updateError) {
          console.error("Error updating gym:", updateError);
          throw updateError;
        }
        
        toast({
          title: "Success",
          description: "Gym settings updated successfully",
        });
      } else {
        console.log("Creating new gym for email:", user.email);
        
        const { data: newGym, error: insertError } = await supabase
          .from('gyms')
          .insert({ 
            name: gymDetails.name,
            phone: gymDetails.phone,
            company_name: gymDetails.company_name,
            address: gymDetails.address,
            email: user.email
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating gym:", insertError);
          throw insertError;
        }
        
        setGymDetails(prev => ({
          ...prev,
          id: newGym.id
        }));
        
        toast({
          title: "Success",
          description: "Gym created successfully",
        });
      }
    } catch (error: any) {
      console.error('Error updating gym settings:', error);
      toast({
        title: "Error",
        description: `Failed to save settings: ${error.message || "Unknown error"}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!session || !user) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex items-center justify-center h-40">
          <p className="text-zinc-500">Please log in to access gym settings</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold text-zinc-900">Gym Settings</h1>
        
        {hasAttemptedFetch && !gymDetails.id && !isLoading && (
          <Button 
            onClick={handleRetry} 
            variant="outline"
            disabled={isRetrying}
          >
            {isRetrying ? "Retrying..." : "Retry Connection"}
          </Button>
        )}
      </div>
      
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Gym Information</CardTitle>
          </div>
          <CardDescription>
            Manage your gym details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gymName">Gym Name*</Label>
              <Input
                id="gymName"
                value={gymDetails.name}
                onChange={(e) => setGymDetails({...gymDetails, name: e.target.value})}
                disabled={isLoading}
                className="border-zinc-200"
                placeholder="Enter gym name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={gymDetails.company_name || ''}
                onChange={(e) => setGymDetails({...gymDetails, company_name: e.target.value})}
                disabled={isLoading}
                className="border-zinc-200"
                placeholder="Legal company name (optional)"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={gymDetails.phone || ''}
                onChange={(e) => setGymDetails({...gymDetails, phone: e.target.value})}
                disabled={isLoading}
                className="border-zinc-200"
                placeholder="Contact phone number (optional)"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={gymDetails.address || ''}
                onChange={(e) => setGymDetails({...gymDetails, address: e.target.value})}
                disabled={isLoading}
                className="border-zinc-200"
                placeholder="Physical address (optional)"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="border-zinc-200 bg-zinc-100"
              />
              <p className="text-xs text-zinc-500">Email cannot be changed</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleSaveChanges} 
            className="bg-primary hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>
      
      <div className="bg-amber-50 border border-amber-100 rounded-md p-4">
        <h3 className="text-amber-800 font-medium">Note:</h3>
        <p className="text-amber-700 text-sm mt-1">
          Fields marked with * are required. All settings are associated with your account and will be visible to members.
        </p>
      </div>
    </div>
  );
};

export default GymSettingsPage;
