
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gymName, setGymName] = useState('');
  const [loading, setLoading] = useState(false);

  // Get user's email from auth context
  const userEmail = user?.email || '';

  useEffect(() => {
    // If there's already a gym set up, redirect to dashboard
    const gym = db.getGym();
    if (gym) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Create gym with user's authenticated email
    const gym = {
      id: generateId(),
      name: gymName,
      email: userEmail,
      createdAt: new Date().toISOString()
    };

    try {
      db.saveGym(gym);
      toast({
        title: "Gym Created",
        description: "Your gym account has been set up successfully!",
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating gym:', error);
      toast({
        title: "Error",
        description: "There was a problem creating your gym account.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <span className="text-white font-bold text-3xl">M</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">MatTrack</h1>
          <p className="text-gray-600 mt-1">BJJ Attendance Tracking System</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Setup</CardTitle>
            <CardDescription>Enter your gym's details to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gymName">Gym Name</Label>
                  <Input
                    id="gymName"
                    placeholder="Enter your gym name"
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userEmail}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">Using your account email</p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    'Create Gym Account'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetupPage;
