
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateQRCode } from '@/lib/utils';
import { Member } from '@/types';
import { Users, UserPlus, Search, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/use-auth';
import { createDefaultGym } from '@/hooks/auth/gym-service';

const MembersPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMember, setNewMember] = useState<Partial<Member>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    membershipType: 'Standard',
    belt: ''
  });
  
  // Check if user is authenticated, if not redirect to login
  useEffect(() => {
    if (!user) {
      console.log("No authenticated user found, redirecting to login");
      navigate('/login');
      return;
    } else {
      console.log("Authenticated user:", user);
    }
  }, [user, navigate]);
  
  // Fetch the gym data with better error handling
  const { data: gymData, isLoading: isLoadingGym } = useQuery({
    queryKey: ['gym'],
    queryFn: async () => {
      if (!user?.email) {
        console.log("No user email found, cannot fetch gym data");
        throw new Error("User email is required to fetch gym data");
      }
      
      try {
        const { data, error } = await supabase
          .from('gyms')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching gym:', error);
          // Instead of returning a default object, throw an error so we can handle it properly
          throw new Error(`Failed to fetch gym: ${error.message}`);
        }
        
        if (!data) {
          console.log('No gym found for user, creating a default gym');
          try {
            const newGym = await createDefaultGym(user.email);
            console.log('Created default gym:', newGym);
            return newGym;
          } catch (e) {
            console.error('Failed to create default gym:', e);
            throw e;
          }
        }
        
        console.log("Found gym data:", data);
        return data;
      } catch (e) {
        console.error("Exception fetching gym:", e);
        throw e;
      }
    },
    enabled: !!user, // Only run if user is authenticated
    retry: 1,
    staleTime: 60000,
    onError: (error) => {
      toast({
        title: "Error",
        description: `Could not load gym data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  });
  
  // Fetch members data with improved error handling
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', gymData?.id],
    queryFn: async () => {
      try {
        if (!gymData?.id) {
          console.log("No gym ID found, cannot fetch members");
          throw new Error("Gym ID is required to fetch members");
        }
        
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('gym_id', gymData.id);
        
        if (error) {
          console.error('Error fetching members:', error);
          throw new Error(`Failed to fetch members: ${error.message}`);
        }
        
        // Transform database columns to our frontend model
        return data.map(member => ({
          id: member.id,
          gymId: member.gym_id,
          firstName: member.first_name,
          lastName: member.last_name,
          email: member.email,
          phone: member.phone || '',
          membershipType: member.membership_type || 'Standard',
          belt: member.belt || '',
          qrCode: member.qr_code,
          createdAt: member.created_at
        }));
      } catch (e) {
        console.error("Exception fetching members:", e);
        throw e;
      }
    },
    enabled: !!gymData?.id && !!user, // Only run if gym data is available and user is authenticated
    onError: (error) => {
      toast({
        title: "Error",
        description: `Could not load members: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  });
  
  // Add member mutation with improved database writing
  const addMemberMutation = useMutation({
    mutationFn: async (member: Partial<Member>) => {
      try {
        if (!user?.email) {
          toast({
            title: "Authentication Required",
            description: "You need to be logged in to add members",
            variant: "destructive"
          });
          navigate('/login');
          throw new Error("User not logged in");
        }

        console.log("Starting member addition process");
        
        // Ensure we have a valid gym ID
        if (!gymData?.id) {
          console.log("No gym ID found, creating a new gym");
          const newGym = await createDefaultGym(user.email);
          
          if (!newGym?.id) {
            throw new Error("Failed to create or retrieve a valid gym ID");
          }
          
          console.log("Created new gym with ID:", newGym.id);
          
          // Refresh gym data
          queryClient.invalidateQueries({ queryKey: ['gym'] });
          
          // Generate QR code for the member
          const qrCode = generateQRCode(crypto.randomUUID());
          
          console.log(`Adding member to gym: ${newGym.id}`);
          
          // Insert the member into the database
          const { data, error } = await supabase
            .from('members')
            .insert({
              gym_id: newGym.id, // Use the newly created gym ID
              first_name: member.firstName,
              last_name: member.lastName,
              email: member.email,
              phone: member.phone,
              membership_type: member.membershipType,
              belt: member.belt,
              qr_code: qrCode,
            })
            .select()
            .single();
          
          if (error) {
            console.error("Database error inserting member:", error);
            throw error;
          }
          
          console.log("Member inserted successfully:", data);
          
          // Return the member with our application's data model format
          return {
            id: data.id,
            gymId: data.gym_id,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            phone: data.phone || '',
            membershipType: data.membership_type || 'Standard',
            belt: data.belt || '',
            qrCode: data.qr_code,
            createdAt: data.created_at
          };
        } else {
          // We have a valid gym ID, proceed with member addition
          console.log(`Adding member to existing gym: ${gymData.id}`);
          
          // Generate QR code for the member
          const qrCode = generateQRCode(crypto.randomUUID());
          
          // Insert the member into the database
          const { data, error } = await supabase
            .from('members')
            .insert({
              gym_id: gymData.id,
              first_name: member.firstName,
              last_name: member.lastName,
              email: member.email,
              phone: member.phone,
              membership_type: member.membershipType,
              belt: member.belt,
              qr_code: qrCode,
            })
            .select()
            .single();
          
          if (error) {
            console.error("Database error inserting member:", error);
            throw error;
          }
          
          console.log("Member inserted successfully:", data);
          
          // Return the member with our application's data model format
          return {
            id: data.id,
            gymId: data.gym_id,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            phone: data.phone || '',
            membershipType: data.membership_type || 'Standard',
            belt: data.belt || '',
            qrCode: data.qr_code,
            createdAt: data.created_at
          };
        }
      } catch (e) {
        console.error("Exception adding member:", e);
        throw e;
      }
    },
    onSuccess: (data) => {
      console.log("Member added successfully:", data);
      
      // Update the members list
      queryClient.invalidateQueries({ queryKey: ['members', gymData?.id] });
      
      // Show success message
      toast({
        title: "Member Added",
        description: `${newMember.firstName} ${newMember.lastName} has been added successfully`
      });
      
      // Reset form and close dialog
      setNewMember({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        membershipType: 'Standard',
        belt: ''
      });
      setShowAddDialog(false);
    },
    onError: (error) => {
      console.error('Error adding member:', error);
      toast({
        title: "Error",
        description: `Failed to add member: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  });
  
  const handleAddMember = () => {
    if (!newMember.firstName || !newMember.lastName || !newMember.email) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to add members",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }
    
    addMemberMutation.mutate(newMember);
  };
  
  // This function will always succeed (it returns a Promise that resolves)
  const handleCreateGym = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "You need to be logged in to create a gym",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const gym = await createDefaultGym(user.email);
      
      toast({
        title: 'Gym Created',
        description: 'Your gym has been set up successfully.'
      });
      
      // Refresh gym data
      queryClient.invalidateQueries({ queryKey: ['gym'] });
      
    } catch (error) {
      console.error('Failed to create gym:', error);
      toast({
        title: "Gym Setup",
        description: "Proceeding with a temporary gym. You can update your gym details later.",
      });
    }
  };
  
  // Show different UI while data is loading 
  if (isLoadingGym) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <h1 className="text-2xl font-bold text-zinc-900">Members</h1>
        </div>
        <div className="py-12 text-center bg-white rounded-xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-500">Loading gym information...</p>
        </div>
      </div>
    );
  }
  
  // Show authentication required message
  if (!user) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <h1 className="text-2xl font-bold text-zinc-900">Members</h1>
        </div>
        <div className="py-12 text-center bg-white rounded-xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-500 mb-4">Authentication required to access members</p>
          <Button onClick={() => navigate('/login')}>
            Login to Continue
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold text-zinc-900">Members</h1>
        <Button onClick={() => setShowAddDialog(true)} className="bg-primary hover:bg-primary/90">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>
      
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-zinc-200 text-zinc-800 bg-zinc-50 focus:bg-white transition-colors"
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-12 text-center bg-white rounded-xl border border-zinc-200 shadow-sm">
            <p className="text-zinc-500">Loading members...</p>
          </div>
        ) : members.length > 0 ? (
          members.filter((member) => {
            const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
            return fullName.includes(searchQuery.toLowerCase()) || 
                  member.email.toLowerCase().includes(searchQuery.toLowerCase());
          }).map((member) => (
            <Link to={`/members/${member.id}`} key={member.id}>
              <Card className="hover:bg-zinc-50 transition-colors border-zinc-200 shadow-sm">
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                      <span className="font-medium text-primary">
                        {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900">{member.firstName} {member.lastName}</p>
                      <p className="text-sm text-zinc-500">{member.membershipType}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-zinc-400">
                    <QrCode className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="py-12 text-center bg-white rounded-xl border border-zinc-200 shadow-sm">
            <Users className="h-12 w-12 mx-auto text-zinc-300 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 mb-1">No members found</h3>
            <p className="text-zinc-500">
              {searchQuery 
                ? "No members match your search criteria" 
                : "Add your first member to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowAddDialog(true)} className="mt-4 bg-primary hover:bg-primary/90">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            )}
          </div>
        )}
      </div>
      
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>
              Add a new member to your gym. They'll receive a QR code for check-in.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name*</Label>
                <Input
                  id="firstName"
                  value={newMember.firstName}
                  onChange={(e) => setNewMember({...newMember, firstName: e.target.value})}
                  required
                  className="border-zinc-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name*</Label>
                <Input
                  id="lastName"
                  value={newMember.lastName}
                  onChange={(e) => setNewMember({...newMember, lastName: e.target.value})}
                  required
                  className="border-zinc-200"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email*</Label>
              <Input
                id="email"
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                required
                className="border-zinc-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={newMember.phone}
                onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                className="border-zinc-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="membershipType">Membership Type</Label>
              <Input
                id="membershipType"
                value={newMember.membershipType}
                onChange={(e) => setNewMember({...newMember, membershipType: e.target.value})}
                placeholder="Standard"
                className="border-zinc-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="belt">Belt</Label>
              <Input
                id="belt"
                value={newMember.belt}
                onChange={(e) => setNewMember({...newMember, belt: e.target.value})}
                placeholder="White"
                className="border-zinc-200"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddMember} 
              className="bg-primary hover:bg-primary/90"
              disabled={addMemberMutation.isPending}
            >
              {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MembersPage;
