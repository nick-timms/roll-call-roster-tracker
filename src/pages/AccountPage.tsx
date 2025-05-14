
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { User, Settings } from 'lucide-react';

const AccountPage: React.FC = () => {
  const { toast } = useToast();
  
  const gym = db.getGym();
  const membersCount = db.getMembers().length;
  const attendanceCount = db.getAttendanceRecords().length;
  
  const [gymDetails, setGymDetails] = useState({
    name: gym?.name || '',
    email: gym?.email || ''
  });
  
  const [editing, setEditing] = useState(false);
  
  const handleSaveChanges = () => {
    if (!gym) return;
    
    if (!gymDetails.name || !gymDetails.email) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    try {
      db.saveGym({
        ...gym,
        name: gymDetails.name,
        email: gymDetails.email
      });
      
      toast({
        title: "Changes Saved",
        description: "Your gym details have been updated",
      });
      
      setEditing(false);
    } catch (error) {
      console.error('Error updating gym:', error);
      toast({
        title: "Error",
        description: "There was a problem updating your gym details",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold">Gym Account</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{membersCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Account Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {gym && new Date(gym.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Gym Information
          </CardTitle>
          <CardDescription>
            Manage your gym account information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gym && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gymName">Gym Name</Label>
                <Input
                  id="gymName"
                  value={gymDetails.name}
                  onChange={(e) => setGymDetails({...gymDetails, name: e.target.value})}
                  disabled={!editing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={gymDetails.email}
                  onChange={(e) => setGymDetails({...gymDetails, email: e.target.value})}
                  disabled={!editing}
                />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveChanges}>
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Edit Details
            </Button>
          )}
        </CardFooter>
      </Card>
      
      <div className="bg-red-50 border border-red-100 rounded-md p-4">
        <h3 className="text-red-800 font-medium">Demo Application Notice</h3>
        <p className="text-red-700 text-sm mt-1">
          This is a demo application using localStorage for data storage. 
          In a production environment, data would be securely stored in a database.
          All data will be lost if you clear your browser data or use incognito mode.
        </p>
      </div>
    </div>
  );
};

export default AccountPage;
