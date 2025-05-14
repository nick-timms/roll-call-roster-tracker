import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { User, Settings, Users, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

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
        <h1 className="text-2xl font-bold text-zinc-900">Gym Account</h1>
      </div>
      
      <div className="grid gap-5 md:grid-cols-3">
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{membersCount}</div>
            <p className="text-xs text-zinc-500 mt-1">All registered members</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{attendanceCount}</div>
            <p className="text-xs text-zinc-500 mt-1">Across all members</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Account Created</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-zinc-900">
              {gym ? new Date(gym.createdAt).toLocaleDateString() : 'N/A'}
            </div>
            <p className="text-xs text-zinc-500 mt-1">Date of registration</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Gym Information</CardTitle>
          </div>
          <CardDescription>
            View basic gym information. For detailed settings, visit the <Link to="/settings" className="text-primary hover:underline">Gym Settings</Link> page.
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
                  className="border-zinc-200"
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
                  className="border-zinc-200"
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
              <Button onClick={handleSaveChanges} className="bg-primary hover:bg-primary/90">
                Save Changes
              </Button>
            </>
          ) : (
            <div className="flex space-x-3">
              <Button onClick={() => setEditing(true)} className="bg-primary hover:bg-primary/90">
                <Settings className="mr-2 h-4 w-4" />
                Edit Basic Info
              </Button>
              <Button variant="outline" asChild>
                <Link to="/settings">
                  Advanced Settings
                </Link>
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
      
      <div className="bg-amber-50 border border-amber-100 rounded-md p-4">
        <h3 className="text-amber-800 font-medium">Demo Application Notice</h3>
        <p className="text-amber-700 text-sm mt-1">
          This is a demo application using localStorage for data storage. 
          In a production environment, data would be securely stored in a database.
          All data will be lost if you clear your browser data or use incognito mode.
        </p>
      </div>
    </div>
  );
};

export default AccountPage;
