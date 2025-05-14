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
import { toast } from '@/components/ui/toaster';
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

  // Fetch members using react-query
  const { data: members, isLoading, isError } = useQuery<Member[], Error>(
    'members',
    async () => {
      if (!user?.email) return [];

      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('gym_id', user.email);

      if (error) {
        console.error("Error fetching members:", error);
        throw new Error(error.message);
      }
      return data || [];
    }
  );

  useEffect(() => {
    if (!user?.email) {
      console.log("User email not found, creating default gym");
      createDefaultGym();
    }
  }, [user]);

  // Mutation for adding a new member
  const addMemberMutation = useMutation(
    async (newMemberName: string) => {
      if (!user?.email) throw new Error("User email not found");

      const { data, error } = await supabase
        .from('members')
        .insert([{ name: newMemberName, gym_id: user.email }]);

      if (error) {
        console.error("Error adding member:", error);
        throw new Error(error.message);
      }
      return data;
    },
    {
      onSuccess: () => {
        // Invalidate and refetch members
        queryClient.invalidateQueries('members');
        toast({
          title: "Success",
          description: "Member added successfully",
        });
        setNewMemberName('');
        setIsDialogOpen(false);
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: "Failed to add member",
          variant: "destructive"
        });
        console.error("Error adding member:", error);
      }
    }
  );

  // Handlers
  const handleOpenDialog = () => setIsDialogOpen(true);
  const handleCloseDialog = () => setIsDialogOpen(false);

  const handleAddMember = async () => {
    if (newMemberName.trim() === '') return;
    await addMemberMutation.mutateAsync(newMemberName);
  };

  const filteredMembers = members
    ? members.filter(member =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase())
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

  if (isLoading) return <div>Loading members...</div>;
  if (isError) return <div>Error fetching members.</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
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

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredMembers.map((member) => (
          <Card key={member.id} className="bg-white shadow-md rounded-md">
            <CardContent className="p-4">
              <Link to={`/members/${member.id}`} className="block hover:underline">
                <h2 className="text-lg font-semibold text-gray-800">{member.name}</h2>
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
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleAddMember} disabled={addMemberMutation.isLoading}>
              {addMemberMutation.isLoading ? "Adding..." : "Add Member"}
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
