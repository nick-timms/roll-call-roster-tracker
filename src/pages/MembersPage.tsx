
import React, { useState } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const MembersPage: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isQrCodeDialogOpen, setIsQrCodeDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch members using react-query with better error handling and offline support
  const { data: members, isLoading, isError, error } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      if (!user?.email) {
        console.log("No user email found");
        return [];
      }

      console.log("Fetching members for gym:", user.email);
      try {
        // Log supabase client state for debugging
        console.log("Supabase client state:", {
          url: supabase.getUrl(),
          authHeaders: session ? "Auth headers present" : "No auth headers",
          userSession: session ? "Session exists" : "No session"
        });
        
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
      } catch (fetchError) {
        console.error("Failed to fetch members:", fetchError);
        // Return empty array instead of throwing to prevent UI from breaking
        return [];
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Mutation for adding a new member with improved error handling
  const addMemberMutation = useMutation({
    mutationFn: async (newMemberName: string) => {
      if (!user?.email) {
        throw new Error("You must be logged in to add members");
      }

      console.log("Adding member with name:", newMemberName, "to gym:", user.email);
      console.log("Session state:", session ? "Valid session" : "No session");
      
      try {
        // Generate a random QR code for the member
        const baseUrl = window.location.origin;
        const tempId = Math.random().toString(36).substring(2, 15);
        const memberUrl = `${baseUrl}/members/${tempId}`;
        
        console.log("Generating QR code for URL:", memberUrl);
        const qrCodeDataUrl = await generateQRCode(memberUrl);
        
        const newMember = {
          first_name: newMemberName,
          last_name: '',
          email: '',
          gym_id: user.email,
          qr_code: qrCodeDataUrl || ''
        };
        
        console.log("Submitting new member to Supabase:", newMember);
        console.log("Supabase client config:", {
          url: supabase.getUrl(),
          headers: session ? "Auth headers present" : "No auth headers"
        });
        
        const { data, error, status, statusText } = await supabase
          .from('members')
          .insert([newMember])
          .select();

        if (error) {
          // Log detailed error information
          console.error("Error adding member:", {
            error,
            status,
            statusText,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          
          // Create detailed error message for debugging
          const errorMsg = `Error: ${error.message}\nStatus: ${status}\nCode: ${error.code}\nHint: ${error.hint || 'None'}\nDetails: ${error.details || 'None'}`;
          setErrorDetails(errorMsg);
          
          throw new Error(error.message);
        }
        
        console.log("Member added successfully:", data);
        return data;
      } catch (err: any) {
        // Capture network errors
        console.error("Exception in mutation:", err);
        const errorMsg = `Error: ${err.message}\n${err.stack ? `Stack: ${err.stack}` : ''}`;
        setErrorDetails(errorMsg);
        throw err;
      }
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
      
      // Show detailed error information
      setIsErrorDialogOpen(true);
      
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

  const closeErrorDialog = () => {
    setIsErrorDialogOpen(false);
    setErrorDetails(null);
  };

  // Display loading state
  if (isLoading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <span className="ml-3 text-gray-600">Loading members...</span>
    </div>
  );

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

      {isError && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-lg font-semibold text-red-700">Error loading members</h3>
          <p className="text-red-600">{error instanceof Error ? error.message : "Failed to load members data"}</p>
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['members'] })}
            className="mt-2"
          >
            Try again
          </Button>
        </div>
      )}

      {!isError && filteredMembers.length === 0 ? (
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
      
      <AlertDialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error Details</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[300px]">
                <pre className="whitespace-pre-wrap text-xs text-red-600">
                  {errorDetails || "Unknown error occurred"}
                </pre>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={closeErrorDialog}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MembersPage;
