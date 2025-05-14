
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
import { Users, UserPlus, Search, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/use-auth';
import { createDefaultGym } from '@/hooks/auth/gym-service';

const MembersPage: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isQrCodeDialogOpen, setIsQrCodeDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch members using react-query with better error handling
  const { data: members, isLoading, isError, error } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      if (!user?.email) {
        console.log("No user email, creating default gym");
        await createDefaultGym(user);
        return [];
      }

      console.log("Fetching members for gym:", user.email);
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('gym_id', user.email);

      if (error) {
        console.error("Error fetching members:", error);
        throw new Error(error.message);
      }
      
      console.log("Members data:", data);
      return data || [];
    },
  });

  // Mutation for adding a new member with improved error handling
  const addMemberMutation = useMutation({
    mutationFn: async (newMemberName: string) => {
      if (!user?.email) {
        console.log("No user email found, attempting to create default gym");
        await createDefaultGym(user);
        throw new Error("No user email available");
      }

      console.log("Adding member with name:", newMemberName, "to gym:", user.email);
      
      // Generate a random QR code for the member
      const baseUrl = window.location.origin;
      const tempId = Math.random().toString(36).substring(2, 15);
      const memberUrl = `${baseUrl}/members/${tempId}`;
      const qrCodeDataUrl = await generateQRCode(memberUrl);
      
      const newMember = {
        first_name: newMemberName,
        last_name: '',
        email: '',
        gym_id: user.email,
        qr_code: qrCodeDataUrl || ''
      };
      
      console.log("Submitting new member to Supabase:", newMember);
      
      const { data, error } = await supabase
        .from('members')
        .insert([newMember])
        .select();

      if (error) {
        console.error("Error adding member:", error);
        throw new Error(error.message);
      }
      
      console.log("Member added successfully:", data);
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch members
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast({
        title: "Success",
        description: "Member added successfully",
      });
      setNewMemberName('');
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      console.error("Error in mutation:", error);
      toast({
        title: "Error",
        description: `Failed to add member: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Handlers
  const handleOpenDialog = () => setIsDialogOpen(true);
  const handleCloseDialog = () => setIsDialogOpen(false);

  const handleAddMember = async () => {
    if (newMemberName.trim() === '') {
      toast({
        title: "Error",
        description: "Member name cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    console.log("Attempting to add member:", newMemberName);
    await addMemberMutation.mutate(newMemberName);
  };

  const filteredMembers = members
    ? members.filter(member =>
        member.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.last_name && member.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleGenerateQrCode = async (memberId: string) => {
    setSelectedMemberId(memberId);
    const baseUrl = window.location.origin;
    const memberUrl = `${baseUrl}/members/${memberId}`;
    try {
      const qrCodeDataUrl = await generateQRCode(memberUrl);
      setQrCode(qrCodeDataUrl);
      setIsQrCodeDialogOpen(true);
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive"
      });
    }
  };

  const closeQrCodeDialog = () => {
    setIsQrCodeDialogOpen(false);
    setSelectedMemberId(null);
    setQrCode(null);
  };

  if (isLoading) return <div className="p-6">Loading members...</div>;
  
  if (isError) {
    console.error("Error details:", error);
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-red-500 mb-2">Error fetching members</h2>
        <p className="mb-4">{error instanceof Error ? error.message : "Unknown error occurred"}</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['members'] })}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <Button onClick={handleOpenDialog}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="text-center py-10">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No members</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new member.</p>
          <div className="mt-6">
            <Button onClick={handleOpenDialog}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="bg-white shadow-md rounded-md">
              <CardContent className="p-4">
                <Link to={`/members/${member.id}`} className="block hover:underline">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {member.first_name} {member.last_name}
                  </h2>
                </Link>
                <div className="flex justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/members/${member.id}`)}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleGenerateQrCode(member.id)}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>
              Enter the name of the new member to add to the gym.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                type="text"
                id="name"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="col-span-3"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={handleAddMember} 
              disabled={addMemberMutation.isPending || newMemberName.trim() === ''}
            >
              {addMemberMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQrCodeDialogOpen} onOpenChange={setIsQrCodeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Member QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to view member details.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            {qrCode && <img src={qrCode} alt="Member QR Code" />}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={closeQrCodeDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MembersPage;
