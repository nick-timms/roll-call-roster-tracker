import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/auth/use-auth';

const SetupPage: React.FC = () => {
  const [gymName, setGymName] = useState('');
  const [email, setEmail] = useState('');
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!gymName || !email) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Placeholder for actual setup logic (e.g., saving to database)
    console.log("Gym Name:", gymName);
    console.log("Email:", email);
    
    toast({
      title: "Setup Complete",
      description: "Your gym is now set up!",
    });
    
    navigate('/dashboard');
  };
  
  return (
    <div className="flex items-center justify-center h-screen bg-zinc-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Gym Setup</CardTitle>
          <CardDescription>
            Enter your gym details to complete the setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gymName">Gym Name</Label>
              <Input
                id="gymName"
                type="text"
                placeholder="Enter gym name"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <Button type="submit" className="w-full">
              Complete Setup
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          {user && (
            <p className="text-sm text-zinc-500">
              Logged in as: {user.email}
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default SetupPage;
